import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../lib/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { paramSchema, stationSchema } from './parametres.schema.js';

const router = Router();

const numberValue = (
  value: string | number | bigint | null | undefined,
): number | null => {
  if (value == null) return null;
  return Number(value);
};

interface StationRow extends RowDataPacket {
  id: number;
  code: string;
  nom: string;
  active: boolean | number;
}

interface MagasinRow extends RowDataPacket {
  id: number;
  stationId: number;
  code: string;
  nom: string;
}

interface ParametreRow extends RowDataPacket {
  id: number;
  nomStation: string;
  devise: string;
  timbre: string | number;
  tauxTVADefaut: string | number;
  [key: string]: unknown;
}

interface CompteurRow extends RowDataPacket {
  id: number;
  [key: string]: unknown;
}

/**
 * GET /stations
 */
router.get(
  '/stations',
  requireAuth,
  async (_request, response, next) => {
    try {
      const [stations] = await db.query<StationRow[]>(
        `
          SELECT
            s.*,
            m.id AS magasin_id,
            m.stationId AS magasin_stationId,
            m.code AS magasin_code,
            m.nom AS magasin_nom
          FROM station s
          LEFT JOIN magasin m
            ON m.stationId = s.id
          WHERE s.active = 1
          ORDER BY s.nom ASC
        `,
      );

      const result = stations.map((row) => ({
        id: row.id,
        code: row.code,
        nom: row.nom,
        active: Boolean(row.active),
        magasin:
          row.magasin_id != null
            ? {
                id: row.magasin_id,
                stationId: row.magasin_stationId,
                code: row.magasin_code,
                nom: row.magasin_nom,
              }
            : null,
      }));

      response.json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /stations
 */
router.post(
  '/stations',
  requireAuth,
  requireRole('gerant'),
  async (request, response, next) => {
    const connection = await db.getConnection();

    try {
      const input = stationSchema.parse(request.body);

      await connection.beginTransaction();

      const [stationResult] = await connection.query<ResultSetHeader>(
        `
          INSERT INTO station (
            code,
            nom
          )
          VALUES (?, ?)
        `,
        [
          input.code,
          input.nom,
        ],
      );

      const stationId = stationResult.insertId;

      const magasinCode = `MAG-${input.code}`;
      const magasinNom = `Magasin de ${input.nom}`;

      const [magasinResult] = await connection.query<ResultSetHeader>(
        `
          INSERT INTO magasin (
            stationId,
            code,
            nom
          )
          VALUES (?, ?, ?)
        `,
        [
          stationId,
          magasinCode,
          magasinNom,
        ],
      );

      await connection.commit();

      const [rows] = await db.query<RowDataPacket[]>(
        `
          SELECT
            m.*,
            s.id AS station_id,
            s.code AS station_code,
            s.nom AS station_nom,
            s.active AS station_active
          FROM magasin m
          INNER JOIN station s
            ON s.id = m.stationId
          WHERE m.id = ?
          LIMIT 1
        `,
        [magasinResult.insertId],
      );

      const row = rows[0];

      response.status(201).json({
        id: row.id,
        stationId: row.stationId,
        code: row.code,
        nom: row.nom,
        station: {
          id: row.station_id,
          code: row.station_code,
          nom: row.station_nom,
          active: Boolean(row.station_active),
        },
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
 * GET /parametres
 *
 * Équivalent Prisma :
 * setParam.upsert({
 *   where: { id: 1 },
 *   create: { id: 1, nomStation: 'Station Service', devise: 'TND' },
 *   update: {}
 * })
 */
router.get(
  '/parametres',
  requireAuth,
  async (_request, response, next) => {
    try {
      let [rows] = await db.query<ParametreRow[]>(
        `
          SELECT *
          FROM setParam
          WHERE id = 1
          LIMIT 1
        `,
      );

      if (!rows.length) {
        await db.query<ResultSetHeader>(
          `
            INSERT INTO setParam (
              id,
              nomStation,
              devise
            )
            VALUES (1, ?, ?)
          `,
          [
            'Station Service',
            'TND',
          ],
        );

        [rows] = await db.query<ParametreRow[]>(
          `
            SELECT *
            FROM setParam
            WHERE id = 1
            LIMIT 1
          `,
        );
      }

      const row = rows[0];

      response.json({
        ...row,
        timbre: numberValue(row.timbre),
        tauxTVADefaut: numberValue(row.tauxTVADefaut),
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /parametres
 */
router.put(
  '/parametres',
  requireAuth,
  requireRole('gerant'),
  async (request, response, next) => {
    try {
      const input = paramSchema.parse(request.body);

      const [existing] = await db.query<ParametreRow[]>(
        `
          SELECT *
          FROM setParam
          WHERE id = 1
          LIMIT 1
        `,
      );

      if (!existing.length) {
        const columns = [
          'id',
          ...Object.keys(input),
        ];

        const values = [
          1,
          ...Object.values(input),
        ];

        const placeholders = columns
          .map(() => '?')
          .join(', ');

        await db.query<ResultSetHeader>(
          `
            INSERT INTO setParam (
              ${columns.join(', ')}
            )
            VALUES (${placeholders})
          `,
          values,
        );
      } else {
        const columns = Object.keys(input);

        if (columns.length > 0) {
          const setClause = columns
            .map((column) => `${column} = ?`)
            .join(', ');

          await db.query<ResultSetHeader>(
            `
              UPDATE setParam
              SET ${setClause}
              WHERE id = 1
            `,
            Object.values(input),
          );
        }
      }

      const [rows] = await db.query<ParametreRow[]>(
        `
          SELECT *
          FROM setParam
          WHERE id = 1
          LIMIT 1
        `,
      );

      const row = rows[0];

      response.json({
        ...row,
        timbre: numberValue(row.timbre),
        tauxTVADefaut: numberValue(row.tauxTVADefaut),
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /parametres/compteur
 *
 * Équivalent Prisma :
 * compteur.upsert({
 *   where: { id: 1 },
 *   create: { id: 1 },
 *   update: {}
 * })
 */
router.get(
  '/parametres/compteur',
  requireAuth,
  async (_request, response, next) => {
    try {
      let [rows] = await db.query<CompteurRow[]>(
        `
          SELECT *
          FROM compteur
          WHERE id = 1
          LIMIT 1
        `,
      );

      if (!rows.length) {
        await db.query<ResultSetHeader>(
          `
            INSERT INTO compteur (id)
            VALUES (1)
          `,
        );

        [rows] = await db.query<CompteurRow[]>(
          `
            SELECT *
            FROM compteur
            WHERE id = 1
            LIMIT 1
          `,
        );
      }

      response.json(rows[0]);
    } catch (error) {
      next(error);
    }
  },
);

export default router;