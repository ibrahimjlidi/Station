import { Router } from 'express';
import type { ResultSetHeader } from 'mysql2';
import { db } from '../../lib/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import {
  carWashSchema,
  entretienSchema,
  serviceSchema,
  vehiculeSchema,
} from './entretien.schema.js';

const router = Router();

const access = [requireAuth];
const write = [
  requireAuth,
  requireRole('caissier', 'gerant'),
];

const toDate = (value: string) => `${value} 00:00:00`;

const numberValue = (
  value: string | number | bigint | null | undefined
): number | null => {
  if (value === null || value === undefined) return null;
  return Number(value);
};

/* ============================================================
   ENTRETIENS
   ============================================================ */

router.get(
  '/entretiens',
  ...access,
  async (_request, response, next) => {
    try {
      const [rows] = await db.query(`
        SELECT
          e.*,
          c.id AS client_id,
          c.nomClient AS client_nomClient
        FROM entretien e
        LEFT JOIN client c
          ON c.id = e.clientId
        ORDER BY e.dateEnt DESC
      `);

      response.json(
        (rows as any[]).map((row) => ({
          ...row,
          totEntTTC: numberValue(row.totEntTTC),
          indexKm: numberValue(row.indexKm),
          prochainIndex: numberValue(row.prochainIndex),
          client: {
            id: row.client_id,
            nomClient: row.client_nomClient,
          },
        }))
      );
    } catch (error) {
      next(error);
    }
  }
);

/* ============================================================
   CREATION ENTRETIEN
   ============================================================ */

router.post(
  '/entretiens',
  ...write,
  async (request, response, next) => {
    try {
      const input = entretienSchema.parse(request.body);

      let vehicle: any = null;

      /* ---------------- Véhicule existant ---------------- */

      if (input.vehiculeId) {
        const [vehicleRows] = await db.query(
          `
            SELECT *
            FROM vehicule
            WHERE id = ?
              AND clientId = ?
            LIMIT 1
          `,
          [
            input.vehiculeId,
            input.clientId,
          ]
        );

        vehicle = (vehicleRows as any[])[0] ?? null;
      } else {
        /* ---------------- Recherche par matricule ---------------- */

        const [vehicleRows] = await db.query(
          `
            SELECT *
            FROM vehicule
            WHERE clientId = ?
              AND matricule = ?
            LIMIT 1
          `,
          [
            input.clientId,
            input.matricule,
          ]
        );

        vehicle = (vehicleRows as any[])[0] ?? null;

        /* ---------------- Création automatique ---------------- */

        if (!vehicle) {
          const [result] =
            await db.execute<ResultSetHeader>(
              `
                INSERT INTO vehicule (
                  clientId,
                  matricule
                )
                VALUES (?, ?)
              `,
              [
                input.clientId,
                input.matricule,
              ]
            );

          const [createdRows] = await db.query(
            `
              SELECT *
              FROM vehicule
              WHERE id = ?
              LIMIT 1
            `,
            [result.insertId]
          );

          vehicle = (createdRows as any[])[0];
        }
      }

      if (!vehicle) {
        response.status(400).json({
          message: 'Vehicule introuvable pour ce client.',
        });
        return;
      }

      /* ======================================================
         SERVICES
         ====================================================== */

      const serviceIds = [
        ...new Set(
          input.lignes
            .filter((line) => line.serviceId)
            .map((line) => line.serviceId)
        ),
      ];

      let catalog: any[] = [];

      if (serviceIds.length > 0) {
        const placeholders = serviceIds
          .map(() => '?')
          .join(', ');

        const [serviceRows] = await db.query(
          `
            SELECT *
            FROM service
            WHERE id IN (${placeholders})
              AND actif = 1
          `,
          serviceIds
        );

        catalog = serviceRows as any[];
      }

      const serviceMap = new Map(
        catalog.map((service) => [
          service.id,
          service,
        ])
      );

      /* ======================================================
         LIGNES + CALCUL TOTAL
         ====================================================== */

      const lines = input.lignes.map((line) => {
        const service = line.serviceId
          ? serviceMap.get(line.serviceId)
          : undefined;

        const prixHT = service
          ? Number(service.prixHT)
          : Number(line.prixHT ?? 0);

        const tauxTVA = service
          ? Number(service.tauxTVA)
          : Number(line.tauxTVA ?? 0);

        const prixTTC =
          prixHT * (1 + tauxTVA / 100);

        return {
          idService: line.idService ?? null,
          serviceId: line.serviceId ?? null,
          prixHT,
          tauxTVA,
          prixTTC,
        };
      });

      const total = lines.reduce(
        (sum, line) => sum + line.prixTTC,
        0
      );

      /* ======================================================
         TRANSACTION
         ====================================================== */

      const connection = await db.getConnection();

      try {
        await connection.beginTransaction();

        const [entretienResult] =
          await connection.execute<ResultSetHeader>(
            `
              INSERT INTO entretien (
                dateEnt,
                matricule,
                clientId,
                vehiculeId,
                indexKm,
                prochainIndex,
                totEntTTC
              )
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
              toDate(input.dateEnt),
              input.matricule,
              input.clientId,
              vehicle.id,
              Number(input.indexKm),
              Number(input.prochainIndex),
              total,
            ]
          );

        const entretienId =
          entretienResult.insertId;

        for (
          let index = 0;
          index < lines.length;
          index++
        ) {
          const line = lines[index];

          await connection.execute(
            `
              INSERT INTO Detentretien (
                entretienId,
                idService,
                serviceId,
                prixHT,
                prixTTC,
                numLigne
              )
              VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
              entretienId,
              line.idService,
              line.serviceId,
              line.prixHT,
              line.prixTTC,
              index + 1,
            ]
          );
        }

        await connection.commit();

        /* ---------------- Relecture ---------------- */

        const [rows] = await db.query(
          `
            SELECT
              e.*,
              c.id AS client_id,
              c.nomClient AS client_nomClient
            FROM entretien e
            LEFT JOIN client c
              ON c.id = e.clientId
            WHERE e.id = ?
            LIMIT 1
          `,
          [entretienId]
        );

        const row = (rows as any[])[0];

        const [detailRows] = await db.query(
          `
            SELECT
              d.*,
              s.id AS service_id,
              s.libelle AS service_libelle,
              s.prixHT AS service_prixHT,
              s.tauxTVA AS service_tauxTVA,
              s.prixTTC AS service_prixTTC
            FROM Detentretien d
            LEFT JOIN service s
              ON s.id = d.serviceId
            WHERE d.entretienId = ?
            ORDER BY d.numLigne ASC
          `,
          [entretienId]
        );

        row.client = {
          id: row.client_id,
          nomClient: row.client_nomClient,
        };

        row.details = (detailRows as any[]).map(
          (line) => ({
            ...line,
            prixHT: numberValue(line.prixHT),
            prixTTC: numberValue(line.prixTTC),
            service: line.service_id
              ? {
                  id: line.service_id,
                  libelle: line.service_libelle,
                  prixHT: numberValue(
                    line.service_prixHT
                  ),
                  tauxTVA: numberValue(
                    line.service_tauxTVA
                  ),
                  prixTTC: numberValue(
                    line.service_prixTTC
                  ),
                }
              : null,
          })
        );

        response.status(201).json({
          ...row,
          totEntTTC: numberValue(row.totEntTTC),
          indexKm: numberValue(row.indexKm),
          prochainIndex: numberValue(
            row.prochainIndex
          ),
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      next(error);
    }
  }
);

/* ============================================================
   DETAIL ENTRETIEN
   ============================================================ */

router.get(
  '/entretiens/:id',
  ...access,
  async (request, response, next) => {
    try {
      const id = Number(request.params.id);

      const [rows] = await db.query(
        `
          SELECT
            e.*,
            c.id AS client_id,
            c.nomClient AS client_nomClient
          FROM entretien e
          LEFT JOIN client c
            ON c.id = e.clientId
          WHERE e.id = ?
          LIMIT 1
        `,
        [id]
      );

      const row = (rows as any[])[0];

      if (!row) {
        response.status(404).json({
          message: 'Entretien introuvable.',
        });
        return;
      }

      const [detailRows] = await db.query(
        `
          SELECT
            d.*,
            s.id AS service_id,
            s.libelle AS service_libelle,
            s.prixHT AS service_prixHT,
            s.tauxTVA AS service_tauxTVA,
            s.prixTTC AS service_prixTTC
          FROM Detentretien d
          LEFT JOIN service s
            ON s.id = d.serviceId
          WHERE d.entretienId = ?
          ORDER BY d.numLigne ASC
        `,
        [id]
      );

      row.client = {
        id: row.client_id,
        nomClient: row.client_nomClient,
      };

      row.details = (detailRows as any[]).map(
        (line) => ({
          ...line,
          prixHT: numberValue(line.prixHT),
          prixTTC: numberValue(line.prixTTC),
          service: line.service_id
            ? {
                id: line.service_id,
                libelle: line.service_libelle,
                prixHT: numberValue(
                  line.service_prixHT
                ),
                tauxTVA: numberValue(
                  line.service_tauxTVA
                ),
                prixTTC: numberValue(
                  line.service_prixTTC
                ),
              }
            : null,
        })
      );

      response.json({
        ...row,
        totEntTTC: numberValue(row.totEntTTC),
        indexKm: numberValue(row.indexKm),
        prochainIndex: numberValue(row.prochainIndex),
      });
    } catch (error) {
      next(error);
    }
  }
);

/* ============================================================
   CARWASH
   ============================================================ */

router.get(
  '/carwash',
  ...access,
  async (_request, response, next) => {
    try {
      const [rows] = await db.query(`
        SELECT *
        FROM carWash
        ORDER BY date DESC
      `);

      response.json(
        (rows as any[]).map((row) => ({
          ...row,
          indexOuverture: numberValue(
            row.indexOuverture
          ),
          indexFermeture: numberValue(
            row.indexFermeture
          ),
          nombreLavage: numberValue(
            row.nombreLavage
          ),
        }))
      );
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/carwash',
  ...write,
  async (request, response, next) => {
    try {
      const input = carWashSchema.parse(
        request.body
      );

      if (
        Number(input.indexFermeture) <
        Number(input.indexOuverture)
      ) {
        response.status(400).json({
          message: 'Index fermeture invalide.',
        });
        return;
      }

      const nombreLavage =
        Number(input.indexFermeture) -
        Number(input.indexOuverture);

      const [existingRows] = await db.query(
        `
          SELECT *
          FROM carWash
          WHERE date = ?
          LIMIT 1
        `,
        [toDate(input.date)]
      );

      const existing = (existingRows as any[])[0];

      let id: number;

      if (existing) {
        await db.execute(
          `
            UPDATE carWash
            SET
              indexOuverture = ?,
              indexFermeture = ?,
              nombreLavage = ?
            WHERE id = ?
          `,
          [
            Number(input.indexOuverture),
            Number(input.indexFermeture),
            nombreLavage,
            existing.id,
          ]
        );

        id = existing.id;
      } else {
        const [result] =
          await db.execute<ResultSetHeader>(
            `
              INSERT INTO carWash (
                date,
                indexOuverture,
                indexFermeture,
                nombreLavage
              )
              VALUES (?, ?, ?, ?)
            `,
            [
              toDate(input.date),
              Number(input.indexOuverture),
              Number(input.indexFermeture),
              nombreLavage,
            ]
          );

        id = result.insertId;
      }

      const [rows] = await db.query(
        `
          SELECT *
          FROM carWash
          WHERE id = ?
          LIMIT 1
        `,
        [id]
      );

      const row = (rows as any[])[0];

      response.status(201).json({
        ...row,
        indexOuverture: numberValue(
          row.indexOuverture
        ),
        indexFermeture: numberValue(
          row.indexFermeture
        ),
        nombreLavage: numberValue(
          row.nombreLavage
        ),
      });
    } catch (error) {
      next(error);
    }
  }
);

/* ============================================================
   VEHICULES
   ============================================================ */

router.get(
  '/vehicules',
  ...access,
  async (request, response, next) => {
    try {
      const clientId = request.query.clientId
        ? Number(request.query.clientId)
        : undefined;

      let sql = `
        SELECT
          v.*,
          c.id AS client_id,
          c.nomClient AS client_nomClient
        FROM vehicule v
        LEFT JOIN client c
          ON c.id = v.clientId
        WHERE 1 = 1
      `;

      const params: unknown[] = [];

      if (clientId !== undefined) {
        sql += ` AND v.clientId = ?`;
        params.push(clientId);
      }

      sql += ` ORDER BY v.matricule ASC`;

      const [rows] = await db.query(sql, params);

      response.json(
        (rows as any[]).map((row) => ({
          ...row,
          indexKmActuel: numberValue(
            row.indexKmActuel
          ),
          client: {
            id: row.client_id,
            nomClient: row.client_nomClient,
          },
        }))
      );
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/vehicules',
  ...write,
  async (request, response, next) => {
    try {
      const input = vehiculeSchema.parse(
        request.body
      );

      const [result] =
        await db.execute<ResultSetHeader>(
          `
            INSERT INTO vehicule (
              clientId,
              matricule,
              indexKmActuel
            )
            VALUES (?, ?, ?)
          `,
          [
            input.clientId,
            input.matricule,
            input.indexKmActuel == null
              ? null
              : Number(input.indexKmActuel),
          ]
        );

      const [rows] = await db.query(
        `
          SELECT
            v.*,
            c.id AS client_id,
            c.nomClient AS client_nomClient
          FROM vehicule v
          LEFT JOIN client c
            ON c.id = v.clientId
          WHERE v.id = ?
          LIMIT 1
        `,
        [result.insertId]
      );

      const row = (rows as any[])[0];

      response.status(201).json({
        ...row,
        indexKmActuel: numberValue(
          row.indexKmActuel
        ),
        client: {
          id: row.client_id,
          nomClient: row.client_nomClient,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/vehicules/:id',
  ...write,
  async (request, response, next) => {
    try {
      const id = Number(request.params.id);

      const input = vehiculeSchema
        .partial()
        .parse(request.body);

      const [existingRows] = await db.query(
        `
          SELECT *
          FROM vehicule
          WHERE id = ?
          LIMIT 1
        `,
        [id]
      );

      const existing = (existingRows as any[])[0];

      if (!existing) {
        response.status(404).json({
          message: 'Vehicule introuvable.',
        });
        return;
      }

      const clientId =
        input.clientId ?? existing.clientId;

      const matricule =
        input.matricule ?? existing.matricule;

      const indexKmActuel =
        input.indexKmActuel !== undefined
          ? input.indexKmActuel
          : existing.indexKmActuel;

      await db.execute(
        `
          UPDATE vehicule
          SET
            clientId = ?,
            matricule = ?,
            indexKmActuel = ?
          WHERE id = ?
        `,
        [
          clientId,
          matricule,
          indexKmActuel == null
            ? null
            : Number(indexKmActuel),
          id,
        ]
      );

      const [rows] = await db.query(
        `
          SELECT
            v.*,
            c.id AS client_id,
            c.nomClient AS client_nomClient
          FROM vehicule v
          LEFT JOIN client c
            ON c.id = v.clientId
          WHERE v.id = ?
          LIMIT 1
        `,
        [id]
      );

      const row = (rows as any[])[0];

      response.json({
        ...row,
        indexKmActuel: numberValue(
          row.indexKmActuel
        ),
        client: {
          id: row.client_id,
          nomClient: row.client_nomClient,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/* ============================================================
   HISTORIQUE VEHICULE
   ============================================================ */

router.get(
  '/vehicules/:id/historique',
  ...access,
  async (request, response, next) => {
    try {
      const vehiculeId = Number(
        request.params.id
      );

      const [vehicleRows] = await db.query(
        `
          SELECT *
          FROM vehicule
          WHERE id = ?
          LIMIT 1
        `,
        [vehiculeId]
      );

      const vehicle = (vehicleRows as any[])[0];

      if (!vehicle) {
        response.status(404).json({
          message: 'Vehicule introuvable.',
        });
        return;
      }

      const [clientRows] = await db.query(
        `
          SELECT *
          FROM client
          WHERE id = ?
          LIMIT 1
        `,
        [vehicle.clientId]
      );

      const client = (clientRows as any[])[0];

      const [entretienRows] = await db.query(
        `
          SELECT *
          FROM entretien
          WHERE vehiculeId = ?
          ORDER BY dateEnt DESC
        `,
        [vehiculeId]
      );

      const entretiens =
        entretienRows as any[];

      for (const item of entretiens) {
        const [detailRows] = await db.query(
          `
            SELECT
              d.*,
              s.id AS service_id,
              s.libelle AS service_libelle,
              s.prixHT AS service_prixHT,
              s.tauxTVA AS service_tauxTVA,
              s.prixTTC AS service_prixTTC
            FROM Detentretien d
            LEFT JOIN service s
              ON s.id = d.serviceId
            WHERE d.entretienId = ?
            ORDER BY d.numLigne ASC
          `,
          [item.id]
        );

        item.details = (
          detailRows as any[]
        ).map((line) => ({
          ...line,
          prixHT: numberValue(line.prixHT),
          prixTTC: numberValue(line.prixTTC),
          service: line.service_id
            ? {
                id: line.service_id,
                libelle: line.service_libelle,
                prixHT: numberValue(
                  line.service_prixHT
                ),
                tauxTVA: numberValue(
                  line.service_tauxTVA
                ),
                prixTTC: numberValue(
                  line.service_prixTTC
                ),
              }
            : null,
        }));

        item.totEntTTC = numberValue(
          item.totEntTTC
        );
        item.indexKm = numberValue(
          item.indexKm
        );
        item.prochainIndex = numberValue(
          item.prochainIndex
        );
      }

      response.json({
        ...vehicle,
        indexKmActuel: numberValue(
          vehicle.indexKmActuel
        ),
        client: client
          ? {
              id: client.id,
              nomClient: client.nomClient,
            }
          : null,
        entretiens,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* ============================================================
   SERVICES
   ============================================================ */

router.get(
  '/services',
  ...access,
  async (_request, response, next) => {
    try {
      const [rows] = await db.query(`
        SELECT *
        FROM service
        WHERE actif = 1
        ORDER BY libelle ASC
      `);

      response.json(
        (rows as any[]).map((row) => ({
          ...row,
          prixHT: numberValue(row.prixHT),
          tauxTVA: numberValue(row.tauxTVA),
          prixTTC: numberValue(row.prixTTC),
        }))
      );
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/services',
  requireAuth,
  requireRole('gerant'),
  async (request, response, next) => {
    try {
      const input = serviceSchema.parse(
        request.body
      );

      const prixHT = Number(input.prixHT);
      const tauxTVA = Number(input.tauxTVA);

      const prixTTC =
        prixHT * (1 + tauxTVA / 100);

      const [result] =
        await db.execute<ResultSetHeader>(
          `
            INSERT INTO service (
              libelle,
              prixHT,
              tauxTVA,
              prixTTC,
              actif
            )
            VALUES (?, ?, ?, ?, ?)
          `,
          [
            input.libelle,
            prixHT,
            tauxTVA,
            prixTTC,
            input.actif ?? true,
          ]
        );

      const [rows] = await db.query(
        `
          SELECT *
          FROM service
          WHERE id = ?
          LIMIT 1
        `,
        [result.insertId]
      );

      const row = (rows as any[])[0];

      response.status(201).json({
        ...row,
        prixHT: numberValue(row.prixHT),
        tauxTVA: numberValue(row.tauxTVA),
        prixTTC: numberValue(row.prixTTC),
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/services/:id',
  requireAuth,
  requireRole('gerant'),
  async (request, response, next) => {
    try {
      const id = Number(request.params.id);

      const input = serviceSchema
        .partial()
        .parse(request.body);

      const [currentRows] = await db.query(
        `
          SELECT *
          FROM service
          WHERE id = ?
          LIMIT 1
        `,
        [id]
      );

      const current = (currentRows as any[])[0];

      if (!current) {
        response.status(404).json({
          message: 'Service introuvable.',
        });
        return;
      }

      const libelle =
        input.libelle ?? current.libelle;

      const actif =
        input.actif ?? current.actif;

      const prixHT =
        input.prixHT !== undefined
          ? Number(input.prixHT)
          : Number(current.prixHT);

      const tauxTVA =
        input.tauxTVA !== undefined
          ? Number(input.tauxTVA)
          : Number(current.tauxTVA);

      const prixTTC =
        prixHT * (1 + tauxTVA / 100);

      await db.execute(
        `
          UPDATE service
          SET
            libelle = ?,
            prixHT = ?,
            tauxTVA = ?,
            prixTTC = ?,
            actif = ?
          WHERE id = ?
        `,
        [
          libelle,
          prixHT,
          tauxTVA,
          prixTTC,
          actif ? 1 : 0,
          id,
        ]
      );

      const [rows] = await db.query(
        `
          SELECT *
          FROM service
          WHERE id = ?
          LIMIT 1
        `,
        [id]
      );

      const row = (rows as any[])[0];

      response.json({
        ...row,
        prixHT: numberValue(row.prixHT),
        tauxTVA: numberValue(row.tauxTVA),
        prixTTC: numberValue(row.prixTTC),
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/services/:id/toggle',
  requireAuth,
  requireRole('gerant'),
  async (request, response, next) => {
    try {
      const id = Number(request.params.id);

      const [currentRows] = await db.query(
        `
          SELECT *
          FROM service
          WHERE id = ?
          LIMIT 1
        `,
        [id]
      );

      const current = (currentRows as any[])[0];

      if (!current) {
        response.status(404).json({
          message: 'Service introuvable.',
        });
        return;
      }

      const newStatus = current.actif ? 0 : 1;

      await db.execute(
        `
          UPDATE service
          SET actif = ?
          WHERE id = ?
        `,
        [newStatus, id]
      );

      const [rows] = await db.query(
        `
          SELECT *
          FROM service
          WHERE id = ?
          LIMIT 1
        `,
        [id]
      );

      const row = (rows as any[])[0];

      response.json({
        ...row,
        prixHT: numberValue(row.prixHT),
        tauxTVA: numberValue(row.tauxTVA),
        prixTTC: numberValue(row.prixTTC),
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;