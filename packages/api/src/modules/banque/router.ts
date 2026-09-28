import { Router } from 'express';

import { db } from '../../lib/db.js';

import {
  requireAuth,
  requireRole,
  type AuthRequest,
} from '../../middleware/auth.js';

import {
  banqueSchema,
  configSchema,
  mouvementSchema,
  movementFilterSchema,
} from './banque.schema.js';

const router = Router();

const read = [requireAuth];

const write = [
  requireAuth,
  requireRole('caissier', 'gerant'),
];

const toDate = (value: string) =>
  new Date(`${value}T00:00:00.000Z`);

const numberValue = (
  value: number | string | null | undefined
) => {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
};

/**
 * ============================================================
 * GET /banques
 * ============================================================
 */
router.get(
  '/banques',
  ...read,
  async (_request, response, next) => {
    try {
      const [rows] = await db.query(`
        SELECT
          *
        FROM banque
        ORDER BY libelle ASC
      `);

      response.json(rows);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ============================================================
 * POST /banques
 * ============================================================
 */
router.post(
  '/banques',
  ...read,
  requireRole('gerant'),
  async (request, response, next) => {
    try {
      const input = banqueSchema.parse(
        request.body
      );

      const [result] = await db.query(
        `
        INSERT INTO banque
        SET ?
        `,
        input
      );

      const insertResult = result as any;

      const [rows] = await db.query(
        `
        SELECT *
        FROM banque
        WHERE id = ?
        LIMIT 1
        `,
        [insertResult.insertId]
      );

      const banques = rows as any[];

      response.status(201).json(
        banques[0]
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ============================================================
 * GET /banques/:id/mouvements
 * ============================================================
 */
router.get(
  '/banques/:id/mouvements',
  ...read,
  async (
    request: AuthRequest,
    response,
    next
  ) => {
    try {
      const banqueId = Number(
        request.params.id
      );

      const filter =
        movementFilterSchema.parse(
          request.query
        );

      const conditions: string[] = [
        'm.banqueId = ?',
      ];

      const params: any[] = [
        banqueId,
      ];

      /**
       * Limitation au magasin
       */
      if (
        request.user?.magasinId !== null &&
        request.user?.magasinId !== undefined
      ) {
        conditions.push(
          'm.magasinId = ?'
        );

        params.push(
          request.user.magasinId
        );
      }

      /**
       * Mode paiement
       */
      if (
        filter.modePaymentId !==
        undefined
      ) {
        conditions.push(
          'm.modePaymentId = ?'
        );

        params.push(
          filter.modePaymentId
        );
      }

      /**
       * Rapprochement
       */
      if (
        filter.rapproche !== undefined
      ) {
        conditions.push(
          'm.rapproche = ?'
        );

        params.push(
          filter.rapproche === 'true'
            ? 1
            : 0
        );
      }

      /**
       * Date début
       */
      if (filter.dateFrom) {
        conditions.push(
          'm.date >= ?'
        );

        params.push(
          toDate(filter.dateFrom)
        );
      }

      /**
       * Date fin
       *
       * On utilise < jour suivant pour
       * inclure toute la journée.
       */
      if (filter.dateTo) {
        const dateTo = new Date(
          `${filter.dateTo}T00:00:00.000Z`
        );

        dateTo.setUTCDate(
          dateTo.getUTCDate() + 1
        );

        conditions.push(
          'm.date < ?'
        );

        params.push(dateTo);
      }

      const sql = `
        SELECT
          m.*,

          b.id AS banque_id,
          b.libelle AS banque_libelle,

          mp.id AS modePayment_id,
          mp.libelle AS modePayment_libelle

        FROM detMvtBq m

        LEFT JOIN banque b
          ON b.id = m.banqueId

        LEFT JOIN modePayment mp
          ON mp.id = m.modePaymentId

        WHERE ${conditions.join(
          ' AND '
        )}

        ORDER BY m.date DESC
      `;

      const [rows] = await db.query(
        sql,
        params
      );

      const movements = (
        rows as any[]
      ).map((movement) => ({
        ...movement,

        banque: {
          id: movement.banque_id,
          libelle:
            movement.banque_libelle,
        },

        modePayment: {
          id:
            movement.modePayment_id,
          libelle:
            movement.modePayment_libelle,
        },

        montant: numberValue(
          movement.montant
        ),
      }));

      response.json(
        movements
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ============================================================
 * POST /banques/mouvements
 * ============================================================
 */
router.post(
  '/banques/mouvements',
  ...write,
  async (
    request: AuthRequest,
    response,
    next
  ) => {
    try {
      const input =
        mouvementSchema.parse(
          request.body
        );

      const magasinId =
        request.user?.magasinId ?? null;

      /**
       * Vérifier banque
       */
      const [banqueRows] =
        await db.query(
          `
          SELECT id
          FROM banque
          WHERE id = ?
          LIMIT 1
          `,
          [input.banqueId]
        );

      if (
        (banqueRows as any[]).length ===
        0
      ) {
        response.status(404).json({
          message:
            'Banque introuvable.',
        });

        return;
      }

      const [result] =
        await db.query(
          `
          INSERT INTO detMvtBq
          (
            magasinId,
            banqueId,
            modePaymentId,
            date,
            dateEcheance,
            montant,
            numMvtBq,
            numLigne,
            rapproche
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
          `,
          [
            magasinId,
            input.banqueId,
            input.modePaymentId,
            toDate(input.date),
            input.dateEcheance
              ? toDate(
                  input.dateEcheance
                )
              : null,
            input.montant,
            input.numMvtBq ??
              null,
            input.numLigne ??
              null,
          ]
        );

      const insertResult =
        result as any;

      const [rows] =
        await db.query(
          `
          SELECT *
          FROM detMvtBq
          WHERE id = ?
          LIMIT 1
          `,
          [
            insertResult.insertId,
          ]
        );

      const movements =
        rows as any[];

      if (movements.length === 0) {
        response.status(500).json({
          message:
            'Mouvement créé mais impossible de le récupérer.',
        });

        return;
      }

      const movement =
        movements[0];

      response.status(201).json({
        ...movement,

        montant: numberValue(
          movement.montant
        ),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ============================================================
 * PATCH /banques/mouvements/:id/rapprocher
 * ============================================================
 */
router.patch(
  '/banques/mouvements/:id/rapprocher',
  ...write,
  async (
    request: AuthRequest,
    response,
    next
  ) => {
    try {
      const id = Number(
        request.params.id
      );

      const conditions: string[] = [
        'id = ?',
      ];

      const params: any[] = [id];

      /**
       * Vérifier magasin
       */
      if (
        request.user?.magasinId !== null &&
        request.user?.magasinId !== undefined
      ) {
        conditions.push(
          'magasinId = ?'
        );

        params.push(
          request.user.magasinId
        );
      }

      const [rows] =
        await db.query(
          `
          SELECT *
          FROM detMvtBq
          WHERE ${conditions.join(
            ' AND '
          )}
          LIMIT 1
          `,
          params
        );

      const movements =
        rows as any[];

      if (movements.length === 0) {
        response.status(404).json({
          message:
            'Mouvement introuvable.',
        });

        return;
      }

      await db.query(
        `
        UPDATE detMvtBq
        SET rapproche = 1
        WHERE id = ?
        `,
        [id]
      );

      const [updatedRows] =
        await db.query(
          `
          SELECT *
          FROM detMvtBq
          WHERE id = ?
          LIMIT 1
          `,
          [id]
        );

      const updated =
        (updatedRows as any[])[0];

      response.json({
        ...updated,

        montant: numberValue(
          updated.montant
        ),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ============================================================
 * GET /banques/position/:banqueId
 * ============================================================
 */
router.get(
  '/banques/position/:banqueId',
  ...read,
  async (
    request: AuthRequest,
    response,
    next
  ) => {
    try {
      const banqueId = Number(
        request.params.banqueId
      );

      const magasinCondition =
        request.user?.magasinId !==
          null &&
        request.user?.magasinId !==
          undefined
          ? ' AND magasinId = ? '
          : '';

      const magasinParams =
        request.user?.magasinId !==
          null &&
        request.user?.magasinId !==
          undefined
          ? [request.user.magasinId]
          : [];

      /**
       * Solde total
       */
      const [allRows] =
        await db.query(
          `
          SELECT
            COALESCE(
              SUM(montant),
              0
            ) AS total
          FROM detMvtBq
          WHERE banqueId = ?
          ${magasinCondition}
          `,
          [
            banqueId,
            ...magasinParams,
          ]
        );

      /**
       * Solde rapproché
       */
      const [reconciledRows] =
        await db.query(
          `
          SELECT
            COALESCE(
              SUM(montant),
              0
            ) AS total
          FROM detMvtBq
          WHERE banqueId = ?
          AND rapproche = 1
          ${magasinCondition}
          `,
          [
            banqueId,
            ...magasinParams,
          ]
        );

      /**
       * Mouvements en attente
       */
      const [pendingRows] =
        await db.query(
          `
          SELECT COUNT(*) AS total
          FROM detMvtBq
          WHERE banqueId = ?
          AND rapproche = 0
          ${magasinCondition}
          `,
          [
            banqueId,
            ...magasinParams,
          ]
        );

      /**
       * Mouvements pour calcul commission
       */
      const [movementRows] =
        await db.query(
          `
          SELECT
            montant,
            modePaymentId
          FROM detMvtBq
          WHERE banqueId = ?
          ${magasinCondition}
          `,
          [
            banqueId,
            ...magasinParams,
          ]
        );

      /**
       * Configurations commission
       */
      const [configRows] =
        await db.query(
          `
          SELECT
            banqueId,
            modePaymentId,
            tauxCommission,
            tvaCom
          FROM ageoCompteMode
          WHERE banqueId = ?
          `,
          [banqueId]
        );

      /**
       * Création map des taux
       */
      const rates = new Map<
        number,
        number
      >();

      for (const config of
        configRows as any[]) {
        const taux =
          Number(
            config.tauxCommission
          );

        const tva =
          Number(
            config.tvaCom
          );

        const rate =
          (taux * (1 + tva / 100)) /
          100;

        rates.set(
          Number(
            config.modePaymentId
          ),
          rate
        );
      }

      /**
       * Calcul commission estimée
       */
      let commissionEstimee = 0;

      for (const movement of
        movementRows as any[]) {
        const montant =
          Number(
            movement.montant
          );

        const rate =
          rates.get(
            Number(
              movement.modePaymentId
            )
          ) ?? 0;

        commissionEstimee +=
          montant * rate;
      }

      const all =
        (allRows as any[])[0];

      const reconciled =
        (reconciledRows as any[])[0];

      const pending =
        (pendingRows as any[])[0];

      response.json({
        banqueId,

        soldeTotal: Number(
          all.total ?? 0
        ),

        soldeRapproche: Number(
          reconciled.total ?? 0
        ),

        mouvementsEnAttente:
          Number(
            pending.total ?? 0
          ),

        commissionEstimee,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ============================================================
 * GET /banques/config
 * ============================================================
 */
router.get(
  '/banques/config',
  ...read,
  async (_request, response, next) => {
    try {
      const [rows] =
        await db.query(`
          SELECT

            acm.*,

            b.id AS banque_id,
            b.libelle AS banque_libelle,

            mp.id AS modePayment_id,
            mp.libelle AS modePayment_libelle

          FROM ageoCompteMode acm

          LEFT JOIN banque b
            ON b.id = acm.banqueId

          LEFT JOIN modePayment mp
            ON mp.id = acm.modePaymentId

          ORDER BY
            acm.banqueId ASC,
            acm.modePaymentId ASC
        `);

      const configs =
        (rows as any[]).map(
          (config) => ({
            ...config,

            banque: {
              id: config.banque_id,
              libelle:
                config.banque_libelle,
            },

            modePayment: {
              id:
                config.modePayment_id,
              libelle:
                config.modePayment_libelle,
            },
          })
        );

      response.json(
        configs
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ============================================================
 * POST /banques/config
 * ============================================================
 */
router.post(
  '/banques/config',
  ...write,
  async (
    request: AuthRequest,
    response,
    next
  ) => {
    try {
      const input =
        configSchema.parse(
          request.body
        );

      /**
       * Vérifier si la configuration
       * existe déjà.
       */
      const [existingRows] =
        await db.query(
          `
          SELECT id
          FROM ageoCompteMode
          WHERE banqueId = ?
          AND modePaymentId = ?
          LIMIT 1
          `,
          [
            input.banqueId,
            input.modePaymentId,
          ]
        );

      const existing =
        existingRows as any[];

      if (existing.length > 0) {
        /**
         * UPDATE
         */
        await db.query(
          `
          UPDATE ageoCompteMode
          SET
            tauxCommission = ?,
            nbrJoursCompensation = ?,
            tvaCom = ?
          WHERE banqueId = ?
          AND modePaymentId = ?
          `,
          [
            input.tauxCommission,
            input.nbrJoursCompensation,
            input.tvaCom,
            input.banqueId,
            input.modePaymentId,
          ]
        );
      } else {
        /**
         * INSERT
         */
        await db.query(
          `
          INSERT INTO ageoCompteMode
          (
            banqueId,
            modePaymentId,
            tauxCommission,
            nbrJoursCompensation,
            tvaCom
          )
          VALUES (?, ?, ?, ?, ?)
          `,
          [
            input.banqueId,
            input.modePaymentId,
            input.tauxCommission,
            input.nbrJoursCompensation,
            input.tvaCom,
          ]
        );
      }

      /**
       * Récupérer la configuration
       */
      const [rows] =
        await db.query(
          `
          SELECT *
          FROM ageoCompteMode
          WHERE banqueId = ?
          AND modePaymentId = ?
          LIMIT 1
          `,
          [
            input.banqueId,
            input.modePaymentId,
          ]
        );

      const config =
        (rows as any[])[0];

      response.json(config);
    } catch (error) {
      next(error);
    }
  }
);

export default router;