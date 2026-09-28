import { Router } from 'express';
import { db } from '../../lib/db.js';
import {
  requireAuth,
  requireRole,
} from '../../middleware/auth.js';

import {
  clotureSchema,
  creditLineSchema,
  depenseLineSchema,
  recetteLineSchema,
  sessionSchema,
  summaryParamsSchema,
  type SessionInput,
} from './caisse.schema.js';

const router = Router();

const caisseAccess = [
  requireAuth,
  requireRole('caissier', 'gerant'),
];

const toDate = (value: string) => `${value} 00:00:00`;

const toNumber = (
  value: string | number | null | undefined,
): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
};

const errorWithStatus = (
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
 * Vérifie qu'une équipe n'est pas déjà clôturée pour une date.
 */
async function ensureOpen(
  date: string,
  equipeId: number,
) {
  const [rows] = await db.query<any[]>(
    `
      SELECT id, fait
      FROM joursClotures
      WHERE dateJour = ?
        AND equipeId = ?
      LIMIT 1
    `,
    [date, equipeId],
  );

  const closure = rows[0];

  if (closure?.fait) {
    throw errorWithStatus(
      'Cette equipe est deja cloturee pour cette date.',
      409,
    );
  }
}

/**
 * Vérifie équipe / caisse / vendeur.
 */
async function ensureSessionReferences(
  input: SessionInput,
) {
  const [equipeRows, caisseRows, vendeurRows] =
    await Promise.all([
      db.query<any[]>(
        `
          SELECT id, actif
          FROM equipe
          WHERE id = ?
          LIMIT 1
        `,
        [input.equipeId],
      ),

      db.query<any[]>(
        `
          SELECT id, actif
          FROM caisse
          WHERE id = ?
          LIMIT 1
        `,
        [input.caisseId],
      ),

      db.query<any[]>(
        `
          SELECT id, actif
          FROM vendeur
          WHERE id = ?
          LIMIT 1
        `,
        [input.vendeurId],
      ),
    ]);

  const equipe = equipeRows[0][0];
  const caisse = caisseRows[0][0];
  const vendeur = vendeurRows[0][0];

  if (
    !equipe ||
    !equipe.actif ||
    !caisse ||
    !caisse.actif ||
    !vendeur ||
    !vendeur.actif
  ) {
    throw errorWithStatus(
      'Equipe, caisse ou vendeur invalide/inactif.',
      400,
    );
  }
}

/**
 * Recherche une session recette.
 */
async function findRecetteSession(
  date: string,
  equipeId: number,
  caisseId: number,
) {
  const [rows] = await db.query<any[]>(
    `
      SELECT *
      FROM recetteCaisse
      WHERE date = ?
        AND equipeId = ?
        AND caisseId = ?
      LIMIT 1
    `,
    [date, equipeId, caisseId],
  );

  return rows[0] ?? null;
}

/**
 * Recherche une session dépenses.
 */
async function findDepenseSession(
  date: string,
  equipeId: number,
  caisseId: number,
) {
  const [rows] = await db.query<any[]>(
    `
      SELECT *
      FROM depensesCaisse
      WHERE date = ?
        AND equipeId = ?
        AND caisseId = ?
      LIMIT 1
    `,
    [date, equipeId, caisseId],
  );

  return rows[0] ?? null;
}

/**
 * Recherche une session crédits.
 */
async function findCreditSession(
  date: string,
  equipeId: number,
  caisseId: number,
) {
  const [rows] = await db.query<any[]>(
    `
      SELECT *
      FROM creditCaisse
      WHERE date = ?
        AND equipeId = ?
        AND caisseId = ?
      LIMIT 1
    `,
    [date, equipeId, caisseId],
  );

  return rows[0] ?? null;
}

/* ============================================================
   MODES DE PAIEMENT
============================================================ */

router.get(
  '/modes-payment',
  ...caisseAccess,
  async (_request, response, next) => {
    try {
      const [rows] = await db.query<any[]>(
        `
          SELECT *
          FROM modePayment
          ORDER BY libelle ASC
        `,
      );

      response.json(rows);
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   TYPES DEPENSES
============================================================ */

router.get(
  '/types-depenses',
  ...caisseAccess,
  async (_request, response, next) => {
    try {
      const [rows] = await db.query<any[]>(
        `
          SELECT *
          FROM depenses
          ORDER BY typeDepense ASC
        `,
      );

      response.json(rows);
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   CLIENTS
============================================================ */

router.get(
  '/clients',
  ...caisseAccess,
  async (_request, response, next) => {
    try {
      const [rows] = await db.query<any[]>(
        `
          SELECT *
          FROM client
          ORDER BY nomClient ASC
        `,
      );

      response.json(rows);
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   CREER / OUVRIR SESSION RECETTES
============================================================ */

router.post(
  '/recettes',
  ...caisseAccess,
  async (request, response, next) => {
    const connection = await db.getConnection();

    try {
      const input = sessionSchema.parse(request.body);

      const date = toDate(input.date);
      const magasinId = request.user?.magasinId ?? null;

      await ensureOpen(date, input.equipeId);
      await ensureSessionReferences(input);

      /*
       * Calcul de la réserve de départ.
       */
      const [cuves] = await connection.query<any[]>(
        `
          SELECT
            stock,
            prixAchatHT
          FROM cuve
          WHERE magasinId = ?
        `,
        [magasinId],
      );

      const reserveDepart = cuves.reduce(
        (
          total: number,
          cuve: any,
        ) =>
          total +
          Number(cuve.stock ?? 0) *
          Number(cuve.prixAchatHT ?? 0),
        0,
      );

      await connection.beginTransaction();

      /*
       * Vérifier si la session existe.
       */
      const [existingRows] = await connection.query<any[]>(
        `
          SELECT *
          FROM recetteCaisse
          WHERE date = ?
            AND equipeId = ?
            AND caisseId = ?
          LIMIT 1
        `,
        [
          date,
          input.equipeId,
          input.caisseId,
        ],
      );

      let session: any;

      if (existingRows.length > 0) {
        await connection.query(
          `
            UPDATE recetteCaisse
            SET vendeurId = ?
            WHERE id = ?
          `,
          [
            input.vendeurId,
            existingRows[0].id,
          ],
        );

        const [updatedRows] =
          await connection.query<any[]>(
            `
              SELECT *
              FROM recetteCaisse
              WHERE id = ?
            `,
            [existingRows[0].id],
          );

        session = updatedRows[0];
      } else {
        const [result]: any =
          await connection.query(
            `
              INSERT INTO recetteCaisse (
                date,
                equipeId,
                caisseId,
                vendeurId,
                magasinId,
                reserveDepart
              )
              VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
              date,
              input.equipeId,
              input.caisseId,
              input.vendeurId,
              magasinId,
              reserveDepart,
            ],
          );

        const [createdRows] =
          await connection.query<any[]>(
            `
              SELECT *
              FROM recetteCaisse
              WHERE id = ?
            `,
            [result.insertId],
          );

        session = createdRows[0];
      }

      await connection.commit();

      response.status(201).json({
        ...session,
        totalRecettes: toNumber(
          session.totalRecettes,
        ),
        reserveDepart: toNumber(
          session.reserveDepart,
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
   AJOUTER LIGNE RECETTE
============================================================ */

router.post(
  '/recettes/:id/lignes',
  ...caisseAccess,
  async (request, response, next) => {
    const connection = await db.getConnection();

    try {
      const recetteId = Number(
        request.params.id,
      );

      const input = recetteLineSchema.parse(
        request.body,
      );

      const [recetteRows] =
        await connection.query<any[]>(
          `
            SELECT *
            FROM recetteCaisse
            WHERE id = ?
            LIMIT 1
          `,
          [recetteId],
        );

      const recette = recetteRows[0];

      if (!recette) {
        response.status(404).json({
          message:
            'Session de recettes introuvable.',
        });
        return;
      }

      const date = new Date(recette.date)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ');

      await ensureOpen(
        date,
        Number(recette.equipeId),
      );

      if (recette.fait) {
        response.status(409).json({
          message:
            'La session de recettes est deja validee.',
        });
        return;
      }

      await connection.beginTransaction();

      const [result]: any =
        await connection.query(
          `
            INSERT INTO detailRecetteCaisse (
              numRecette,
              modePaymentId,
              montant,
              numero,
              idCuve
            )
            VALUES (?, ?, ?, ?, ?)
          `,
          [
            recetteId,
            input.modePaymentId,
            input.montant,
            input.numero ?? null,
            input.idCuve ?? null,
          ],
        );

      await connection.query(
        `
          UPDATE recetteCaisse
          SET totalRecettes =
            COALESCE(totalRecettes, 0) + ?
          WHERE id = ?
        `,
        [
          input.montant,
          recetteId,
        ],
      );

      const [lineRows] =
        await connection.query<any[]>(
          `
            SELECT *
            FROM detailRecetteCaisse
            WHERE id = ?
          `,
          [result.insertId],
        );

      await connection.commit();

      response.status(201).json({
        ...lineRows[0],
        montant: toNumber(
          lineRows[0].montant,
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
   CREER / OUVRIR SESSION DEPENSES
============================================================ */

router.post(
  '/depenses',
  ...caisseAccess,
  async (request, response, next) => {
    const connection = await db.getConnection();

    try {
      const input = sessionSchema.parse(
        request.body,
      );

      const date = toDate(input.date);
      const magasinId =
        request.user?.magasinId ?? null;

      await ensureOpen(
        date,
        input.equipeId,
      );

      await ensureSessionReferences(input);

      await connection.beginTransaction();

      const [existingRows] =
        await connection.query<any[]>(
          `
            SELECT *
            FROM depensesCaisse
            WHERE date = ?
              AND equipeId = ?
              AND caisseId = ?
            LIMIT 1
          `,
          [
            date,
            input.equipeId,
            input.caisseId,
          ],
        );

      let session: any;

      if (existingRows.length > 0) {
        await connection.query(
          `
            UPDATE depensesCaisse
            SET vendeurId = ?
            WHERE id = ?
          `,
          [
            input.vendeurId,
            existingRows[0].id,
          ],
        );

        const [rows] =
          await connection.query<any[]>(
            `
              SELECT *
              FROM depensesCaisse
              WHERE id = ?
            `,
            [existingRows[0].id],
          );

        session = rows[0];
      } else {
        const [result]: any =
          await connection.query(
            `
              INSERT INTO depensesCaisse (
                date,
                equipeId,
                caisseId,
                vendeurId,
                magasinId
              )
              VALUES (?, ?, ?, ?, ?)
            `,
            [
              date,
              input.equipeId,
              input.caisseId,
              input.vendeurId,
              magasinId,
            ],
          );

        const [rows] =
          await connection.query<any[]>(
            `
              SELECT *
              FROM depensesCaisse
              WHERE id = ?
            `,
            [result.insertId],
          );

        session = rows[0];
      }

      await connection.commit();

      response.status(201).json({
        ...session,
        totalDepenses: toNumber(
          session.totalDepenses,
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
   AJOUTER LIGNE DEPENSE
============================================================ */

router.post(
  '/depenses/:id/lignes',
  ...caisseAccess,
  async (request, response, next) => {
    const connection = await db.getConnection();

    try {
      const depenseId = Number(
        request.params.id,
      );

      const input =
        depenseLineSchema.parse(
          request.body,
        );

      const [rows] =
        await connection.query<any[]>(
          `
            SELECT *
            FROM depensesCaisse
            WHERE id = ?
            LIMIT 1
          `,
          [depenseId],
        );

      const depense = rows[0];

      if (!depense) {
        response.status(404).json({
          message:
            'Session de depenses introuvable.',
        });
        return;
      }

      const date = new Date(depense.date)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ');

      await ensureOpen(
        date,
        Number(depense.equipeId),
      );

      if (depense.fait) {
        response.status(409).json({
          message:
            'La session de depenses est deja validee.',
        });
        return;
      }

      await connection.beginTransaction();

      const [result]: any =
        await connection.query(
          `
            INSERT INTO detailDepenses (
              numDepense,
              codeDepense,
              montant,
              libelle
            )
            VALUES (?, ?, ?, ?)
          `,
          [
            depenseId,
            input.codeDepense,
            input.montant,
            input.libelle,
          ],
        );

      await connection.query(
        `
          UPDATE depensesCaisse
          SET totalDepenses =
            COALESCE(totalDepenses, 0) + ?
          WHERE id = ?
        `,
        [
          input.montant,
          depenseId,
        ],
      );

      const [lineRows] =
        await connection.query<any[]>(
          `
            SELECT *
            FROM detailDepenses
            WHERE id = ?
          `,
          [result.insertId],
        );

      await connection.commit();

      response.status(201).json({
        ...lineRows[0],
        montant: toNumber(
          lineRows[0].montant,
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
   CREER / OUVRIR SESSION CREDITS
============================================================ */

router.post(
  '/credits',
  ...caisseAccess,
  async (request, response, next) => {
    const connection = await db.getConnection();

    try {
      const input = sessionSchema.parse(
        request.body,
      );

      const date = toDate(input.date);
      const magasinId =
        request.user?.magasinId ?? null;

      await ensureOpen(
        date,
        input.equipeId,
      );

      await ensureSessionReferences(input);

      await connection.beginTransaction();

      const [existingRows] =
        await connection.query<any[]>(
          `
            SELECT *
            FROM creditCaisse
            WHERE date = ?
              AND equipeId = ?
              AND caisseId = ?
            LIMIT 1
          `,
          [
            date,
            input.equipeId,
            input.caisseId,
          ],
        );

      let session: any;

      if (existingRows.length > 0) {
        await connection.query(
          `
            UPDATE creditCaisse
            SET vendeurId = ?
            WHERE id = ?
          `,
          [
            input.vendeurId,
            existingRows[0].id,
          ],
        );

        const [rows] =
          await connection.query<any[]>(
            `
              SELECT *
              FROM creditCaisse
              WHERE id = ?
            `,
            [existingRows[0].id],
          );

        session = rows[0];
      } else {
        const [result]: any =
          await connection.query(
            `
              INSERT INTO creditCaisse (
                date,
                equipeId,
                caisseId,
                vendeurId,
                magasinId
              )
              VALUES (?, ?, ?, ?, ?)
            `,
            [
              date,
              input.equipeId,
              input.caisseId,
              input.vendeurId,
              magasinId,
            ],
          );

        const [rows] =
          await connection.query<any[]>(
            `
              SELECT *
              FROM creditCaisse
              WHERE id = ?
            `,
            [result.insertId],
          );

        session = rows[0];
      }

      await connection.commit();

      response.status(201).json({
        ...session,
        totalCredits: toNumber(
          session.totalCredits,
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
   AJOUTER LIGNE CREDIT
============================================================ */

router.post(
  '/credits/:id/lignes',
  ...caisseAccess,
  async (request, response, next) => {
    const connection = await db.getConnection();

    try {
      const creditId = Number(
        request.params.id,
      );

      const input =
        creditLineSchema.parse(
          request.body,
        );

      const [rows] =
        await connection.query<any[]>(
          `
            SELECT *
            FROM creditCaisse
            WHERE id = ?
            LIMIT 1
          `,
          [creditId],
        );

      const credit = rows[0];

      if (!credit) {
        response.status(404).json({
          message:
            'Session de credits introuvable.',
        });
        return;
      }

      const date = new Date(credit.date)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ');

      await ensureOpen(
        date,
        Number(credit.equipeId),
      );

      if (credit.fait) {
        response.status(409).json({
          message:
            'La session de credits est deja validee.',
        });
        return;
      }

      await connection.beginTransaction();

      const [result]: any =
        await connection.query(
          `
            INSERT INTO detailCredit (
              numCredit,
              clientId,
              montant,
              libelle,
              modePayment
            )
            VALUES (?, ?, ?, ?, ?)
          `,
          [
            creditId,
            input.clientId,
            input.montant,
            input.libelle,
            input.modePayment,
          ],
        );

      await connection.query(
        `
          UPDATE creditCaisse
          SET totalCredits =
            COALESCE(totalCredits, 0) + ?
          WHERE id = ?
        `,
        [
          input.montant,
          creditId,
        ],
      );

      const [lineRows] =
        await connection.query<any[]>(
          `
            SELECT *
            FROM detailCredit
            WHERE id = ?
          `,
          [result.insertId],
        );

      await connection.commit();

      response.status(201).json({
        ...lineRows[0],
        montant: toNumber(
          lineRows[0].montant,
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
   CLOTURE CAISSE
============================================================ */

router.post(
  '/cloturer',
  ...caisseAccess,
  async (request, response, next) => {
    const connection = await db.getConnection();

    try {
      const input = clotureSchema.parse(
        request.body,
      );

      const date = toDate(input.date);

      if (
        input.forcer &&
        request.user?.role !== 'gerant'
      ) {
        response.status(403).json({
          message:
            'Seul un gerant peut forcer une cloture avec ecart.',
        });
        return;
      }

      if (
        input.forcer &&
        !input.commentaire
      ) {
        response.status(400).json({
          message:
            'Un commentaire est obligatoire pour forcer la cloture.',
        });
        return;
      }

      await connection.beginTransaction();

      /*
       * Vérifier clôture existante.
       */
      const [closureRows] =
        await connection.query<any[]>(
          `
            SELECT *
            FROM joursClotures
            WHERE dateJour = ?
              AND equipeId = ?
            LIMIT 1
          `,
          [
            date,
            input.equipeId,
          ],
        );

      const closure =
        closureRows[0];

      if (closure?.fait) {
        throw errorWithStatus(
          'Cette equipe est deja cloturee pour cette date.',
          409,
        );
      }

      /*
       * Session recette.
       */
      const recette =
        await findRecetteSession(
          date,
          input.equipeId,
          input.caisseId,
        );

      if (!recette) {
        throw errorWithStatus(
          'Aucune session de recettes a cloturer pour cette caisse.',
          400,
        );
      }

      /*
       * Relevés des pompes.
       */
      const [releves] =
        await connection.query<any[]>(
          `
            SELECT *
            FROM mobVCarCaisse
            WHERE date = ?
              AND equipeId = ?
              AND caisseId = ?
          `,
          [
            date,
            input.equipeId,
            input.caisseId,
          ],
        );

      const incomplete =
        releves.find(
          (releve: any) =>
            releve.indexFermeture === null ||
            releve.indexFermeture === undefined,
        );

      if (incomplete) {
        throw errorWithStatus(
          'Toutes les pompes doivent avoir un index de fermeture avant la cloture.',
          400,
        );
      }

      /*
       * Dépenses.
       */
      const [depenseRows] =
        await connection.query<any[]>(
          `
            SELECT *
            FROM depensesCaisse
            WHERE date = ?
              AND equipeId = ?
              AND caisseId = ?
            LIMIT 1
          `,
          [
            date,
            input.equipeId,
            input.caisseId,
          ],
        );

      const depense =
        depenseRows[0] ?? null;

      /*
       * Retours cuve.
       */
      const [retourRows] =
        await connection.query<any[]>(
          `
            SELECT *
            FROM retourCuve
            WHERE date = ?
              AND equipeId = ?
              AND caisseId = ?
            LIMIT 1
          `,
          [
            date,
            input.equipeId,
            input.caisseId,
          ],
        );

      const retour =
        retourRows[0] ?? null;

      let retourValeur = 0;

      if (retour) {
        const [details] =
          await connection.query<any[]>(
            `
              SELECT valeur
              FROM DetailRetour
              WHERE retourCuveId = ?
                AND valide = 1
            `,
            [retour.id],
          );

        retourValeur =
          details.reduce(
            (
              total: number,
              detail: any,
            ) =>
              total +
              Number(detail.valeur ?? 0),
            0,
          );
      }

      /*
       * Recette théorique.
       */
      const recetteTheorique =
        releves.reduce(
          (
            total: number,
            releve: any,
          ) => {
            const indexFermeture =
              Number(
                releve.indexFermeture,
              );

            const indexOuverture =
              Number(
                releve.indexOuverture,
              );

            const prixVente =
              Number(
                releve.prixVente,
              );

            return (
              total +
              (indexFermeture -
                indexOuverture) *
                prixVente
            );
          },
          0,
        );

      const totalRecettes =
        Number(
          recette.totalRecettes ?? 0,
        );

      const totalDepenses =
        Number(
          depense?.totalDepenses ?? 0,
        );

      const reserveDepart =
        Number(
          recette.reserveDepart ?? 0,
        );

      const totalCaisse =
        totalRecettes -
        retourValeur;

      const reserveFinTheorique =
        reserveDepart -
        recetteTheorique -
        retourValeur;

      const ecartRecette =
        totalCaisse -
        recetteTheorique;

      const reserveFinAttendue =
        reserveDepart -
        recetteTheorique -
        retourValeur;

      const ecartCaisse =
        ecartRecette;

      const tolerance =
        Number(
          recette.seuilTolerance ?? 0,
        );

      if (
        Math.abs(ecartCaisse) >
          tolerance &&
        !input.forcer
      ) {
        throw errorWithStatus(
          `Cloture bloquee: ecart de ${ecartCaisse.toFixed(
            3,
          )} TND, tolerance ${tolerance.toFixed(
            3,
          )} TND.`,
          409,
        );
      }

      /*
       * Mise à jour recette.
       */
      await connection.query(
        `
          UPDATE recetteCaisse
          SET
            recetteTheorique = ?,
            ecartRecette = ?,
            reserveFinTheorique = ?,
            reserveFinAttendue = ?,
            ecartCaisse = ?,
            commentaireEcart = ?,
            validePar = ?,
            fait = 1
          WHERE id = ?
        `,
        [
          recetteTheorique,
          ecartRecette,
          reserveFinTheorique,
          reserveFinAttendue,
          ecartCaisse,
          input.commentaire ?? null,
          input.forcer
            ? request.user?.id ?? null
            : null,
          recette.id,
        ],
      );

      /*
       * Créer / mettre à jour clôture.
       */
      if (closure) {
        await connection.query(
          `
            UPDATE joursClotures
            SET fait = 1
            WHERE id = ?
          `,
          [closure.id],
        );
      } else {
        await connection.query(
          `
            INSERT INTO joursClotures (
              dateJour,
              equipeId,
              fait
            )
            VALUES (?, ?, 1)
          `,
          [
            date,
            input.equipeId,
          ],
        );
      }

      /*
       * Clôturer dépenses.
       */
      await connection.query(
        `
          UPDATE depensesCaisse
          SET fait = 1
          WHERE date = ?
            AND equipeId = ?
            AND caisseId = ?
        `,
        [
          date,
          input.equipeId,
          input.caisseId,
        ],
      );

      /*
       * Clôturer crédits.
       */
      await connection.query(
        `
          UPDATE creditCaisse
          SET fait = 1
          WHERE date = ?
            AND equipeId = ?
            AND caisseId = ?
        `,
        [
          date,
          input.equipeId,
          input.caisseId,
        ],
      );

      /*
       * Récupérer résultat final.
       */
      const [updatedRows] =
        await connection.query<any[]>(
          `
            SELECT *
            FROM recetteCaisse
            WHERE id = ?
          `,
          [recette.id],
        );

      await connection.commit();

      const result =
        updatedRows[0];

      response.json({
        ...result,
        date: new Date(result.date)
          .toISOString()
          .slice(0, 10),

        totalRecettes:
          toNumber(
            result.totalRecettes,
          ),

        recetteTheorique:
          toNumber(
            result.recetteTheorique,
          ),

        ecartRecette:
          toNumber(
            result.ecartRecette,
          ),

        reserveFinTheorique:
          toNumber(
            result.reserveFinTheorique,
          ),

        reserveFinAttendue:
          toNumber(
            result.reserveFinAttendue,
          ),

        ecartCaisse:
          toNumber(
            result.ecartCaisse,
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
   RESUME CAISSE
============================================================ */

router.get(
  '/resume/:date/:equipeId/:caisseId',
  ...caisseAccess,
  async (request, response, next) => {
    try {
      const params =
        summaryParamsSchema.parse(
          request.params,
        );

      const date = toDate(params.date);

      /*
       * Sessions.
       */
      const [
        recette,
        depense,
        credit,
        closure,
      ] = await Promise.all([
        findRecetteSession(
          date,
          params.equipeId,
          params.caisseId,
        ),

        findDepenseSession(
          date,
          params.equipeId,
          params.caisseId,
        ),

        findCreditSession(
          date,
          params.equipeId,
          params.caisseId,
        ),

        db.query<any[]>(
          `
            SELECT *
            FROM joursClotures
            WHERE dateJour = ?
              AND equipeId = ?
            LIMIT 1
          `,
          [date],
        ),
      ]);

      const closureRows =
        closure[0] as any[];

      const closureData =
        closureRows[0] ?? null;

      /*
       * Détails recettes.
       */
      let recettes: any[] = [];

      if (recette) {
        const [rows] =
          await db.query<any[]>(
            `
              SELECT
                dr.*,
                mp.id AS payment_id,
                mp.libelle AS payment_libelle,
                c.id AS cuve_id,
                c.libelle AS cuve_libelle
              FROM detailRecetteCaisse dr
              LEFT JOIN modePayment mp
                ON mp.id = dr.modePaymentId
              LEFT JOIN cuve c
                ON c.id = dr.idCuve
              WHERE dr.numRecette = ?
              ORDER BY dr.id ASC
            `,
            [recette.id],
          );

        recettes = rows.map(
          (line: any) => ({
            ...line,

            montant:
              toNumber(
                line.montant,
              ),

            modePayment:
              line.payment_id
                ? {
                    id:
                      line.payment_id,
                    libelle:
                      line.payment_libelle,
                  }
                : null,

            cuve:
              line.cuve_id
                ? {
                    id:
                      line.cuve_id,
                    libelle:
                      line.cuve_libelle,
                  }
                : null,
          }),
        );
      }

      /*
       * Détails dépenses.
       */
      let depenses: any[] = [];

      if (depense) {
        const [rows] =
          await db.query<any[]>(
            `
              SELECT
                dd.*,
                d.typeDepense
              FROM detailDepenses dd
              LEFT JOIN depenses d
                ON d.id = dd.codeDepense
              WHERE dd.numDepense = ?
              ORDER BY dd.id ASC
            `,
            [depense.id],
          );

        depenses = rows.map(
          (line: any) => ({
            ...line,

            montant:
              toNumber(
                line.montant,
              ),

            type:
              line.codeDepense
                ? {
                    id:
                      line.codeDepense,
                    typeDepense:
                      line.typeDepense,
                  }
                : null,
          }),
        );
      }

      /*
       * Détails crédits.
       */
      let credits: any[] = [];

      if (credit) {
        const [rows] =
          await db.query<any[]>(
            `
              SELECT
                dc.*,
                c.nomClient
              FROM detailCredit dc
              LEFT JOIN client c
                ON c.id = dc.clientId
              WHERE dc.numCredit = ?
              ORDER BY dc.id ASC
            `,
            [credit.id],
          );

        credits = rows.map(
          (line: any) => ({
            ...line,

            montant:
              toNumber(
                line.montant,
              ),

            client:
              line.clientId
                ? {
                    id:
                      line.clientId,
                    nomClient:
                      line.nomClient,
                  }
                : null,
          }),
        );
      }

      const totalRecettes =
        Number(
          recette?.totalRecettes ?? 0,
        );

      const totalDepenses =
        Number(
          depense?.totalDepenses ?? 0,
        );

      const totalCredits =
        Number(
          credit?.totalCredits ?? 0,
        );

      /*
       * Breakdown par mode de paiement.
       */
      const breakdownMap =
        new Map<
          number,
          {
            modePaymentId: number;
            libelle: string;
            montant: number;
          }
        >();

      for (const line of recettes) {
        if (!line.modePaymentId) {
          continue;
        }

        const current =
          breakdownMap.get(
            Number(
              line.modePaymentId,
            ),
          ) ?? {
            modePaymentId:
              Number(
                line.modePaymentId,
              ),

            libelle:
              line.modePayment
                ?.libelle ?? '',

            montant: 0,
          };

        current.montant +=
          Number(
            line.montant ?? 0,
          );

        breakdownMap.set(
          Number(
            line.modePaymentId,
          ),
          current,
        );
      }

      response.json({
        recetteId:
          recette?.id ?? null,

        depenseId:
          depense?.id ?? null,

        creditId:
          credit?.id ?? null,

        totalRecettes,

        totalDepenses,

        totalCredits,

        soldeNet:
          totalRecettes -
          totalDepenses -
          totalCredits,

        fait:
          Boolean(
            closureData?.fait,
          ),

        recettes,

        depenses,

        credits,

        breakdown:
          [...breakdownMap.values()],
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;