import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../lib/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import {
  avoirSchema,
  fournisseurSchema,
  imputationSchema,
  listFilterSchema,
  reglementFournisseurSchema,
  retenueSourceSchema,
} from './fournisseurs.schema.js';

const router = Router();

const readAccess = [requireAuth];
const managerAccess = [requireAuth, requireRole('gerant')];
const paymentAccess = [requireAuth, requireRole('caissier', 'gerant')];

const toDate = (value: string) => `${value} 00:00:00`;

const numberValue = (
  value: string | number | bigint | null | undefined,
): number | null => {
  if (value == null) return null;
  return Number(value);
};

interface FournisseurRow extends RowDataPacket {
  id: number;
  code: string;
  raisonSociale: string;
  matriculeFiscal: string | null;
  telephone: string | null;
  adresse: string | null;
}

interface AchatRow extends RowDataPacket {
  id: number;
  fournisseurId: number;
  date: string;
  [key: string]: unknown;
}

interface DetailAchatRow extends RowDataPacket {
  id: number;
  achatId: number;
  quantite: string | number;
  prixUnitaire: string | number;
  [key: string]: unknown;
}

interface RegFourRow extends RowDataPacket {
  id: number;
  fournisseurId: number;
  date: string;
  montantTotal: string | number;
  valide: boolean;
  [key: string]: unknown;
}

interface DetailRegFourRow extends RowDataPacket {
  id: number;
  regFourId: number;
  nLigne: number;
  numAchats: string | null;
  proEss: string | null;
  montant: string | number;
  modePayment: string | null;
  echeance: string | null;
  reste: string | number;
  [key: string]: unknown;
}

interface EntRasRow extends RowDataPacket {
  id: number;
  dateRas: string;
  fournisseurId: number;
  totalBrut: string | number;
  totalRetenu: string | number;
  totalNet: string | number;
  valide: boolean;
  [key: string]: unknown;
}

interface DetailEntRasRow extends RowDataPacket {
  id: number;
  numRas: number;
  numLigne: number;
  codeRet: string | null;
  mtBrut: string | number;
  tauxRetenu: string | number;
  mtRetenu: string | number;
  fournisseurId: number;
  valide: boolean;
  [key: string]: unknown;
}

interface AvoirRow extends RowDataPacket {
  id: number;
  fournisseurId: number;
  dateAchat: string;
  totalTTC: string | number;
  reste: string | number;
  magasinId: number;
  valide: boolean;
  [key: string]: unknown;
}

/**
 * GET /fournisseurs
 */
router.get('/fournisseurs', ...readAccess, async (_request, response, next) => {
  try {
    const [fournisseurs] = await db.query<FournisseurRow[]>(
      `
        SELECT
          id,
          code,
          raisonSociale,
          matriculeFiscal,
          telephone,
          adresse
        FROM fournisseur
        ORDER BY raisonSociale ASC
      `,
    );

    const result = await Promise.all(
      fournisseurs.map(async (fournisseur) => {
        const [achats] = await db.query<AchatRow[]>(
          `
            SELECT id
            FROM achatEssence
            WHERE fournisseurId = ?
          `,
          [fournisseur.id],
        );

        const achatIds = achats.map((achat) => achat.id);

        let totalAchats = 0;

        if (achatIds.length > 0) {
          const placeholders = achatIds.map(() => '?').join(',');

          const [details] = await db.query<DetailAchatRow[]>(
            `
              SELECT quantite, prixUnitaire
              FROM detailAchatEssence
              WHERE achatId IN (${placeholders})
            `,
            achatIds,
          );

          totalAchats = details.reduce(
            (sum, detail) =>
              sum +
              Number(detail.quantite) * Number(detail.prixUnitaire),
            0,
          );
        }

        const [reglements] = await db.query<RegFourRow[]>(
          `
            SELECT id
            FROM regFour
            WHERE fournisseurId = ?
          `,
          [fournisseur.id],
        );

        const reglementIds = reglements.map((reglement) => reglement.id);

        let totalRegle = 0;

        if (reglementIds.length > 0) {
          const placeholders = reglementIds.map(() => '?').join(',');

          const [details] = await db.query<DetailRegFourRow[]>(
            `
              SELECT montant
              FROM detailRegFour
              WHERE regFourId IN (${placeholders})
            `,
            reglementIds,
          );

          totalRegle = details.reduce(
            (sum, detail) => sum + Number(detail.montant),
            0,
          );
        }

        return {
          id: fournisseur.id,
          code: fournisseur.code,
          raisonSociale: fournisseur.raisonSociale,
          matriculeFiscal: fournisseur.matriculeFiscal,
          telephone: fournisseur.telephone,
          adresse: fournisseur.adresse,
          totalAchats,
          totalRegle,
          soldeRestant: totalAchats - totalRegle,
        };
      }),
    );

    response.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /fournisseurs
 */
router.post('/fournisseurs', ...managerAccess, async (request, response, next) => {
  try {
    const input = fournisseurSchema.parse(request.body);

    const columns = Object.keys(input);
    const values = Object.values(input);

    if (!columns.length) {
      response.status(400).json({
        message: 'Aucune donnée fournisseur.',
      });
      return;
    }

    const placeholders = columns.map(() => '?').join(', ');

    const [result] = await db.query<ResultSetHeader>(
      `
        INSERT INTO fournisseur (${columns.join(', ')})
        VALUES (${placeholders})
      `,
      values,
    );

    const [rows] = await db.query<FournisseurRow[]>(
      `
        SELECT *
        FROM fournisseur
        WHERE id = ?
      `,
      [result.insertId],
    );

    response.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /fournisseurs/:id
 */
router.put('/fournisseurs/:id', ...managerAccess, async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const input = fournisseurSchema.parse(request.body);

    const columns = Object.keys(input);
    const values = Object.values(input);

    if (!columns.length) {
      response.status(400).json({
        message: 'Aucune donnée à modifier.',
      });
      return;
    }

    const setClause = columns.map((column) => `${column} = ?`).join(', ');

    const [result] = await db.query<ResultSetHeader>(
      `
        UPDATE fournisseur
        SET ${setClause}
        WHERE id = ?
      `,
      [...values, id],
    );

    if (!result.affectedRows) {
      response.status(404).json({
        message: 'Fournisseur introuvable.',
      });
      return;
    }

    const [rows] = await db.query<FournisseurRow[]>(
      `
        SELECT *
        FROM fournisseur
        WHERE id = ?
      `,
      [id],
    );

    response.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /achats
 */
router.get('/achats', ...readAccess, async (request, response, next) => {
  try {
    const fournisseurId = request.query.fournisseurId
      ? Number(request.query.fournisseurId)
      : undefined;

    const [achats] = await db.query<AchatRow[]>(
      `
        SELECT *
        FROM achatEssence
        ${fournisseurId !== undefined ? 'WHERE fournisseurId = ?' : ''}
        ORDER BY date DESC
      `,
      fournisseurId !== undefined ? [fournisseurId] : [],
    );

    const result = await Promise.all(
      achats.map(async (achat) => {
        const [details] = await db.query<DetailAchatRow[]>(
          `
            SELECT *
            FROM detailAchatEssence
            WHERE achatId = ?
          `,
          [achat.id],
        );

        return {
          ...achat,
          details: details.map((detail) => ({
            ...detail,
            quantite: numberValue(detail.quantite),
            prixUnitaire: numberValue(detail.prixUnitaire),
          })),
        };
      }),
    );

    response.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /reglements-fournisseurs
 */
router.post(
  '/reglements-fournisseurs',
  ...paymentAccess,
  async (request, response, next) => {
    const connection = await db.getConnection();

    try {
      const input = reglementFournisseurSchema.parse(request.body);

      const [fournisseurs] = await connection.query<FournisseurRow[]>(
        `
          SELECT *
          FROM fournisseur
          WHERE id = ?
          LIMIT 1
        `,
        [input.fournisseurId],
      );

      if (!fournisseurs.length) {
        response.status(404).json({
          message: 'Fournisseur introuvable.',
        });
        return;
      }

      const total = input.lignes.reduce(
        (sum, line) => sum + line.montant,
        0,
      );

      await connection.beginTransaction();

      const [reglementResult] = await connection.query<ResultSetHeader>(
        `
          INSERT INTO regFour (
            fournisseurId,
            date,
            montantTotal,
            valide
          )
          VALUES (?, ?, ?, ?)
        `,
        [
          input.fournisseurId,
          toDate(input.date),
          total,
          input.valide,
        ],
      );

      const reglementId = reglementResult.insertId;

      for (let index = 0; index < input.lignes.length; index++) {
        const line = input.lignes[index];

        await connection.query(
          `
            INSERT INTO detailRegFour (
              regFourId,
              nLigne,
              numAchats,
              proEss,
              montant,
              modePayment,
              echeance,
              reste
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            reglementId,
            index + 1,
            line.numAchats,
            line.proEss,
            line.montant,
            line.modePayment,
            line.echeance ? toDate(line.echeance) : null,
            line.reste,
          ],
        );
      }

      await connection.commit();

      const [reglements] = await db.query<RegFourRow[]>(
        `
          SELECT
            rf.*,
            f.id AS fournisseur_id,
            f.code AS fournisseur_code,
            f.raisonSociale AS fournisseur_raisonSociale
          FROM regFour rf
          INNER JOIN fournisseur f
            ON f.id = rf.fournisseurId
          WHERE rf.id = ?
        `,
        [reglementId],
      );

      const [details] = await db.query<DetailRegFourRow[]>(
        `
          SELECT *
          FROM detailRegFour
          WHERE regFourId = ?
          ORDER BY nLigne ASC
        `,
        [reglementId],
      );

      const reglement = reglements[0];

      response.status(201).json({
        ...reglement,
        fournisseur: {
          id: reglement.fournisseur_id,
          code: reglement.fournisseur_code,
          raisonSociale: reglement.fournisseur_raisonSociale,
        },
        montantTotal: numberValue(reglement.montantTotal),
        details: details.map((line) => ({
          ...line,
          montant: numberValue(line.montant),
          reste: numberValue(line.reste),
        })),
      });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  },
);

/**
 * GET /reglements-fournisseurs
 */
router.get(
  '/reglements-fournisseurs',
  ...readAccess,
  async (request, response, next) => {
    try {
      const filter = listFilterSchema.parse(request.query);

      const conditions: string[] = [];
      const params: unknown[] = [];

      if (filter.fournisseurId !== undefined) {
        conditions.push('rf.fournisseurId = ?');
        params.push(filter.fournisseurId);
      }

      if (filter.dateFrom) {
        conditions.push('rf.date >= ?');
        params.push(toDate(filter.dateFrom));
      }

      if (filter.dateTo) {
        conditions.push('rf.date <= ?');
        params.push(`${filter.dateTo} 23:59:59`);
      }

      const whereClause =
        conditions.length > 0
          ? `WHERE ${conditions.join(' AND ')}`
          : '';

      const [reglements] = await db.query<RegFourRow[]>(
        `
          SELECT
            rf.*,
            f.id AS fournisseur_id,
            f.code AS fournisseur_code,
            f.raisonSociale AS fournisseur_raisonSociale
          FROM regFour rf
          INNER JOIN fournisseur f
            ON f.id = rf.fournisseurId
          ${whereClause}
          ORDER BY rf.date DESC
        `,
        params,
      );

      const result = await Promise.all(
        reglements.map(async (reglement) => {
          const [details] = await db.query<DetailRegFourRow[]>(
            `
              SELECT *
              FROM detailRegFour
              WHERE regFourId = ?
              ORDER BY nLigne ASC
            `,
            [reglement.id],
          );

          const reste = details.reduce(
            (sum, line) => sum + Number(line.reste),
            0,
          );

          return {
            ...reglement,
            fournisseur: {
              id: reglement.fournisseur_id,
              code: reglement.fournisseur_code,
              raisonSociale: reglement.fournisseur_raisonSociale,
            },
            montantTotal: numberValue(reglement.montantTotal),
            reste,
            details: details.map((line) => ({
              ...line,
              montant: numberValue(line.montant),
              reste: numberValue(line.reste),
            })),
          };
        }),
      );

      response.json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /retenues-source
 */
router.post('/retenues-source', ...managerAccess, async (request, response, next) => {
  const connection = await db.getConnection();

  try {
    const input = retenueSourceSchema.parse(request.body);

    if (
      input.lignes.some(
        (line) => line.fournisseurId !== input.fournisseurId,
      )
    ) {
      response.status(400).json({
        message:
          'Toutes les lignes doivent appartenir au fournisseur selectionne.',
      });
      return;
    }

    const totalBrut = input.lignes.reduce(
      (sum, line) => sum + line.mtBrut,
      0,
    );

    const totalRetenu = input.lignes.reduce(
      (sum, line) =>
        sum + (line.mtBrut * line.tauxRetenu) / 100,
      0,
    );

    const totalNet = totalBrut - totalRetenu;

    await connection.beginTransaction();

    const [retenueResult] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO entRas (
          dateRas,
          fournisseurId,
          totalBrut,
          totalRetenu,
          totalNet,
          valide
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        toDate(input.dateRas),
        input.fournisseurId,
        totalBrut,
        totalRetenu,
        totalNet,
        input.valide,
      ],
    );

    const retenueId = retenueResult.insertId;

    for (let index = 0; index < input.lignes.length; index++) {
      const line = input.lignes[index];

      const mtRetenu =
        (line.mtBrut * line.tauxRetenu) / 100;

      await connection.query(
        `
          INSERT INTO DetRas (
            numRas,
            numLigne,
            codeRet,
            mtBrut,
            tauxRetenu,
            mtRetenu,
            fournisseurId,
            valide
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          retenueId,
          index + 1,
          line.codeRet,
          line.mtBrut,
          line.tauxRetenu,
          mtRetenu,
          line.fournisseurId,
          line.valide,
        ],
      );
    }

    await connection.commit();

    const [retenues] = await db.query<EntRasRow[]>(
      `
        SELECT
          er.*,
          f.id AS fournisseur_id,
          f.code AS fournisseur_code,
          f.raisonSociale AS fournisseur_raisonSociale
        FROM entRas er
        INNER JOIN fournisseur f
          ON f.id = er.fournisseurId
        WHERE er.id = ?
      `,
      [retenueId],
    );

    const [details] = await db.query<DetailEntRasRow[]>(
      `
        SELECT *
        FROM DetRas
        WHERE numRas = ?
        ORDER BY numLigne ASC
      `,
      [retenueId],
    );

    const retenue = retenues[0];

    response.status(201).json({
      ...retenue,
      fournisseur: {
        id: retenue.fournisseur_id,
        code: retenue.fournisseur_code,
        raisonSociale: retenue.fournisseur_raisonSociale,
      },
      totalBrut: numberValue(retenue.totalBrut),
      totalRetenu: numberValue(retenue.totalRetenu),
      totalNet: numberValue(retenue.totalNet),
      details: details.map((line) => ({
        ...line,
        mtBrut: numberValue(line.mtBrut),
        tauxRetenu: numberValue(line.tauxRetenu),
        mtRetenu: numberValue(line.mtRetenu),
      })),
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

/**
 * GET /retenues-source
 */
router.get(
  '/retenues-source',
  ...readAccess,
  async (request, response, next) => {
    try {
      const filter = listFilterSchema.parse(request.query);

      const conditions: string[] = [];
      const params: unknown[] = [];

      if (filter.fournisseurId !== undefined) {
        conditions.push('er.fournisseurId = ?');
        params.push(filter.fournisseurId);
      }

      if (filter.dateFrom) {
        conditions.push('er.dateRas >= ?');
        params.push(toDate(filter.dateFrom));
      }

      if (filter.dateTo) {
        conditions.push('er.dateRas <= ?');
        params.push(`${filter.dateTo} 23:59:59`);
      }

      const whereClause =
        conditions.length > 0
          ? `WHERE ${conditions.join(' AND ')}`
          : '';

      const [retenues] = await db.query<EntRasRow[]>(
        `
          SELECT
            er.*,
            f.id AS fournisseur_id,
            f.code AS fournisseur_code,
            f.raisonSociale AS fournisseur_raisonSociale
          FROM entRas er
          INNER JOIN fournisseur f
            ON f.id = er.fournisseurId
          ${whereClause}
          ORDER BY er.dateRas DESC
        `,
        params,
      );

      const result = await Promise.all(
        retenues.map(async (retenue) => {
          const [details] = await db.query<DetailEntRasRow[]>(
            `
              SELECT *
              FROM DetRas
              WHERE numRas = ?
              ORDER BY numLigne ASC
            `,
            [retenue.id],
          );

          return {
            ...retenue,
            fournisseur: {
              id: retenue.fournisseur_id,
              code: retenue.fournisseur_code,
              raisonSociale: retenue.fournisseur_raisonSociale,
            },
            totalBrut: numberValue(retenue.totalBrut),
            totalRetenu: numberValue(retenue.totalRetenu),
            totalNet: numberValue(retenue.totalNet),
            details: details.map((line) => ({
              ...line,
              mtBrut: numberValue(line.mtBrut),
              tauxRetenu: numberValue(line.tauxRetenu),
              mtRetenu: numberValue(line.mtRetenu),
            })),
          };
        }),
      );

      response.json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /libras
 */
router.get('/libras', ...readAccess, async (_request, response, next) => {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `
        SELECT *
        FROM libRas
        ORDER BY tauxRetenu ASC
      `,
    );

    response.json(
      rows.map((row) => ({
        ...row,
        tauxRetenu:
          row.tauxRetenu == null
            ? null
            : Number(row.tauxRetenu),
      })),
    );
  } catch (error) {
    next(error);
  }
});

/**
 * POST /fournisseurs/avoirs
 */
router.post(
  '/fournisseurs/avoirs',
  ...managerAccess,
  async (request, response, next) => {
    try {
      const input = avoirSchema.parse(request.body);

      const magasinId = request.user?.magasinId;

      if (magasinId == null) {
        response.status(400).json({
          message: 'Magasin utilisateur introuvable.',
        });
        return;
      }

      const [result] = await db.query<ResultSetHeader>(
        `
          INSERT INTO entAvoir (
            fournisseurId,
            dateAchat,
            totalTTC,
            reste,
            magasinId,
            valide
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          input.fournisseurId,
          toDate(input.dateAchat),
          input.totalTTC,
          input.totalTTC,
          magasinId,
          input.valide,
        ],
      );

      const [rows] = await db.query<AvoirRow[]>(
        `
          SELECT
            ea.*,
            f.id AS fournisseur_id,
            f.code AS fournisseur_code,
            f.raisonSociale AS fournisseur_raisonSociale
          FROM entAvoir ea
          INNER JOIN fournisseur f
            ON f.id = ea.fournisseurId
          WHERE ea.id = ?
        `,
        [result.insertId],
      );

      const row = rows[0];

      response.status(201).json({
        ...row,
        fournisseur: {
          id: row.fournisseur_id,
          code: row.fournisseur_code,
          raisonSociale: row.fournisseur_raisonSociale,
        },
        totalTTC: numberValue(row.totalTTC),
        reste: numberValue(row.reste),
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /fournisseurs/avoirs
 */
router.get(
  '/fournisseurs/avoirs',
  ...readAccess,
  async (request, response, next) => {
    try {
      const magasinId = request.user?.magasinId;

      if (magasinId == null) {
        response.status(400).json({
          message: 'Magasin utilisateur introuvable.',
        });
        return;
      }

      const [rows] = await db.query<AvoirRow[]>(
        `
          SELECT
            ea.*,
            f.id AS fournisseur_id,
            f.code AS fournisseur_code,
            f.raisonSociale AS fournisseur_raisonSociale
          FROM entAvoir ea
          INNER JOIN fournisseur f
            ON f.id = ea.fournisseurId
          WHERE ea.magasinId = ?
          ORDER BY ea.dateAchat DESC
        `,
        [magasinId],
      );

      response.json(
        rows.map((row) => ({
          ...row,
          fournisseur: {
            id: row.fournisseur_id,
            code: row.fournisseur_code,
            raisonSociale: row.fournisseur_raisonSociale,
          },
          totalTTC: numberValue(row.totalTTC),
          reste: numberValue(row.reste),
        })),
      );
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PATCH /fournisseurs/avoirs/:id/valider
 */
router.patch(
  '/fournisseurs/avoirs/:id/valider',
  ...managerAccess,
  async (request, response, next) => {
    try {
      const id = Number(request.params.id);
      const magasinId = request.user?.magasinId;

      if (magasinId == null) {
        response.status(400).json({
          message: 'Magasin utilisateur introuvable.',
        });
        return;
      }

      const [result] = await db.query<ResultSetHeader>(
        `
          UPDATE entAvoir
          SET valide = 1
          WHERE id = ?
            AND magasinId = ?
        `,
        [id, magasinId],
      );

      if (!result.affectedRows) {
        response.status(404).json({
          message: 'Avoir introuvable.',
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

/**
 * PATCH /fournisseurs/avoirs/:id/imputer
 */
router.patch(
  '/fournisseurs/avoirs/:id/imputer',
  ...paymentAccess,
  async (request, response, next) => {
    try {
      const id = Number(request.params.id);
      const input = imputationSchema.parse(request.body);
      const magasinId = request.user?.magasinId;

      if (magasinId == null) {
        response.status(400).json({
          message: 'Magasin utilisateur introuvable.',
        });
        return;
      }

      const [rows] = await db.query<AvoirRow[]>(
        `
          SELECT
            ea.*,
            f.id AS fournisseur_id,
            f.code AS fournisseur_code,
            f.raisonSociale AS fournisseur_raisonSociale
          FROM entAvoir ea
          INNER JOIN fournisseur f
            ON f.id = ea.fournisseurId
          WHERE ea.id = ?
            AND ea.magasinId = ?
          LIMIT 1
        `,
        [id, magasinId],
      );

      if (!rows.length) {
        response.status(404).json({
          message: 'Avoir introuvable.',
        });
        return;
      }

      const current = rows[0];
      const resteActuel = Number(current.reste);

      if (input.montant > resteActuel) {
        response.status(400).json({
          message: "Le montant depasse le reste de l'avoir.",
        });
        return;
      }

      const nouveauReste = resteActuel - input.montant;

      await db.query<ResultSetHeader>(
        `
          UPDATE entAvoir
          SET reste = ?
          WHERE id = ?
            AND magasinId = ?
        `,
        [nouveauReste, id, magasinId],
      );

      const [updatedRows] = await db.query<AvoirRow[]>(
        `
          SELECT
            ea.*,
            f.id AS fournisseur_id,
            f.code AS fournisseur_code,
            f.raisonSociale AS fournisseur_raisonSociale
          FROM entAvoir ea
          INNER JOIN fournisseur f
            ON f.id = ea.fournisseurId
          WHERE ea.id = ?
          LIMIT 1
        `,
        [id],
      );

      const row = updatedRows[0];

      response.json({
        ...row,
        fournisseur: {
          id: row.fournisseur_id,
          code: row.fournisseur_code,
          raisonSociale: row.fournisseur_raisonSociale,
        },
        totalTTC: numberValue(row.totalTTC),
        reste: numberValue(row.reste),
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;