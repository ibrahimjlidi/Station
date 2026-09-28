import { Router } from 'express';
import { db } from '../../lib/db.js';
import {
  authMiddleware,
  requireRole,
  type AuthRequest,
} from '../../middleware/auth.js';

import {
  caisseSchema,
  cuveSchema,
  equipeSchema,
  fermerSchema,
  inventaireCarburantSchema,
  jaugeageFilterSchema,
  jaugeageSchema,
  jaugeagesSchema,
  pompeSchema,
  releverSchema,
  retourSchema,
} from './schemas.js';

const router = Router();

router.use(authMiddleware);

/* ============================================================
   HELPERS
============================================================ */

const asNumber = (
  value: string | number | null | undefined,
): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
};

const toDate = (value: string) =>
  `${value} 00:00:00`;

const toDateEnd = (value: string) =>
  `${value} 23:59:59.999`;

const httpError = (
  message: string,
  statusCode: number,
) => {
  const error = new Error(message) as Error & {
    statusCode?: number;
  };

  error.statusCode = statusCode;

  return error;
};

/**
 * Retourne le magasin actif auquel l'utilisateur
 * a accès.
 */
async function activeMagasinId(
  request: AuthRequest,
): Promise<number> {
  const magasinId =
    request.user?.magasinId;

  let rows: any[];

  if (magasinId) {
    const [result] =
      await db.query<any[]>(
        `
          SELECT *
          FROM magasin
          WHERE id = ?
            AND active = 1
          LIMIT 1
        `,
        [magasinId],
      );

    rows = result;
  } else {
    const [result] =
      await db.query<any[]>(
        `
          SELECT *
          FROM magasin
          WHERE active = 1
          ORDER BY id ASC
          LIMIT 1
        `,
      );

    rows = result;
  }

  const magasin = rows[0];

  if (!magasin) {
    throw httpError(
      'Aucun magasin actif n’est configuré.',
      400,
    );
  }

  return Number(magasin.id);
}

/* ============================================================
   CUVES
============================================================ */

router.get(
  '/cuves',
  async (request, response, next) => {
    try {
      const magasinId =
        await activeMagasinId(
          request as AuthRequest,
        );

      const [rows] =
        await db.query<any[]>(
          `
            SELECT *
            FROM cuve
            WHERE magasinId = ?
            ORDER BY code ASC
          `,
          [magasinId],
        );

      response.json(
        rows.map((cuve) => ({
          ...cuve,
          volumeTotal:
            asNumber(cuve.volumeTotal),
          stockInitial:
            asNumber(cuve.stockInitial),
          stock:
            asNumber(cuve.stock),
          prixAchatHT:
            asNumber(cuve.prixAchatHT),
          seuilAlerte:
            asNumber(cuve.seuilAlerte),
        })),
      );
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   POMPES
============================================================ */

router.get(
  '/pompes',
  async (request, response, next) => {
    try {
      const magasinId =
        await activeMagasinId(
          request as AuthRequest,
        );

      const [rows] =
        await db.query<any[]>(
          `
            SELECT
              p.*,

              c.id AS cuve_id,
              c.code AS cuve_code,
              c.libelle AS cuve_libelle,
              c.carburant AS cuve_carburant,
              c.volumeTotal AS cuve_volumeTotal,
              c.stock AS cuve_stock,
              c.prixAchatHT AS cuve_prixAchatHT,
              c.stockInitial AS cuve_stockInitial,
              c.seuilAlerte AS cuve_seuilAlerte

            FROM pompe p

            LEFT JOIN cuve c
              ON c.id = p.cuveId

            WHERE p.magasinId = ?

            ORDER BY p.code ASC
          `,
          [magasinId],
        );

      response.json(
        rows.map((pompe) => ({
          id: pompe.id,
          code: pompe.code,
          libelle: pompe.libelle,
          cuveId: pompe.cuveId,
          magasinId: pompe.magasinId,
          active: pompe.active,
          prixVente:
            asNumber(pompe.prixVente),

          cuve: pompe.cuve_id
            ? {
                id: pompe.cuve_id,
                code: pompe.cuve_code,
                libelle:
                  pompe.cuve_libelle,
                carburant:
                  pompe.cuve_carburant,
                volumeTotal:
                  asNumber(
                    pompe.cuve_volumeTotal,
                  ),
                stock:
                  asNumber(
                    pompe.cuve_stock,
                  ),
                prixAchatHT:
                  asNumber(
                    pompe.cuve_prixAchatHT,
                  ),
                stockInitial:
                  asNumber(
                    pompe.cuve_stockInitial,
                  ),
                seuilAlerte:
                  asNumber(
                    pompe.cuve_seuilAlerte,
                  ),
              }
            : null,
        })),
      );
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   EQUIPES
============================================================ */

router.get(
  '/equipes',
  async (request, response, next) => {
    try {
      const magasinId =
        await activeMagasinId(
          request as AuthRequest,
        );

      const [rows] =
        await db.query<any[]>(
          `
            SELECT *
            FROM equipe
            WHERE magasinId = ?
              AND actif = 1
            ORDER BY code ASC
          `,
          [magasinId],
        );

      response.json(rows);
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   CAISSES
============================================================ */

router.get(
  '/caisses',
  async (request, response, next) => {
    try {
      const magasinId =
        await activeMagasinId(
          request as AuthRequest,
        );

      const [rows] =
        await db.query<any[]>(
          `
            SELECT *
            FROM caisse
            WHERE magasinId = ?
              AND actif = 1
            ORDER BY code ASC
          `,
          [magasinId],
        );

      response.json(rows);
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   CREER EQUIPE
============================================================ */

router.post(
  '/equipes',
  requireRole('gerant'),
  async (request, response, next) => {
    try {
      const input =
        equipeSchema.parse(
          request.body,
        );

      const magasinId =
        await activeMagasinId(
          request as AuthRequest,
        );

      const [result]: any =
        await db.query(
          `
            INSERT INTO equipe (
              code,
              libelle,
              actif,
              magasinId
            )
            VALUES (?, ?, ?, ?)
          `,
          [
            input.code,
            input.libelle,
            input.actif ?? true,
            magasinId,
          ],
        );

      const [rows] =
        await db.query<any[]>(
          `
            SELECT *
            FROM equipe
            WHERE id = ?
          `,
          [result.insertId],
        );

      response.status(201).json(rows[0]);
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   CREER CAISSE
============================================================ */

router.post(
  '/caisses',
  requireRole('gerant'),
  async (request, response, next) => {
    try {
      const input =
        caisseSchema.parse(
          request.body,
        );

      const magasinId =
        await activeMagasinId(
          request as AuthRequest,
        );

      const [result]: any =
        await db.query(
          `
            INSERT INTO caisse (
              code,
              libelle,
              actif,
              magasinId
            )
            VALUES (?, ?, ?, ?)
          `,
          [
            input.code,
            input.libelle,
            input.actif ?? true,
            magasinId,
          ],
        );

      const [rows] =
        await db.query<any[]>(
          `
            SELECT *
            FROM caisse
            WHERE id = ?
          `,
          [result.insertId],
        );

      response.status(201).json(rows[0]);
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   CREER CUVE
============================================================ */

router.post(
  '/cuves',
  requireRole('gerant'),
  async (request, response, next) => {
    try {
      const input =
        cuveSchema.parse(
          request.body,
        );

      const magasinId =
        await activeMagasinId(
          request as AuthRequest,
        );

      const [result]: any =
        await db.query(
          `
            INSERT INTO cuve (
              code,
              libelle,
              carburant,
              volumeTotal,
              stockInitial,
              stock,
              prixAchatHT,
              seuilAlerte,
              magasinId
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            input.code,
            input.libelle,
            input.carburant,
            input.volumeTotal,
            input.stockInitial,
            input.stockInitial,
            0,
            input.seuilAlerte,
            magasinId,
          ],
        );

      const [rows] =
        await db.query<any[]>(
          `
            SELECT *
            FROM cuve
            WHERE id = ?
          `,
          [result.insertId],
        );

      const cuve =
        rows[0];

      response.status(201).json({
        ...cuve,
        volumeTotal:
          asNumber(
            cuve.volumeTotal,
          ),
        stockInitial:
          asNumber(
            cuve.stockInitial,
          ),
        stock:
          asNumber(cuve.stock),
        prixAchatHT:
          asNumber(
            cuve.prixAchatHT,
          ),
        seuilAlerte:
          asNumber(
            cuve.seuilAlerte,
          ),
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   CREER POMPE
============================================================ */

router.post(
  '/pompes',
  requireRole('gerant'),
  async (request, response, next) => {
    try {
      const input =
        pompeSchema.parse(
          request.body,
        );

      const magasinId =
        await activeMagasinId(
          request as AuthRequest,
        );

      const [cuveRows] =
        await db.query<any[]>(
          `
            SELECT *
            FROM cuve
            WHERE id = ?
              AND magasinId = ?
          `,
          [
            input.cuveId,
            magasinId,
          ],
        );

      const cuve =
        cuveRows[0];

      if (!cuve) {
        response.status(400).json({
          message:
            'Cuve introuvable.',
        });
        return;
      }

      const [result]: any =
        await db.query(
          `
            INSERT INTO pompe (
              code,
              libelle,
              cuveId,
              prixVente,
              active,
              magasinId
            )
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            input.code,
            input.libelle,
            input.cuveId,
            input.prixVente,
            input.active ?? true,
            magasinId,
          ],
        );

      const [rows] =
        await db.query<any[]>(
          `
            SELECT
              p.*,

              c.id AS cuve_id,
              c.code AS cuve_code,
              c.libelle AS cuve_libelle,
              c.carburant AS cuve_carburant,
              c.volumeTotal AS cuve_volumeTotal,
              c.stock AS cuve_stock,
              c.prixAchatHT AS cuve_prixAchatHT

            FROM pompe p

            LEFT JOIN cuve c
              ON c.id = p.cuveId

            WHERE p.id = ?
          `,
          [result.insertId],
        );

      const pompe =
        rows[0];

      response.status(201).json({
        id: pompe.id,
        code: pompe.code,
        libelle: pompe.libelle,
        cuveId: pompe.cuveId,
        magasinId:
          pompe.magasinId,
        active: pompe.active,
        prixVente:
          asNumber(
            pompe.prixVente,
          ),

        cuve: {
          id: pompe.cuve_id,
          code: pompe.cuve_code,
          libelle:
            pompe.cuve_libelle,
          carburant:
            pompe.cuve_carburant,
          volumeTotal:
            asNumber(
              pompe.cuve_volumeTotal,
            ),
          stock:
            asNumber(
              pompe.cuve_stock,
            ),
          prixAchatHT:
            asNumber(
              pompe.cuve_prixAchatHT,
            ),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   VENDEURS
============================================================ */

router.get(
  '/vendeurs',
  async (request, response, next) => {
    try {
      const magasinId =
        await activeMagasinId(
          request as AuthRequest,
        );

      const [rows] =
        await db.query<any[]>(
          `
            SELECT *
            FROM vendeur
            WHERE magasinId = ?
              AND actif = 1
            ORDER BY nom ASC
          `,
          [magasinId],
        );

      response.json(rows);
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   RELEVES
============================================================ */

router.get(
  '/releves',
  async (_request, response, next) => {
    try {
      const [rows] =
        await db.query<any[]>(
          `
            SELECT
              r.*,

              p.id AS pompe_id,
              p.code AS pompe_code,
              p.libelle AS pompe_libelle,

              e.id AS equipe_id,
              e.code AS equipe_code,
              e.libelle AS equipe_libelle,

              c.id AS caisse_id,
              c.code AS caisse_code,
              c.libelle AS caisse_libelle,

              v.id AS vendeur_id,
              v.nom AS vendeur_nom

            FROM mobVCarCaisse r

            LEFT JOIN pompe p
              ON p.id = r.pompeId

            LEFT JOIN equipe e
              ON e.id = r.equipeId

            LEFT JOIN caisse c
              ON c.id = r.caisseId

            LEFT JOIN vendeur v
              ON v.id = r.vendeurId

            ORDER BY
              r.date DESC,
              r.createdAt DESC

            LIMIT 100
          `,
        );

      response.json(
        rows.map((releve) => {
          const ca =
            releve.indexFermeture ==
              null
              ? null
              :
                (
                  Number(
                    releve.indexFermeture,
                  ) -
                  Number(
                    releve.indexOuverture,
                  )
                ) *
                Number(
                  releve.prixVente,
                );

          return {
            ...releve,

            date: new Date(
              releve.date,
            )
              .toISOString()
              .slice(0, 10),

            indexOuverture:
              asNumber(
                releve.indexOuverture,
              ),

            indexFermeture:
              asNumber(
                releve.indexFermeture,
              ),

            prixVente:
              asNumber(
                releve.prixVente,
              ),

            ca,

            pompe: releve.pompe_id
              ? {
                  id:
                    releve.pompe_id,
                  code:
                    releve.pompe_code,
                  libelle:
                    releve.pompe_libelle,
                }
              : null,

            equipe:
              releve.equipe_id
                ? {
                    id:
                      releve.equipe_id,
                    code:
                      releve.equipe_code,
                    libelle:
                      releve.equipe_libelle,
                  }
                : null,

            caisse:
              releve.caisse_id
                ? {
                    id:
                      releve.caisse_id,
                    code:
                      releve.caisse_code,
                    libelle:
                      releve.caisse_libelle,
                  }
                : null,

            vendeur:
              releve.vendeur_id
                ? {
                    id:
                      releve.vendeur_id,
                    nom:
                      releve.vendeur_nom,
                  }
                : null,
          };
        }),
      );
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   RELEVER POMPE
============================================================ */

router.post(
  '/pompes/relever',
  requireRole(
    'gerant',
    'caissier',
  ),
  async (request, response, next) => {
    try {
      const input =
        releverSchema.parse(
          request.body,
        );

      const [pompeRows] =
        await db.query<any[]>(
          `
            SELECT *
            FROM pompe
            WHERE id = ?
            LIMIT 1
          `,
          [input.pompeId],
        );

      const pompe =
        pompeRows[0];

      if (
        !pompe ||
        !pompe.active
      ) {
        response.status(404).json({
          message:
            'Pompe introuvable ou inactive.',
        });
        return;
      }

      const date =
        toDate(input.date);

      const [existingRows] =
        await db.query<any[]>(
          `
            SELECT *
            FROM mobVCarCaisse
            WHERE date = ?
              AND equipeId = ?
              AND caisseId = ?
              AND pompeId = ?
            LIMIT 1
          `,
          [
            date,
            input.equipeId,
            input.caisseId,
            input.pompeId,
          ],
        );

      const existing =
        existingRows[0];

      if (existing) {
        response.status(409).json({
          message:
            'Un relevé existe déjà pour cette date, cette équipe, cette caisse et cette pompe.',
          id: existing.id,
        });
        return;
      }

      /*
       * Chercher le dernier index de fermeture.
       */
      const [previousRows] =
        await db.query<any[]>(
          `
            SELECT *
            FROM mobVCarCaisse
            WHERE pompeId = ?
              AND caisseId = ?
              AND date <= ?
              AND indexFermeture IS NOT NULL
            ORDER BY
              date DESC,
              createdAt DESC
            LIMIT 1
          `,
          [
            input.pompeId,
            input.caisseId,
            date,
          ],
        );

      const previous =
        previousRows[0];

      if (
        previous &&
        Number(
          input.indexOuverture,
        ) !==
          Number(
            previous.indexFermeture,
          )
      ) {
        response.status(409).json({
          message:
            `L'index d'ouverture doit reprendre la fermeture précédente (${previous.indexFermeture}).`,
          expected:
            asNumber(
              previous.indexFermeture,
            ),
        });

        return;
      }

      const [result]: any =
        await db.query(
          `
            INSERT INTO mobVCarCaisse (
              date,
              equipeId,
              caisseId,
              pompeId,
              vendeurId,
              indexOuverture,
              prixVente
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [
            date,
            input.equipeId,
            input.caisseId,
            input.pompeId,
            input.vendeurId ??
              null,
            input.indexOuverture,
            pompe.prixVente,
          ],
        );

      const [rows] =
        await db.query<any[]>(
          `
            SELECT *
            FROM mobVCarCaisse
            WHERE id = ?
          `,
          [result.insertId],
        );

      const releve =
        rows[0];

      response.status(201).json({
        ...releve,

        indexOuverture:
          asNumber(
            releve.indexOuverture,
          ),

        prixVente:
          asNumber(
            releve.prixVente,
          ),
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   FERMER RELEVE
============================================================ */

router.patch(
  '/pompes/relever/:id/fermer',
  requireRole(
    'gerant',
    'caissier',
  ),
  async (request, response, next) => {
    try {
      const id = Number(
        request.params.id,
      );

      const input =
        fermerSchema.parse(
          request.body,
        );

      const [rows] =
        await db.query<any[]>(
          `
            SELECT *
            FROM mobVCarCaisse
            WHERE id = ?
            LIMIT 1
          `,
          [id],
        );

      const releve =
        rows[0];

      if (!releve) {
        response.status(404).json({
          message:
            'Releve introuvable.',
        });
        return;
      }

      if (
        Number(
          input.indexFermeture,
        ) <
        Number(
          releve.indexOuverture,
        )
      ) {
        response.status(400).json({
          message:
            "L'index de fermeture doit etre superieur ou egal a l'ouverture.",
        });

        return;
      }

      await db.query(
        `
          UPDATE mobVCarCaisse
          SET indexFermeture = ?
          WHERE id = ?
        `,
        [
          input.indexFermeture,
          id,
        ],
      );

      const [updatedRows] =
        await db.query<any[]>(
          `
            SELECT *
            FROM mobVCarCaisse
            WHERE id = ?
          `,
          [id],
        );

      const updated =
        updatedRows[0];

      const ca =
        (
          Number(
            updated.indexFermeture,
          ) -
          Number(
            updated.indexOuverture,
          )
        ) *
        Number(
          updated.prixVente,
        );

      response.json({
        ...updated,

        indexOuverture:
          asNumber(
            updated.indexOuverture,
          ),

        indexFermeture:
          asNumber(
            updated.indexFermeture,
          ),

        prixVente:
          asNumber(
            updated.prixVente,
          ),

        ca,
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   STOCK CUVES
============================================================ */

router.get(
  '/cuves/stock',
  async (request, response, next) => {
    try {
      const magasinId =
        await activeMagasinId(
          request as AuthRequest,
        );

      const [rows] =
        await db.query<any[]>(
          `
            SELECT *
            FROM cuve
            WHERE magasinId = ?
            ORDER BY code ASC
          `,
          [magasinId],
        );

      response.json(
        rows.map((cuve) => {
          const stockActuel =
            Number(
              cuve.stock ?? 0,
            );

          const volumeTotal =
            Number(
              cuve.volumeTotal ?? 0,
            );

          return {
            id: cuve.id,
            code: cuve.code,
            libelle:
              cuve.libelle,
            carburant:
              cuve.carburant,

            volumeTotal,

            stockActuel,

            pourcentage:
              volumeTotal > 0
                ? Math.max(
                    0,
                    Math.min(
                      100,
                      (stockActuel /
                        volumeTotal) *
                        100,
                    ),
                  )
                : 0,
          };
        }),
      );
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   RETOURS CUVE
============================================================ */

router.post(
  '/retours',
  requireRole(
    'caissier',
    'gerant',
  ),
  async (request, response, next) => {
    const connection =
      await db.getConnection();

    try {
      const input =
        retourSchema.parse(
          request.body,
        );

      const magasinId =
        await activeMagasinId(
          request as AuthRequest,
        );

      const pumpIds =
        input.lignes.map(
          (line) =>
            line.pompeId,
        );

      if (
        new Set(pumpIds).size !==
        pumpIds.length
      ) {
        throw httpError(
          'Une pompe est présente plusieurs fois dans le retour.',
          400,
        );
      }

      /*
       * Charger les pompes et leurs cuves.
       */
      const placeholders =
        pumpIds
          .map(() => '?')
          .join(',');

      const [pumpRows] =
        await connection.query<any[]>(
          `
            SELECT
              p.*,

              c.id AS cuve_id,
              c.code AS cuve_code,
              c.libelle AS cuve_libelle,
              c.prixAchatHT AS cuve_prixAchatHT,
              c.stock AS cuve_stock

            FROM pompe p

            INNER JOIN cuve c
              ON c.id = p.cuveId

            WHERE p.id IN (${placeholders})
              AND p.magasinId = ?
          `,
          [
            ...pumpIds,
            magasinId,
          ],
        );

      const pumpMap =
        new Map(
          pumpRows.map(
            (pump) => [
              Number(pump.id),
              pump,
            ],
          ),
        );

      if (
        pumpMap.size !==
        new Set(pumpIds).size
      ) {
        response.status(400).json({
          message:
            'Une pompe est introuvable ou hors magasin.',
        });

        return;
      }

      const lines =
        input.lignes.map(
          (line) => {
            const pump =
              pumpMap.get(
                Number(
                  line.pompeId,
                ),
              )!;

            const volume =
              Number(
                line.volume,
              );

            const stock =
              Number(
                pump.cuve_stock,
              );

            if (volume > stock) {
              throw httpError(
                `Stock insuffisant pour la cuve ${pump.cuve_libelle}.`,
                400,
              );
            }

            const valeur =
              volume *
              Number(
                pump.cuve_prixAchatHT,
              );

            return {
              ...line,
              cuveId:
                pump.cuve_id,
              volume,
              valeur,
            };
          },
        );

      const totalVolume =
        lines.reduce(
          (
            total,
            line,
          ) =>
            total +
            line.volume,
          0,
        );

      const totalValeur =
        lines.reduce(
          (
            total,
            line,
          ) =>
            total +
            line.valeur,
          0,
        );

      await connection.beginTransaction();

      /*
       * Créer retour.
       */
      const [result]: any =
        await connection.query(
          `
            INSERT INTO retourCuve (
              date,
              equipeId,
              caisseId,
              vendeurId,
              magasinId,
              totalVolume,
              totalValeur
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [
            toDate(input.date),
            input.equipeId,
            input.caisseId,
            input.vendeurId,
            magasinId,
            totalVolume,
            totalValeur,
          ],
        );

      const retourId =
        result.insertId;

      /*
       * Créer détails + décrémenter stock.
       */
      for (const line of lines) {
        await connection.query(
          `
            INSERT INTO DetailRetour (
              retourCuveId,
              pompeId,
              cuveId,
              volume,
              valeur,
              tauxTVA
            )
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            retourId,
            line.pompeId,
            line.cuveId,
            line.volume,
            line.valeur,
            line.tauxTVA,
          ],
        );

        await connection.query(
          `
            UPDATE cuve
            SET stock =
              COALESCE(stock, 0) - ?
            WHERE id = ?
              AND stock >= ?
          `,
          [
            line.volume,
            line.cuveId,
            line.volume,
          ],
        );
      }

      const [updatedRows] =
        await connection.query<any[]>(
          `
            SELECT *
            FROM retourCuve
            WHERE id = ?
          `,
          [retourId],
        );

      const [detailRows] =
        await connection.query<any[]>(
          `
            SELECT *
            FROM DetailRetour
            WHERE retourCuveId = ?
          `,
          [retourId],
        );

      await connection.commit();

      response.status(201).json({
        ...updatedRows[0],

        totalVolume:
          asNumber(
            updatedRows[0]
              .totalVolume,
          ),

        totalValeur:
          asNumber(
            updatedRows[0]
              .totalValeur,
          ),

        details:
          detailRows.map(
            (line) => ({
              ...line,
              volume:
                asNumber(
                  line.volume,
                ),
              valeur:
                asNumber(
                  line.valeur,
                ),
              tauxTVA:
                asNumber(
                  line.tauxTVA,
                ),
            }),
          ),
      });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  },
);

/* ============================================================
   LISTE RETOURS
============================================================ */

router.get(
  '/retours',
  async (request, response, next) => {
    try {
      const magasinId =
        await activeMagasinId(
          request as AuthRequest,
        );

      const conditions: string[] = [
        'r.magasinId = ?',
      ];

      const params: any[] = [
        magasinId,
      ];

      if (
        typeof request.query
          .equipeId ===
        'string'
      ) {
        conditions.push(
          'r.equipeId = ?',
        );

        params.push(
          Number(
            request.query.equipeId,
          ),
        );
      }

      if (
        typeof request.query
          .dateFrom ===
        'string'
      ) {
        conditions.push(
          'r.date >= ?',
        );

        params.push(
          toDate(
            request.query.dateFrom,
          ),
        );
      }

      if (
        typeof request.query
          .dateTo ===
        'string'
      ) {
        conditions.push(
          'r.date <= ?',
        );

        params.push(
          toDateEnd(
            request.query.dateTo,
          ),
        );
      }

      const [rows] =
        await db.query<any[]>(
          `
            SELECT
              r.*,

              e.id AS equipe_id,
              e.code AS equipe_code,
              e.libelle AS equipe_libelle,

              c.id AS caisse_id,
              c.code AS caisse_code,
              c.libelle AS caisse_libelle,

              v.id AS vendeur_id,
              v.nom AS vendeur_nom

            FROM retourCuve r

            LEFT JOIN equipe e
              ON e.id = r.equipeId

            LEFT JOIN caisse c
              ON c.id = r.caisseId

            LEFT JOIN vendeur v
              ON v.id = r.vendeurId

            WHERE ${conditions.join(
              ' AND ',
            )}

            ORDER BY r.date DESC
          `,
          params,
        );

      response.json(
        rows.map((row) => ({
          ...row,

          totalVolume:
            asNumber(
              row.totalVolume,
            ),

          totalValeur:
            asNumber(
              row.totalValeur,
            ),

          equipe:
            row.equipe_id
              ? {
                  id:
                    row.equipe_id,
                  code:
                    row.equipe_code,
                  libelle:
                    row.equipe_libelle,
                }
              : null,

          caisse:
            row.caisse_id
              ? {
                  id:
                    row.caisse_id,
                  code:
                    row.caisse_code,
                  libelle:
                    row.caisse_libelle,
                }
              : null,

          vendeur:
            row.vendeur_id
              ? {
                  id:
                    row.vendeur_id,
                  nom:
                    row.vendeur_nom,
                }
              : null,
        })),
      );
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   RETOUR PAR ID
============================================================ */

router.get(
  '/retours/:id',
  async (request, response, next) => {
    try {
      const magasinId =
        await activeMagasinId(
          request as AuthRequest,
        );

      const id = Number(
        request.params.id,
      );

      const [rows] =
        await db.query<any[]>(
          `
            SELECT
              r.*,

              e.id AS equipe_id,
              e.code AS equipe_code,
              e.libelle AS equipe_libelle,

              c.id AS caisse_id,
              c.code AS caisse_code,
              c.libelle AS caisse_libelle,

              v.id AS vendeur_id,
              v.nom AS vendeur_nom

            FROM retourCuve r

            LEFT JOIN equipe e
              ON e.id = r.equipeId

            LEFT JOIN caisse c
              ON c.id = r.caisseId

            LEFT JOIN vendeur v
              ON v.id = r.vendeurId

            WHERE r.id = ?
              AND r.magasinId = ?
            LIMIT 1
          `,
          [
            id,
            magasinId,
          ],
        );

      const row =
        rows[0];

      if (!row) {
        response.status(404).json({
          message:
            'Retour cuve introuvable.',
        });

        return;
      }

      const [details] =
        await db.query<any[]>(
          `
            SELECT
              d.*,

              p.id AS pompe_id,
              p.code AS pompe_code,
              p.libelle AS pompe_libelle,

              c.id AS cuve_id,
              c.code AS cuve_code,
              c.libelle AS cuve_libelle

            FROM DetailRetour d

            LEFT JOIN pompe p
              ON p.id = d.pompeId

            LEFT JOIN cuve c
              ON c.id = d.cuveId

            WHERE d.retourCuveId = ?

            ORDER BY d.id ASC
          `,
          [id],
        );

      response.json({
        ...row,

        totalVolume:
          asNumber(
            row.totalVolume,
          ),

        totalValeur:
          asNumber(
            row.totalValeur,
          ),

        equipe:
          row.equipe_id
            ? {
                id:
                  row.equipe_id,
                code:
                  row.equipe_code,
                libelle:
                  row.equipe_libelle,
              }
            : null,

        caisse:
          row.caisse_id
            ? {
                id:
                  row.caisse_id,
                code:
                  row.caisse_code,
                libelle:
                  row.caisse_libelle,
              }
            : null,

        vendeur:
          row.vendeur_id
            ? {
                id:
                  row.vendeur_id,
                nom:
                  row.vendeur_nom,
              }
            : null,

        details:
          details.map(
            (line) => ({
              ...line,

              volume:
                asNumber(
                  line.volume,
                ),

              valeur:
                asNumber(
                  line.valeur,
                ),

              tauxTVA:
                asNumber(
                  line.tauxTVA,
                ),

              pompe:
                line.pompe_id
                  ? {
                      id:
                        line.pompe_id,
                      code:
                        line.pompe_code,
                      libelle:
                        line.pompe_libelle,
                    }
                  : null,

              cuve:
                line.cuve_id
                  ? {
                      id:
                        line.cuve_id,
                      code:
                        line.cuve_code,
                      libelle:
                        line.cuve_libelle,
                    }
                  : null,
            }),
          ),
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   VALIDER RETOUR
============================================================ */

router.patch(
  '/retours/:id/valider',
  requireRole('gerant'),
  async (request, response, next) => {
    try {
      const magasinId =
        await activeMagasinId(
          request as AuthRequest,
        );

      const id = Number(
        request.params.id,
      );

      const [result]: any =
        await db.query(
          `
            UPDATE retourCuve
            SET valide = 1
            WHERE id = ?
              AND magasinId = ?
          `,
          [
            id,
            magasinId,
          ],
        );

      if (
        result.affectedRows === 0
      ) {
        response.status(404).json({
          message:
            'Retour cuve introuvable.',
        });

        return;
      }

      response.json({
        valide: true,
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   INVENTAIRE CARBURANT
============================================================ */

router.post(
  '/inventaires',
  requireRole('gerant'),
  async (request, response, next) => {
    const connection =
      await db.getConnection();

    try {
      const input =
        inventaireCarburantSchema.parse(
          request.body,
        );

      const magasinId =
        await activeMagasinId(
          request as AuthRequest,
        );

      const cuveIds =
        input.lignes.map(
          (line) =>
            line.cuveId,
        );

      const placeholders =
        cuveIds
          .map(() => '?')
          .join(',');

      const [cuves] =
        await connection.query<any[]>(
          `
            SELECT *
            FROM cuve
            WHERE id IN (${placeholders})
              AND magasinId = ?
          `,
          [
            ...cuveIds,
            magasinId,
          ],
        );

      const cuveMap =
        new Map(
          cuves.map(
            (cuve) => [
              Number(cuve.id),
              cuve,
            ],
          ),
        );

      if (
        cuveMap.size !==
        new Set(cuveIds).size
      ) {
        response.status(400).json({
          message:
            'Une cuve est introuvable ou hors magasin.',
        });

        return;
      }

      const rows =
        input.lignes.map(
          (line) => {
            const cuve =
              cuveMap.get(
                Number(
                  line.cuveId,
                ),
              )!;

            const physical =
              Number(
                line.stockPhysique,
              );

            const stockComptable =
              Number(
                cuve.stock,
              );

            const prixUnitaire =
              Number(
                cuve.prixAchatHT,
              );

            return {
              cuveId:
                line.cuveId,

              stockPhysique:
                physical,

              stockComptable,

              prixUnitaire,

              valeur:
                physical *
                prixUnitaire,

              ecart:
                physical -
                stockComptable,
            };
          },
        );

      const valeurStock =
        rows.reduce(
          (
            total,
            line,
          ) =>
            total +
            line.valeur,
          0,
        );

      await connection.beginTransaction();

      const [result]: any =
        await connection.query(
          `
            INSERT INTO inventaireCarburant (
              date,
              operateur,
              valeurStock,
              magasinId
            )
            VALUES (?, ?, ?, ?)
          `,
          [
            toDate(input.date),
            input.operateur,
            valeurStock,
            magasinId,
          ],
        );

      const inventoryId =
        result.insertId;

      for (const line of rows) {
        await connection.query(
          `
            INSERT INTO detailInventaireCarburant (
              inventaireId,
              date,
              cuveId,
              stockPhysique,
              stockComptable,
              prixUnitaire,
              valeur,
              ecart
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            inventoryId,
            toDate(input.date),
            line.cuveId,
            line.stockPhysique,
            line.stockComptable,
            line.prixUnitaire,
            line.valeur,
            line.ecart,
          ],
        );
      }

      const [inventoryRows] =
        await connection.query<any[]>(
          `
            SELECT *
            FROM inventaireCarburant
            WHERE id = ?
          `,
          [inventoryId],
        );

      const [detailRows] =
        await connection.query<any[]>(
          `
            SELECT
              d.*,

              c.code AS cuve_code,
              c.libelle AS cuve_libelle,
              c.carburant AS cuve_carburant

            FROM detailInventaireCarburant d

            LEFT JOIN cuve c
              ON c.id = d.cuveId

            WHERE d.inventaireId = ?

            ORDER BY d.id ASC
          `,
          [inventoryId],
        );

      await connection.commit();

      response.status(201).json({
        ...inventoryRows[0],

        valeurStock:
          asNumber(
            inventoryRows[0]
              .valeurStock,
          ),

        lignes:
          detailRows.map(
            (line) => ({
              ...line,

              stockPhysique:
                asNumber(
                  line.stockPhysique,
                ),

              stockComptable:
                asNumber(
                  line.stockComptable,
                ),

              prixUnitaire:
                asNumber(
                  line.prixUnitaire,
                ),

              valeur:
                asNumber(
                  line.valeur,
                ),

              ecart:
                asNumber(
                  line.ecart,
                ),

              cuve: {
                id: line.cuveId,
                code:
                  line.cuve_code,
                libelle:
                  line.cuve_libelle,
                carburant:
                  line.cuve_carburant,
              },
            }),
          ),
      });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  },
);

/* ============================================================
   LISTE INVENTAIRES
============================================================ */

router.get(
  '/inventaires',
  async (request, response, next) => {
    try {
      const magasinId =
        await activeMagasinId(
          request as AuthRequest,
        );

      const [rows] =
        await db.query<any[]>(
          `
            SELECT *
            FROM inventaireCarburant
            WHERE magasinId = ?
            ORDER BY date DESC
          `,
          [magasinId],
        );

      response.json(
        rows.map((row) => ({
          ...row,
          valeurStock:
            asNumber(
              row.valeurStock,
            ),
        })),
      );
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   INVENTAIRE PAR ID
============================================================ */

router.get(
  '/inventaires/:id',
  async (request, response, next) => {
    try {
      const magasinId =
        await activeMagasinId(
          request as AuthRequest,
        );

      const id = Number(
        request.params.id,
      );

      const [rows] =
        await db.query<any[]>(
          `
            SELECT *
            FROM inventaireCarburant
            WHERE id = ?
              AND magasinId = ?
            LIMIT 1
          `,
          [
            id,
            magasinId,
          ],
        );

      const row =
        rows[0];

      if (!row) {
        response.status(404).json({
          message:
            'Inventaire carburant introuvable.',
        });

        return;
      }

      const [lines] =
        await db.query<any[]>(
          `
            SELECT
              d.*,

              c.code AS cuve_code,
              c.libelle AS cuve_libelle,
              c.carburant AS cuve_carburant

            FROM detailInventaireCarburant d

            LEFT JOIN cuve c
              ON c.id = d.cuveId

            WHERE d.inventaireId = ?

            ORDER BY d.id ASC
          `,
          [id],
        );

      response.json({
        ...row,

        valeurStock:
          asNumber(
            row.valeurStock,
          ),

        lignes:
          lines.map(
            (line) => ({
              ...line,

              stockPhysique:
                asNumber(
                  line.stockPhysique,
                ),

              stockComptable:
                asNumber(
                  line.stockComptable,
                ),

              prixUnitaire:
                asNumber(
                  line.prixUnitaire,
                ),

              valeur:
                asNumber(
                  line.valeur,
                ),

              ecart:
                asNumber(
                  line.ecart,
                ),

              cuve: {
                id: line.cuveId,
                code:
                  line.cuve_code,
                libelle:
                  line.cuve_libelle,
                carburant:
                  line.cuve_carburant,
              },
            }),
          ),
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   CLOTURER INVENTAIRE
============================================================ */

router.patch(
  '/inventaires/:id/cloturer',
  requireRole('gerant'),
  async (request, response, next) => {
    const connection =
      await db.getConnection();

    try {
      const magasinId =
        await activeMagasinId(
          request as AuthRequest,
        );

      const id = Number(
        request.params.id,
      );

      const [inventoryRows] =
        await connection.query<any[]>(
          `
            SELECT *
            FROM inventaireCarburant
            WHERE id = ?
              AND magasinId = ?
            LIMIT 1
          `,
          [
            id,
            magasinId,
          ],
        );

      const inventory =
        inventoryRows[0];

      if (!inventory) {
        response.status(404).json({
          message:
            'Inventaire carburant introuvable.',
        });

        return;
      }

      if (inventory.cloture) {
        response.status(409).json({
          message:
            'Inventaire deja cloture.',
        });

        return;
      }

      const [lines] =
        await connection.query<any[]>(
          `
            SELECT *
            FROM detailInventaireCarburant
            WHERE inventaireId = ?
          `,
          [id],
        );

      await connection.beginTransaction();

      for (const line of lines) {
        await connection.query(
          `
            UPDATE cuve
            SET stock = ?
            WHERE id = ?
              AND magasinId = ?
          `,
          [
            line.stockPhysique,
            line.cuveId,
            magasinId,
          ],
        );
      }

      await connection.query(
        `
          UPDATE inventaireCarburant
          SET cloture = 1
          WHERE id = ?
            AND magasinId = ?
        `,
        [
          id,
          magasinId,
        ],
      );

      await connection.commit();

      response.json({
        id,
        cloture: true,
      });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  },
);

/* ============================================================
   JAUGEAGE
============================================================ */

router.post(
  '/jaugeages',
  requireRole(
    'caissier',
    'gerant',
  ),
  async (request, response, next) => {
    try {
      const input =
        jaugeageSchema.parse(
          request.body,
        );

      const magasinId =
        await activeMagasinId(
          request as AuthRequest,
        );

      let equipeId =
        input.equipeId;

      let caisseId =
        input.caisseId;

      if (!equipeId) {
        const [rows] =
          await db.query<any[]>(
            `
              SELECT id
              FROM equipe
              WHERE magasinId = ?
                AND actif = 1
              ORDER BY id ASC
              LIMIT 1
            `,
            [magasinId],
          );

        equipeId =
          rows[0]?.id;
      }

      if (!caisseId) {
        const [rows] =
          await db.query<any[]>(
            `
              SELECT id
              FROM caisse
              WHERE magasinId = ?
                AND actif = 1
              ORDER BY id ASC
              LIMIT 1
            `,
            [magasinId],
          );

        caisseId =
          rows[0]?.id;
      }

      if (
        !equipeId ||
        !caisseId
      ) {
        response.status(400).json({
          message:
            'Une equipe et une caisse sont requises.',
        });

        return;
      }

      const [cuveRows] =
        await db.query<any[]>(
          `
            SELECT *
            FROM cuve
            WHERE id = ?
              AND magasinId = ?
            LIMIT 1
          `,
          [
            input.cuveId,
            magasinId,
          ],
        );

      const cuve =
        cuveRows[0];

      if (!cuve) {
        response.status(404).json({
          message:
            'Cuve introuvable.',
        });

        return;
      }

      const quantite =
        Number(input.quantite);

      const [result]: any =
        await db.query(
          `
            INSERT INTO jaugeage (
              date,
              cuveId,
              equipeId,
              caisseId,
              niveau,
              quantite
            )
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            toDate(input.date),
            input.cuveId,
            equipeId,
            caisseId,
            quantite,
            quantite,
          ],
        );

      const [rows] =
        await db.query<any[]>(
          `
            SELECT *
            FROM jaugeage
            WHERE id = ?
          `,
          [result.insertId],
        );

      const row =
        rows[0];

      response.status(201).json({
        ...row,

        niveau:
          asNumber(
            row.niveau,
          ),

        quantite:
          asNumber(
            row.quantite,
          ),

        ecart:
          quantite -
          Number(cuve.stock),
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   JAUGEAGES BATCH
============================================================ */

router.post(
  '/jaugeages/batch',
  requireRole(
    'caissier',
    'gerant',
  ),
  async (request, response, next) => {
    const connection =
      await db.getConnection();

    try {
      const input =
        jaugeagesSchema.parse(
          request.body,
        );

      const magasinId =
        await activeMagasinId(
          request as AuthRequest,
        );

      let equipeId =
        input.equipeId;

      let caisseId =
        input.caisseId;

      if (!equipeId) {
        const [rows] =
          await connection.query<any[]>(
            `
              SELECT id
              FROM equipe
              WHERE magasinId = ?
                AND actif = 1
              ORDER BY id ASC
              LIMIT 1
            `,
            [magasinId],
          );

        equipeId =
          rows[0]?.id;
      }

      if (!caisseId) {
        const [rows] =
          await connection.query<any[]>(
            `
              SELECT id
              FROM caisse
              WHERE magasinId = ?
                AND actif = 1
              ORDER BY id ASC
              LIMIT 1
            `,
            [magasinId],
          );

        caisseId =
          rows[0]?.id;
      }

      if (
        !equipeId ||
        !caisseId
      ) {
        response.status(400).json({
          message:
            'Une equipe et une caisse sont requises.',
        });

        return;
      }

      await connection.beginTransaction();

      const resultRows: any[] =
        [];

      for (const line of input.lignes) {
        const [cuveRows] =
          await connection.query<any[]>(
            `
              SELECT *
              FROM cuve
              WHERE id = ?
                AND magasinId = ?
              LIMIT 1
            `,
            [
              line.cuveId,
              magasinId,
            ],
          );

        const cuve =
          cuveRows[0];

        if (!cuve) {
          throw httpError(
            `Cuve ${line.cuveId} introuvable ou hors magasin.`,
            400,
          );
        }

        const quantite =
          Number(
            line.quantite,
          );

        const [insertResult]: any =
          await connection.query(
            `
              INSERT INTO jaugeage (
                date,
                cuveId,
                equipeId,
                caisseId,
                niveau,
                quantite
              )
              VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
              toDate(input.date),
              line.cuveId,
              equipeId,
              caisseId,
              quantite,
              quantite,
            ],
          );

        resultRows.push({
          id:
            insertResult.insertId,

          date:
            toDate(
              input.date,
            ),

          cuveId:
            line.cuveId,

          equipeId,

          caisseId,

          niveau:
            quantite,

          quantite,

          stock:
            Number(
              cuve.stock,
            ),

          ecart:
            quantite -
            Number(
              cuve.stock,
            ),
        });
      }

      await connection.commit();

      response
        .status(201)
        .json(resultRows);
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  },
);

/* ============================================================
   LISTE JAUGEAGES
============================================================ */

router.get(
  '/jaugeages',
  async (request, response, next) => {
    try {
      const filter =
        jaugeageFilterSchema.parse(
          request.query,
        );

      const magasinId =
        await activeMagasinId(
          request as AuthRequest,
        );

      const conditions: string[] = [
        'c.magasinId = ?',
      ];

      const params: any[] = [
        magasinId,
      ];

      if (
        filter.cuveId !==
        undefined
      ) {
        conditions.push(
          'j.cuveId = ?',
        );

        params.push(
          filter.cuveId,
        );
      }

      if (filter.date) {
        conditions.push(
          'j.date = ?',
        );

        params.push(
          toDate(
            filter.date,
          ),
        );
      } else {
        if (filter.dateFrom) {
          conditions.push(
            'j.date >= ?',
          );

          params.push(
            toDate(
              filter.dateFrom,
            ),
          );
        }

        if (filter.dateTo) {
          conditions.push(
            'j.date <= ?',
          );

          params.push(
            toDateEnd(
              filter.dateTo,
            ),
          );
        }
      }

      const [rows] =
        await db.query<any[]>(
          `
            SELECT
              j.*,

              c.id AS cuve_id,
              c.code AS cuve_code,
              c.libelle AS cuve_libelle,
              c.carburant AS cuve_carburant,
              c.stock AS cuve_stock

            FROM jaugeage j

            INNER JOIN cuve c
              ON c.id = j.cuveId

            WHERE ${conditions.join(
              ' AND ',
            )}

            ORDER BY j.date DESC
          `,
          params,
        );

      response.json(
        rows.map((row) => ({
          ...row,

          niveau:
            asNumber(
              row.niveau,
            ),

          quantite:
            asNumber(
              row.quantite,
            ),

          cuve: {
            id:
              row.cuve_id,

            code:
              row.cuve_code,

            libelle:
              row.cuve_libelle,

            carburant:
              row.cuve_carburant,

            stock:
              asNumber(
                row.cuve_stock,
              ),
          },
        })),
      );
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   ECARTS JAUGEAGES
============================================================ */

router.get(
  '/jaugeages/ecarts',
  async (request, response, next) => {
    try {
      const filter =
        jaugeageFilterSchema.parse(
          request.query,
        );

      if (!filter.date) {
        response.status(400).json({
          message:
            'La date est requise.',
        });

        return;
      }

      const magasinId =
        await activeMagasinId(
          request as AuthRequest,
        );

      const [rows] =
        await db.query<any[]>(
          `
            SELECT
              j.*,

              c.id AS cuve_id,
              c.libelle AS cuve_libelle,
              c.stock AS cuve_stock

            FROM jaugeage j

            INNER JOIN cuve c
              ON c.id = j.cuveId

            WHERE j.date = ?
              AND c.magasinId = ?
          `,
          [
            toDate(
              filter.date,
            ),
            magasinId,
          ],
        );

      response.json(
        rows.map((row) => {
          const stock =
            Number(
              row.cuve_stock,
            );

          const quantite =
            Number(
              row.quantite,
            );

          const ecart =
            quantite - stock;

          return {
            cuveId:
              row.cuve_id,

            cuve:
              row.cuve_libelle,

            stock,

            quantite,

            ecart,

            alerte:
              Math.abs(ecart) >
              100,
          };
        }),
      );
    } catch (error) {
      next(error);
    }
  },
);

export default router;