import { Router } from 'express';
import { z } from 'zod';
import type { ResultSetHeader } from 'mysql2';
import { db } from '../../lib/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { bonSchema, carteSchema, importRowSchema } from './cartes.schema.js';

const router = Router();

const read = [requireAuth];
const write = [requireAuth, requireRole('caissier', 'gerant')];

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
   CARTES
   ============================================================ */

router.get('/cartes', ...read, async (request, response, next) => {
  try {
    const typeCarte = getQueryString(request.query.typeCarte);
    const dateFrom = getQueryString(request.query.dateFrom);
    const dateTo = getQueryString(request.query.dateTo);

    let sql = `
      SELECT *
      FROM cartes
      WHERE 1 = 1
    `;

    const params: unknown[] = [];

    if (typeCarte) {
      sql += ` AND typeCarte = ?`;
      params.push(typeCarte);
    }

    if (dateFrom) {
      sql += ` AND date >= ?`;
      params.push(toDate(dateFrom));
    }

    if (dateTo) {
      sql += ` AND date <= ?`;
      params.push(`${dateTo} 23:59:59`);
    }

    sql += ` ORDER BY date DESC`;

    const [rows] = await db.query(sql, params);

    response.json(
      (rows as any[]).map((row) => ({
        ...row,
        montant: numberValue(row.montant),
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.post('/cartes', ...write, async (request, response, next) => {
  try {
    const input = carteSchema.parse(request.body);

    const [result] = await db.execute<ResultSetHeader>(
      `
        INSERT INTO cartes (
          typeCarte,
          date,
          montant,
          fait
        )
        VALUES (?, ?, ?, ?)
      `,
      [
        input.typeCarte,
        toDate(input.date),
        Number(input.montant),
        false,
      ]
    );

    const [rows] = await db.query(
      `
        SELECT *
        FROM cartes
        WHERE id = ?
        LIMIT 1
      `,
      [result.insertId]
    );

    const row = (rows as any[])[0];

    response.status(201).json({
      ...row,
      montant: numberValue(row.montant),
    });
  } catch (error) {
    next(error);
  }
});

router.patch(
  '/cartes/:id/valider',
  ...write,
  async (request, response, next) => {
    try {
      const id = Number(request.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        response.status(400).json({
          message: 'Identifiant de carte invalide.',
        });
        return;
      }

      const [result] = await db.execute<ResultSetHeader>(
        `
          UPDATE cartes
          SET fait = 1
          WHERE id = ?
        `,
        [id]
      );

      if (result.affectedRows === 0) {
        response.status(404).json({
          message: 'Carte introuvable.',
        });
        return;
      }

      const [rows] = await db.query(
        `
          SELECT *
          FROM cartes
          WHERE id = ?
          LIMIT 1
        `,
        [id]
      );

      const row = (rows as any[])[0];

      response.json({
        ...row,
        montant: numberValue(row.montant),
      });
    } catch (error) {
      next(error);
    }
  }
);

/* ============================================================
   IMPORT CN
   ============================================================ */

router.post(
  '/cartes/import-cn',
  ...write,
  async (request, response, next) => {
    try {
      const rows = z.array(importRowSchema).parse(request.body);

      if (rows.length === 0) {
        response.status(201).json({
          imported: 0,
          duplicates: 0,
        });
        return;
      }

      const receipts = rows.map((row) => row.receipt);

      const placeholders = receipts.map(() => '?').join(', ');

      const [existingRows] = await db.query(
        `
          SELECT receipt
          FROM extractCN
          WHERE receipt IN (${placeholders})
        `,
        receipts
      );

      const existingSet = new Set(
        (existingRows as any[]).map((row) => row.receipt)
      );

      const fresh = rows.filter(
        (row) => !existingSet.has(row.receipt)
      );

      if (fresh.length > 0) {
        const connection = await db.getConnection();

        try {
          await connection.beginTransaction();

          for (const row of fresh) {
            await connection.execute(
              `
                INSERT INTO extractCN (
                  terminal,
                  shift,
                  date,
                  receipt,
                  card,
                  product,
                  customerName,
                  transactionType,
                  quantity,
                  amount,
                  numCN,
                  dateAvoir
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `,
              [
                row.terminal ?? null,
                row.shift ?? null,
                row.date ? toDate(row.date) : null,
                row.receipt,
                row.card ?? null,
                row.product ?? null,
                row.customerName ?? null,
                row.transactionType ?? null,
                row.quantity !== undefined
                  ? Number(row.quantity)
                  : null,
                row.amount !== undefined
                  ? Number(row.amount)
                  : null,
                row.numCN ?? null,
                row.dateAvoir
                  ? toDate(row.dateAvoir)
                  : null,
              ]
            );
          }

          await connection.commit();
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          connection.release();
        }
      }

      response.status(201).json({
        imported: fresh.length,
        duplicates: rows.length - fresh.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* ============================================================
   EXTRAITS CN
   ============================================================ */

router.get(
  '/cartes/extraits-cn',
  ...read,
  async (request, response, next) => {
    try {
      const numCN = getQueryString(request.query.numCN);
      const dateFrom = getQueryString(request.query.dateFrom);
      const dateTo = getQueryString(request.query.dateTo);

      let sql = `
        SELECT *
        FROM extractCN
        WHERE 1 = 1
      `;

      const params: unknown[] = [];

      if (numCN) {
        sql += ` AND numCN = ?`;
        params.push(numCN);
      }

      if (dateFrom) {
        sql += ` AND date >= ?`;
        params.push(toDate(dateFrom));
      }

      if (dateTo) {
        sql += ` AND date <= ?`;
        params.push(`${dateTo} 23:59:59`);
      }

      sql += ` ORDER BY date DESC`;

      const [rows] = await db.query(sql, params);

      response.json(
        (rows as any[]).map((row) => ({
          ...row,
          quantity: numberValue(row.quantity),
          amount: numberValue(row.amount),
        }))
      );
    } catch (error) {
      next(error);
    }
  }
);

/* ============================================================
   BONS STATION
   ============================================================ */

router.post(
  '/bons-station',
  ...write,
  async (request, response, next) => {
    try {
      const input = bonSchema.parse(request.body);

      const [result] = await db.execute<ResultSetHeader>(
        `
          INSERT INTO bonsStation (
            date,
            montant
          )
          VALUES (?, ?)
        `,
        [
          toDate(input.date),
          Number(input.montant),
        ]
      );

      const [rows] = await db.query(
        `
          SELECT *
          FROM bonsStation
          WHERE id = ?
          LIMIT 1
        `,
        [result.insertId]
      );

      const row = (rows as any[])[0];

      response.status(201).json({
        ...row,
        montant: numberValue(row.montant),
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/bons-station',
  ...read,
  async (_request, response, next) => {
    try {
      const [rows] = await db.query(`
        SELECT *
        FROM bonsStation
        ORDER BY date DESC
      `);

      response.json(
        (rows as any[]).map((row) => ({
          ...row,
          montant: numberValue(row.montant),
        }))
      );
    } catch (error) {
      next(error);
    }
  }
);

export default router;