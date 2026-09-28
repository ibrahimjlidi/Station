import { Router } from 'express';
import type { ResultSetHeader } from 'mysql2';
import { db } from '../../lib/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import {
  bonLivraisonSchema,
  clientSchema,
  listFilterSchema,
  reglementSchema,
} from './clients.schema.js';

const router = Router();

const access = [requireAuth];
const commercialAccess = [
  requireAuth,
  requireRole('caissier', 'gerant'),
];

const toDate = (value: string) => `${value} 00:00:00`;

const numberValue = (
  value: string | number | null | undefined
): number | null => {
  if (value === null || value === undefined) return null;
  return Number(value);
};

const getQueryString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

/* ============================================================
   SOLDE CLIENT
   ============================================================ */

async function clientBalance(clientId: number) {
  const [clientRows] = await db.query(
    `
      SELECT soldeAnterieur
      FROM client
      WHERE id = ?
      LIMIT 1
    `,
    [clientId]
  );

  const client = (clientRows as any[])[0];

  if (!client) {
    return null;
  }

  const [creditRows] = await db.query(
    `
      SELECT COALESCE(SUM(montant), 0) AS total
      FROM detailCredit
      WHERE clientId = ?
    `,
    [clientId]
  );

  const [reglementRows] = await db.query(
    `
      SELECT COALESCE(SUM(montant), 0) AS total
      FROM detailReglements
      WHERE clientId = ?
        AND valide = 1
    `,
    [clientId]
  );

  const credits = Number(
    (creditRows as any[])[0]?.total ?? 0
  );

  const reglements = Number(
    (reglementRows as any[])[0]?.total ?? 0
  );

  return (
    Number(client.soldeAnterieur ?? 0) +
    credits -
    reglements
  );
}

/* ============================================================
   PRODUITS
   ============================================================ */

router.get(
  '/produits',
  ...access,
  async (_request, response, next) => {
    try {
      const [rows] = await db.query(`
        SELECT
          id,
          code,
          libelle,
          prixVenteHT,
          tva
        FROM produit
        WHERE actif = 1
        ORDER BY libelle ASC
      `);

      response.json(
        (rows as any[]).map((row) => ({
          ...row,
          prixVenteHT: numberValue(row.prixVenteHT),
          tva: numberValue(row.tva),
        }))
      );
    } catch (error) {
      next(error);
    }
  }
);

/* ============================================================
   CLIENTS
   ============================================================ */

router.get(
  '/clients',
  ...access,
  async (_request, response, next) => {
    try {
      const [rows] = await db.query(`
        SELECT *
        FROM client
        ORDER BY nomClient ASC
      `);

      const clients = rows as any[];

      const balances = await Promise.all(
        clients.map((client) => clientBalance(client.id))
      );

      response.json(
        clients.map((client, index) => ({
          ...client,
          quota: numberValue(client.quota),
          soldeAnterieur: numberValue(client.soldeAnterieur),
          tva: numberValue(client.tva),
          soldeActuel: balances[index],
        }))
      );
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/clients/:id',
  ...access,
  async (request, response, next) => {
    try {
      const clientId = Number(request.params.id);

      if (!Number.isInteger(clientId) || clientId <= 0) {
        response.status(400).json({
          message: 'Identifiant client invalide.',
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
        [clientId]
      );

      const client = (clientRows as any[])[0];

      if (!client) {
        response.status(404).json({
          message: 'Client introuvable.',
        });
        return;
      }

      /* ---------------- Bons de livraison ---------------- */

      const [bonRows] = await db.query(
        `
          SELECT *
          FROM bonliv
          WHERE clientId = ?
          ORDER BY date DESC
        `,
        [clientId]
      );

      const bons = bonRows as any[];

      for (const bon of bons) {
        const [lineRows] = await db.query(
          `
            SELECT
              l.*,
              p.id AS produit_id,
              p.code AS produit_code,
              p.libelle AS produit_libelle,
              p.prixVenteHT AS produit_prixVenteHT,
              p.tva AS produit_tva
            FROM Detbonliv l
            LEFT JOIN produit p
              ON p.id = l.idProduit
            WHERE l.bonlivId = ?
            ORDER BY l.numLigne ASC
          `,
          [bon.id]
        );

        bon.lignes = (lineRows as any[]).map((line) => ({
          ...line,
          produit: line.produit_id
            ? {
                id: line.produit_id,
                code: line.produit_code,
                libelle: line.produit_libelle,
                prixVenteHT: numberValue(
                  line.produit_prixVenteHT
                ),
                tva: numberValue(line.produit_tva),
              }
            : null,
          puHT: numberValue(line.puHT),
          tva: numberValue(line.tva),
          qte: numberValue(line.qte),
          remise: numberValue(line.remise),
          ttc: numberValue(line.ttc),
        }));

        bon.totalHT = numberValue(bon.totalHT);
        bon.totalTTC = numberValue(bon.totalTTC);
        bon.totTVA = numberValue(bon.totTVA);
      }

      /* ---------------- Factures ---------------- */

      const [factureRows] = await db.query(
        `
          SELECT *
          FROM facture
          WHERE clientId = ?
          ORDER BY date DESC
        `,
        [clientId]
      );

      const factures = factureRows as any[];

      for (const facture of factures) {
        const [lineRows] = await db.query(
          `
            SELECT
              l.*,
              p.id AS produit_id,
              p.code AS produit_code,
              p.libelle AS produit_libelle
            FROM Detfact l
            LEFT JOIN produit p
              ON p.id = l.idProduit
            WHERE l.factureId = ?
            ORDER BY l.numLigne ASC
          `,
          [facture.id]
        );

        facture.lignes = (lineRows as any[]).map((line) => ({
          ...line,
          produit: line.produit_id
            ? {
                id: line.produit_id,
                code: line.produit_code,
                libelle: line.produit_libelle,
              }
            : null,
          puHT: numberValue(line.puHT),
          qte: numberValue(line.qte),
          ttc: numberValue(line.ttc),
        }));

        facture.totalHT = numberValue(facture.totalHT);
        facture.totalTTC = numberValue(facture.totalTTC);
        facture.totTVA = numberValue(facture.totTVA);
        facture.mtTimbre = numberValue(facture.mtTimbre);
      }

      /* ---------------- Règlements ---------------- */

      const [reglementRows] = await db.query(
        `
          SELECT *
          FROM detailReglements
          WHERE clientId = ?
          ORDER BY date DESC
        `,
        [clientId]
      );

      const reglements = (reglementRows as any[]).map(
        (reglement) => ({
          ...reglement,
          montant: numberValue(reglement.montant),
        })
      );

      /* ---------------- Impayés ---------------- */

      const [impayeRows] = await db.query(
        `
          SELECT *
          FROM impayes
          WHERE clientId = ?
          ORDER BY echeance ASC
        `,
        [clientId]
      );

      const impayes = (impayeRows as any[]).map((impaye) => ({
        ...impaye,
        montantLigne: numberValue(impaye.montantLigne),
      }));

      response.json({
        ...client,
        quota: numberValue(client.quota),
        soldeAnterieur: numberValue(client.soldeAnterieur),
        tva: numberValue(client.tva),
        soldeActuel: await clientBalance(clientId),
        bonsLivraison: bons,
        factures,
        reglements,
        impayes,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/clients',
  ...access,
  requireRole('gerant'),
  async (request, response, next) => {
    try {
      const input = clientSchema.parse(request.body);

      const [result] = await db.execute<ResultSetHeader>(
        `
          INSERT INTO client (
            nomClient,
            quota,
            soldeAnterieur,
            tva
          )
          VALUES (?, ?, ?, ?)
        `,
        [
          input.nomClient,
          input.quota ?? 0,
          input.soldeAnterieur ?? 0,
          input.tva ?? 0,
        ]
      );

      const [rows] = await db.query(
        `
          SELECT *
          FROM client
          WHERE id = ?
          LIMIT 1
        `,
        [result.insertId]
      );

      const client = (rows as any[])[0];

      response.status(201).json({
        ...client,
        quota: numberValue(client.quota),
        soldeAnterieur: numberValue(client.soldeAnterieur),
        tva: numberValue(client.tva),
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/clients/:id',
  ...access,
  requireRole('gerant'),
  async (request, response, next) => {
    try {
      const id = Number(request.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        response.status(400).json({
          message: 'Identifiant client invalide.',
        });
        return;
      }

      const input = clientSchema.parse(request.body);

      const [result] = await db.execute<ResultSetHeader>(
        `
          UPDATE client
          SET
            nomClient = ?,
            quota = ?,
            soldeAnterieur = ?,
            tva = ?
          WHERE id = ?
        `,
        [
          input.nomClient,
          input.quota ?? 0,
          input.soldeAnterieur ?? 0,
          input.tva ?? 0,
          id,
        ]
      );

      if (result.affectedRows === 0) {
        response.status(404).json({
          message: 'Client introuvable.',
        });
        return;
      }

      const [rows] = await db.query(
        `
          SELECT *
          FROM client
          WHERE id = ?
          LIMIT 1
        `,
        [id]
      );

      const client = (rows as any[])[0];

      response.json({
        ...client,
        quota: numberValue(client.quota),
        soldeAnterieur: numberValue(client.soldeAnterieur),
        tva: numberValue(client.tva),
      });
    } catch (error) {
      next(error);
    }
  }
);

/* ============================================================
   BONS DE LIVRAISON
   ============================================================ */

router.post(
  '/bons-livraison',
  ...commercialAccess,
  async (request, response, next) => {
    try {
      const input = bonLivraisonSchema.parse(request.body);

      const [clientRows] = await db.query(
        `
          SELECT *
          FROM client
          WHERE id = ?
          LIMIT 1
        `,
        [input.clientId]
      );

      const client = (clientRows as any[])[0];

      if (!client) {
        response.status(404).json({
          message: 'Client introuvable.',
        });
        return;
      }

      const productIds = [
        ...new Set(
          input.lignes.map((line) => line.idProduit)
        ),
      ];

      const placeholders = productIds
        .map(() => '?')
        .join(', ');

      const [productRows] = await db.query(
        `
          SELECT *
          FROM produit
          WHERE id IN (${placeholders})
            AND actif = 1
        `,
        productIds
      );

      const products = productRows as any[];

      if (
        products.length !== productIds.length
      ) {
        response.status(400).json({
          message: 'Un produit est introuvable ou inactif.',
        });
        return;
      }

      const totals = input.lignes.reduce(
        (total, line) => {
          const tva = Number(line.tva);
          const ht = Math.max(
            0,
            Number(line.puHT) * Number(line.qte) -
              Number(line.remise)
          );

          total.ht += ht;
          total.tva += (ht * tva) / 100;
          total.ttc += ht * (1 + tva / 100);

          return total;
        },
        {
          ht: 0,
          tva: 0,
          ttc: 0,
        }
      );

      const currentBalance = await clientBalance(
        input.clientId
      );

      if (
        Number(client.quota) > 0 &&
        (currentBalance ?? 0) + totals.ttc >
          Number(client.quota)
      ) {
        response.status(409).json({
          message: 'Le quota client serait depasse.',
          quota: Number(client.quota),
          soldeActuel: currentBalance,
        });
        return;
      }

      const connection = await db.getConnection();

      try {
        await connection.beginTransaction();

        const [bonResult] =
          await connection.execute<ResultSetHeader>(
            `
              INSERT INTO bonliv (
                date,
                clientId,
                totalHT,
                totalTTC,
                totTVA
              )
              VALUES (?, ?, ?, ?, ?)
            `,
            [
              toDate(input.date),
              input.clientId,
              totals.ht,
              totals.ttc,
              totals.tva,
            ]
          );

        const bonId = bonResult.insertId;

        for (
          let index = 0;
          index < input.lignes.length;
          index++
        ) {
          const line = input.lignes[index];

          const ht = Math.max(
            0,
            Number(line.puHT) * Number(line.qte) -
              Number(line.remise)
          );

          const ttc =
            ht * (1 + Number(line.tva) / 100);

          await connection.execute(
            `
              INSERT INTO Detbonliv (
                bonlivId,
                numLigne,
                idProduit,
                puHT,
                tva,
                qte,
                remise,
                ttc,
                date
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              bonId,
              index + 1,
              line.idProduit,
              Number(line.puHT),
              Number(line.tva),
              Number(line.qte),
              Number(line.remise),
              ttc,
              toDate(input.date),
            ]
          );
        }

        await connection.commit();

        const [bonRows] = await db.query(
          `
            SELECT
              b.*,
              c.id AS client_id,
              c.nomClient AS client_nomClient
            FROM bonliv b
            LEFT JOIN client c
              ON c.id = b.clientId
            WHERE b.id = ?
            LIMIT 1
          `,
          [bonId]
        );

        const bon = (bonRows as any[])[0];

        const [lineRows] = await db.query(
          `
            SELECT *
            FROM Detbonliv
            WHERE bonlivId = ?
            ORDER BY numLigne ASC
          `,
          [bonId]
        );

        bon.client = {
          id: bon.client_id,
          nomClient: bon.client_nomClient,
        };

        bon.lignes = (lineRows as any[]).map(
          (line) => ({
            ...line,
            puHT: numberValue(line.puHT),
            tva: numberValue(line.tva),
            qte: numberValue(line.qte),
            remise: numberValue(line.remise),
            ttc: numberValue(line.ttc),
          })
        );

        response.status(201).json({
          ...bon,
          totalHT: numberValue(bon.totalHT),
          totalTTC: numberValue(bon.totalTTC),
          totTVA: numberValue(bon.totTVA),
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

router.get(
  '/bons-livraison',
  ...access,
  async (request, response, next) => {
    try {
      const filter = listFilterSchema.parse(
        request.query
      );

      let sql = `
        SELECT
          b.*,
          c.id AS client_id,
          c.nomClient AS client_nomClient
        FROM bonliv b
        LEFT JOIN client c
          ON c.id = b.clientId
        WHERE 1 = 1
      `;

      const params: unknown[] = [];

      if (filter.clientId) {
        sql += ` AND b.clientId = ?`;
        params.push(filter.clientId);
      }

      if (filter.dateFrom) {
        sql += ` AND b.date >= ?`;
        params.push(toDate(filter.dateFrom));
      }

      if (filter.dateTo) {
        sql += ` AND b.date <= ?`;
        params.push(`${filter.dateTo} 23:59:59`);
      }

      sql += ` ORDER BY b.date DESC`;

      const [rows] = await db.query(sql, params);

      response.json(
        (rows as any[]).map((bon) => ({
          ...bon,
          client: {
            id: bon.client_id,
            nomClient: bon.client_nomClient,
          },
          totalHT: numberValue(bon.totalHT),
          totalTTC: numberValue(bon.totalTTC),
          totTVA: numberValue(bon.totTVA),
        }))
      );
    } catch (error) {
      next(error);
    }
  }
);

/* ============================================================
   FACTURATION D'UN BON
   ============================================================ */

router.post(
  '/bons-livraison/:id/facturer',
  ...commercialAccess,
  async (request, response, next) => {
    try {
      const bonId = Number(request.params.id);

      const [bonRows] = await db.query(
        `
          SELECT *
          FROM bonliv
          WHERE id = ?
          LIMIT 1
        `,
        [bonId]
      );

      const bon = (bonRows as any[])[0];

      if (!bon) {
        response.status(404).json({
          message: 'Bon de livraison introuvable.',
        });
        return;
      }

      if (bon.numFact) {
        response.status(409).json({
          message: 'Ce bon est deja facture.',
          factureId: bon.numFact,
        });
        return;
      }

      const [lineRows] = await db.query(
        `
          SELECT *
          FROM Detbonliv
          WHERE bonlivId = ?
          ORDER BY numLigne ASC
        `,
        [bonId]
      );

      const lignes = lineRows as any[];

      const connection = await db.getConnection();

      try {
        await connection.beginTransaction();

        const [factureResult] =
          await connection.execute<ResultSetHeader>(
            `
              INSERT INTO facture (
                date,
                clientId,
                totalHT,
                totalTTC,
                totTVA,
                numBL
              )
              VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
              bon.date,
              bon.clientId,
              bon.totalHT,
              bon.totalTTC,
              bon.totTVA,
              bon.id,
            ]
          );

        const factureId = factureResult.insertId;

        for (const line of lignes) {
          await connection.execute(
            `
              INSERT INTO Detfact (
                factureId,
                numLigne,
                idProduit,
                puHT,
                qte,
                ttc,
                date
              )
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
              factureId,
              line.numLigne,
              line.idProduit,
              line.puHT,
              line.qte,
              line.ttc,
              line.date,
            ]
          );
        }

        await connection.execute(
          `
            UPDATE bonliv
            SET numFact = ?
            WHERE id = ?
          `,
          [factureId, bonId]
        );

        await connection.commit();

        const [factureRows] = await db.query(
          `
            SELECT *
            FROM facture
            WHERE id = ?
            LIMIT 1
          `,
          [factureId]
        );

        const facture = (factureRows as any[])[0];

        response.status(201).json({
          ...facture,
          totalHT: numberValue(facture.totalHT),
          totalTTC: numberValue(facture.totalTTC),
          totTVA: numberValue(facture.totTVA),
          mtTimbre: numberValue(facture.mtTimbre),
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
   FACTURES
   ============================================================ */

router.get(
  '/factures',
  ...access,
  async (request, response, next) => {
    try {
      const filter = listFilterSchema.parse(
        request.query
      );

      let sql = `
        SELECT
          f.*,
          c.id AS client_id,
          c.nomClient AS client_nomClient
        FROM facture f
        LEFT JOIN client c
          ON c.id = f.clientId
        WHERE 1 = 1
      `;

      const params: unknown[] = [];

      if (filter.clientId) {
        sql += ` AND f.clientId = ?`;
        params.push(filter.clientId);
      }

      if (filter.dateFrom) {
        sql += ` AND f.date >= ?`;
        params.push(toDate(filter.dateFrom));
      }

      if (filter.dateTo) {
        sql += ` AND f.date <= ?`;
        params.push(`${filter.dateTo} 23:59:59`);
      }

      sql += ` ORDER BY f.date DESC`;

      const [rows] = await db.query(sql, params);

      response.json(
        (rows as any[]).map((facture) => ({
          ...facture,
          client: {
            id: facture.client_id,
            nomClient: facture.client_nomClient,
          },
          totalHT: numberValue(facture.totalHT),
          totalTTC: numberValue(facture.totalTTC),
          totTVA: numberValue(facture.totTVA),
          mtTimbre: numberValue(facture.mtTimbre),
          statut: 'impayee',
        }))
      );
    } catch (error) {
      next(error);
    }
  }
);

/* ============================================================
   REGLEMENTS
   ============================================================ */

router.post(
  '/reglements',
  ...commercialAccess,
  async (request, response, next) => {
    try {
      const input = reglementSchema.parse(
        request.body
      );

      const connection = await db.getConnection();

      try {
        await connection.beginTransaction();

        const [reglementResult] =
          await connection.execute<ResultSetHeader>(
            `
              INSERT INTO detailReglements (
                clientId,
                equipeId,
                caisseId,
                date,
                montant,
                modePayment,
                echeance,
                impaye,
                valide
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              input.clientId,
              input.equipeId ?? null,
              input.caisseId ?? null,
              toDate(input.date),
              Number(input.montant),
              input.modePayment,
              input.echeance
                ? toDate(input.echeance)
                : null,
              input.impaye ? 1 : 0,
              input.valide ? 1 : 0,
            ]
          );

        const reglementId = reglementResult.insertId;

        if (input.impaye || input.echeance) {
          await connection.execute(
            `
              INSERT INTO impayes (
                numReg,
                clientId,
                dateReg,
                montantLigne,
                echeance,
                numCheque,
                numRib,
                nomBanque,
                impaye,
                valide
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              reglementId,
              input.clientId,
              toDate(input.date),
              Number(input.montant),
              input.echeance
                ? toDate(input.echeance)
                : null,
              input.numCheque ?? null,
              input.numRib ?? null,
              input.nomBanque ?? null,
              input.impaye ? 1 : 0,
              input.valide ? 1 : 0,
            ]
          );
        }

        await connection.commit();

        const [rows] = await db.query(
          `
            SELECT *
            FROM detailReglements
            WHERE id = ?
            LIMIT 1
          `,
          [reglementId]
        );

        const reglement = (rows as any[])[0];

        response.status(201).json({
          ...reglement,
          montant: numberValue(reglement.montant),
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
   IMPAYES
   ============================================================ */

router.get(
  '/impayes',
  ...access,
  async (request, response, next) => {
    try {
      const clientId = request.query.clientId
        ? Number(request.query.clientId)
        : undefined;

      let sql = `
        SELECT
          i.*,
          c.id AS client_id,
          c.nomClient AS client_nomClient
        FROM impayes i
        LEFT JOIN client c
          ON c.id = i.clientId
        WHERE i.impaye = 1
      `;

      const params: unknown[] = [];

      if (clientId !== undefined) {
        sql += ` AND i.clientId = ?`;
        params.push(clientId);
      }

      sql += ` ORDER BY i.echeance ASC`;

      const [rows] = await db.query(sql, params);

      const now = Date.now();

      response.json(
        (rows as any[]).map((item) => {
          const echeance = item.echeance
            ? new Date(item.echeance).getTime()
            : null;

          return {
            ...item,
            client: {
              id: item.client_id,
              nomClient: item.client_nomClient,
            },
            montantLigne: numberValue(
              item.montantLigne
            ),
            joursRetard:
              echeance !== null
                ? Math.max(
                    0,
                    Math.floor(
                      (now - echeance) / 86400000
                    )
                  )
                : 0,
          };
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

export default router;