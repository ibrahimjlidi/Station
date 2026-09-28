import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import { db } from '../../lib/db.js';

import { requireAuth, requireRole } from '../../middleware/auth.js';

import { familleDepenseSchema, tauxTvaSchema } from './schemas.js';

const router = Router();

router.use(requireAuth);

const numberValue = (value: unknown) => Number(value ?? 0);

// =========================
// TAUX TVA
// =========================

router.get(
  '/referentiels/taux-tva',
  async (_request, response, next) => {
    try {
      const [rows] = await db.query<RowDataPacket[]>(
        `
        SELECT *
        FROM tauxTVA
        ORDER BY taux ASC
        `,
      );

      response.json(
        rows.map((row) => ({
          ...row,
          taux: numberValue(row.taux),
        })),
      );
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/referentiels/taux-tva',
  requireRole('gerant'),
  async (request, response, next) => {
    try {
      const input = tauxTvaSchema.parse(request.body);

      const [result] = await db.query<ResultSetHeader>(
        `
        INSERT INTO tauxTVA (
          taux
        )
        VALUES (?)
        `,
        [input.taux],
      );

      const [rows] = await db.query<RowDataPacket[]>(
        `
        SELECT *
        FROM tauxTVA
        WHERE id = ?
        `,
        [result.insertId],
      );

      if (!rows.length) {
        response.status(500).json({
          message: 'Le taux TVA a été créé mais est introuvable.',
        });
        return;
      }

      response.status(201).json({
        ...rows[0],
        taux: numberValue(rows[0].taux),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  '/referentiels/taux-tva/:id',
  requireRole('gerant'),
  async (request, response, next) => {
    try {
      const id = Number(request.params.id);

      if (!Number.isInteger(id)) {
        response.status(400).json({
          message: 'Identifiant invalide.',
        });
        return;
      }

      const input = tauxTvaSchema.partial().parse(request.body);

      const fields: string[] = [];
      const values: unknown[] = [];

      if (input.taux !== undefined) {
        fields.push('taux = ?');
        values.push(input.taux);
      }

      if (!fields.length) {
        const [rows] = await db.query<RowDataPacket[]>(
          `
          SELECT *
          FROM tauxTVA
          WHERE id = ?
          `,
          [id],
        );

        if (!rows.length) {
          response.status(404).json({
            message: 'Taux TVA introuvable.',
          });
          return;
        }

        response.json({
          ...rows[0],
          taux: numberValue(rows[0].taux),
        });
        return;
      }

      values.push(id);

      const [result] = await db.query<ResultSetHeader>(
        `
        UPDATE tauxTVA
        SET ${fields.join(', ')}
        WHERE id = ?
        `,
        values,
      );

      if (result.affectedRows === 0) {
        response.status(404).json({
          message: 'Taux TVA introuvable.',
        });
        return;
      }

      const [rows] = await db.query<RowDataPacket[]>(
        `
        SELECT *
        FROM tauxTVA
        WHERE id = ?
        `,
        [id],
      );

      response.json({
        ...rows[0],
        taux: numberValue(rows[0].taux),
      });
    } catch (error) {
      next(error);
    }
  },
);

// =========================
// FAMILLES DE DÉPENSES
// =========================

router.get(
  '/referentiels/familles-depenses',
  async (_request, response, next) => {
    try {
      const [rows] = await db.query<RowDataPacket[]>(
        `
        SELECT *
        FROM famDepense
        ORDER BY libelle ASC
        `,
      );

      response.json(rows);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/referentiels/familles-depenses',
  requireRole('gerant'),
  async (request, response, next) => {
    try {
      const input = familleDepenseSchema.parse(request.body);

      const columns = Object.keys(input);
      const values = Object.values(input);

      if (!columns.length) {
        response.status(400).json({
          message: 'Aucune donnée à enregistrer.',
        });
        return;
      }

      const placeholders = columns.map(() => '?').join(', ');

      const [result] = await db.query<ResultSetHeader>(
        `
        INSERT INTO famDepense (${columns.join(', ')})
        VALUES (${placeholders})
        `,
        values,
      );

      const [rows] = await db.query<RowDataPacket[]>(
        `
        SELECT *
        FROM famDepense
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

router.put(
  '/referentiels/familles-depenses/:id',
  requireRole('gerant'),
  async (request, response, next) => {
    try {
      const id = Number(request.params.id);

      if (!Number.isInteger(id)) {
        response.status(400).json({
          message: 'Identifiant invalide.',
        });
        return;
      }

      const input = familleDepenseSchema.parse(request.body);

      const columns = Object.keys(input);
      const values = Object.values(input);

      if (!columns.length) {
        response.status(400).json({
          message: 'Aucune donnée à modifier.',
        });
        return;
      }

      const setClause = columns
        .map((column) => `${column} = ?`)
        .join(', ');

      values.push(id);

      const [result] = await db.query<ResultSetHeader>(
        `
        UPDATE famDepense
        SET ${setClause}
        WHERE id = ?
        `,
        values,
      );

      if (result.affectedRows === 0) {
        response.status(404).json({
          message: 'Famille de dépense introuvable.',
        });
        return;
      }

      const [rows] = await db.query<RowDataPacket[]>(
        `
        SELECT *
        FROM famDepense
        WHERE id = ?
        `,
        [id],
      );

      response.json(rows[0]);
    } catch (error) {
      next(error);
    }
  },
);

// =========================
// SERVICES
// =========================

router.get(
  '/referentiels/services',
  async (_request, response, next) => {
    try {
      const [rows] = await db.query<RowDataPacket[]>(
        `
        SELECT *
        FROM service
        WHERE actif = 1
        ORDER BY libelle ASC
        `,
      );

      response.json(
        rows.map((row) => ({
          ...row,
          prixHT: numberValue(row.prixHT),
          tauxTVA: numberValue(row.tauxTVA),
          prixTTC: numberValue(row.prixTTC),
        })),
      );
    } catch (error) {
      next(error);
    }
  },
);

export default router;