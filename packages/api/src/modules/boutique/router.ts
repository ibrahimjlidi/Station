import { Router } from 'express';

import { db } from '../../lib/db.js';

import {
  requireAuth,
  requireRole,
  type AuthRequest,
} from '../../middleware/auth.js';

import {
  achatSchema,
  familleSchema,
  filterSchema,
  inventSchema,
  produitSchema,
  transfertSchema,
} from './boutique.schema.js';

const router = Router();

const read = [requireAuth];

const cashier = [
  requireAuth,
  requireRole('caissier', 'gerant'),
];

const manager = [
  requireAuth,
  requireRole('gerant'),
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
 * PRODUITS
 * ============================================================
 */

/**
 * GET /produits
 */
router.get(
  '/produits',
  ...read,
  async (_request, response, next) => {
    try {
      const familleId = _request.query.familleId
        ? Number(_request.query.familleId)
        : undefined;

      let sql = `
        SELECT
          p.*,

          f.id AS famille_id,
          f.libelle AS famille_libelle,

          fr.id AS fournisseur_id,
          fr.libelle AS fournisseur_libelle

        FROM produit p

        LEFT JOIN familleProduit f
          ON f.id = p.familleId

        LEFT JOIN fournisseur fr
          ON fr.id = p.fournisseurId

        WHERE p.actif = 1
      `;

      const params: any[] = [];

      if (familleId !== undefined) {
        sql += ` AND p.familleId = ? `;
        params.push(familleId);
      }

      sql += `
        ORDER BY p.libelle ASC
      `;

      const [rows] = await db.query(
        sql,
        params
      );

      const products = (
        rows as any[]
      ).map((product) => ({
        ...product,

        famille: product.famille_id
          ? {
              id: product.famille_id,
              libelle:
                product.famille_libelle,
            }
          : null,

        fournisseur:
          product.fournisseur_id
            ? {
                id:
                  product.fournisseur_id,
                libelle:
                  product.fournisseur_libelle,
              }
            : null,

        prixAchatHT: numberValue(
          product.prixAchatHT
        ),

        prixVenteHT: numberValue(
          product.prixVenteHT
        ),

        tva: numberValue(
          product.tva
        ),

        tauxTVA: numberValue(
          product.tauxTVA
        ),

        stock: numberValue(
          product.stock
        ),
      }));

      response.json(products);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /produits
 */
router.post(
  '/produits',
  ...manager,
  async (request, response, next) => {
    try {
      const input =
        produitSchema.parse(
          request.body
        );

      const [result] = await db.query(
        `
        INSERT INTO produit
        (
          libelle,
          code,
          familleId,
          fournisseurId,
          prixAchatHT,
          prixVenteHT,
          tva,
          tauxTVA,
          stock,
          actif
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `,
        [
          input.libelle,
          input.code ?? null,
          input.familleId ?? null,
          input.fournisseurId ?? null,
          input.prixAchatHT,
          input.prixVenteHT,
          input.tauxTVA,
          input.tauxTVA,
          input.stock ?? 0,
        ]
      );

      const insertResult =
        result as any;

      const [rows] = await db.query(
        `
        SELECT *
        FROM produit
        WHERE id = ?
        LIMIT 1
        `,
        [insertResult.insertId]
      );

      const product =
        (rows as any[])[0];

      response.status(201).json({
        ...product,

        prixAchatHT: numberValue(
          product.prixAchatHT
        ),

        prixVenteHT: numberValue(
          product.prixVenteHT
        ),

        tva: numberValue(
          product.tva
        ),

        tauxTVA: numberValue(
          product.tauxTVA
        ),

        stock: numberValue(
          product.stock
        ),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /produits/:id
 */
router.put(
  '/produits/:id',
  ...manager,
  async (request, response, next) => {
    try {
      const id = Number(
        request.params.id
      );

      const input =
        produitSchema
          .partial()
          .parse(request.body);

      const fields: string[] = [];
      const values: any[] = [];

      if (
        input.libelle !== undefined
      ) {
        fields.push(
          'libelle = ?'
        );
        values.push(input.libelle);
      }

      if (
        input.code !== undefined
      ) {
        fields.push(
          'code = ?'
        );
        values.push(input.code);
      }

      if (
        input.familleId !== undefined
      ) {
        fields.push(
          'familleId = ?'
        );
        values.push(
          input.familleId
        );
      }

      if (
        input.fournisseurId !==
        undefined
      ) {
        fields.push(
          'fournisseurId = ?'
        );
        values.push(
          input.fournisseurId
        );
      }

      if (
        input.prixAchatHT !==
        undefined
      ) {
        fields.push(
          'prixAchatHT = ?'
        );
        values.push(
          input.prixAchatHT
        );
      }

      if (
        input.prixVenteHT !==
        undefined
      ) {
        fields.push(
          'prixVenteHT = ?'
        );
        values.push(
          input.prixVenteHT
        );
      }

      if (
        input.tauxTVA !==
        undefined
      ) {
        fields.push(
          'tauxTVA = ?'
        );

        fields.push(
          'tva = ?'
        );

        values.push(
          input.tauxTVA,
          input.tauxTVA
        );
      }

      if (
        input.stock !== undefined
      ) {
        fields.push(
          'stock = ?'
        );

        values.push(
          input.stock
        );
      }

      if (
        input.actif !== undefined
      ) {
        fields.push(
          'actif = ?'
        );

        values.push(
          input.actif
        );
      }

      if (fields.length === 0) {
        response.status(400).json({
          message:
            'Aucune donnée à modifier.',
        });

        return;
      }

      values.push(id);

      await db.query(
        `
        UPDATE produit
        SET ${fields.join(', ')}
        WHERE id = ?
        `,
        values
      );

      const [rows] =
        await db.query(
          `
          SELECT *
          FROM produit
          WHERE id = ?
          LIMIT 1
          `,
          [id]
        );

      const product =
        (rows as any[])[0];

      if (!product) {
        response.status(404).json({
          message:
            'Produit introuvable.',
        });

        return;
      }

      response.json({
        ...product,

        prixAchatHT: numberValue(
          product.prixAchatHT
        ),

        prixVenteHT: numberValue(
          product.prixVenteHT
        ),

        tva: numberValue(
          product.tva
        ),

        tauxTVA: numberValue(
          product.tauxTVA
        ),

        stock: numberValue(
          product.stock
        ),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ============================================================
 * FAMILLES
 * ============================================================
 */

/**
 * GET /familles-produits
 */
router.get(
  '/familles-produits',
  ...read,
  async (_request, response, next) => {
    try {
      const [rows] =
        await db.query(`
          SELECT *
          FROM familleProduit
          ORDER BY libelle ASC
        `);

      response.json(rows);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /familles-produits
 */
router.post(
  '/familles-produits',
  ...manager,
  async (request, response, next) => {
    try {
      const input =
        familleSchema.parse(
          request.body
        );

      const [result] =
        await db.query(
          `
          INSERT INTO familleProduit
          SET ?
          `,
          input
        );

      const insertResult =
        result as any;

      const [rows] =
        await db.query(
          `
          SELECT *
          FROM familleProduit
          WHERE id = ?
          LIMIT 1
          `,
          [
            insertResult.insertId,
          ]
        );

      response.status(201).json(
        (rows as any[])[0]
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ============================================================
 * ACHATS PRODUITS
 * ============================================================
 */

/**
 * POST /achats-produits
 */
router.post(
  '/achats-produits',
  ...cashier,
  async (
    request: AuthRequest,
    response,
    next
  ) => {
    const connection =
      await db.getConnection();

    try {
      const input =
        achatSchema.parse(
          request.body
        );

      /**
       * Vérifier les produits
       */
      const productIds =
        input.lignes.map(
          (line) =>
            line.produitId
        );

      const placeholders =
        productIds
          .map(() => '?')
          .join(', ');

      const [
        productRows,
      ] = await connection.query(
        `
        SELECT *
        FROM produit
        WHERE id IN (${placeholders})
        AND actif = 1
        `,
        productIds
      );

      const products =
        productRows as any[];

      if (
        products.length !==
        new Set(productIds).size
      ) {
        response.status(400).json({
          message:
            'Un produit est introuvable ou inactif.',
        });

        return;
      }

      /**
       * Totaux
       */
      const totalHT =
        input.lignes.reduce(
          (
            sum,
            line
          ) =>
            sum +
            line.quantite *
              line.prixAchat,
          0
        );

      const totalTTC =
        input.lignes.reduce(
          (
            sum,
            line
          ) =>
            sum +
            line.quantite *
              line.prixAchat *
              (1 +
                line.tauxTVA /
                  100),
          0
        );

      await connection.beginTransaction();

      /**
       * Créer achat
       */
      const [
        purchaseResult,
      ] = await connection.query(
        `
        INSERT INTO achatProd
        (
          magasinId,
          fournisseurId,
          dateAchat,
          dateFacture,
          numFacture,
          totalTTC,
          totHT,
          valide
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          request.user?.magasinId ??
            null,
          input.fournisseurId ??
            null,
          toDate(
            input.dateAchat
          ),
          input.dateFacture
            ? toDate(
                input.dateFacture
              )
            : null,
          input.numFacture ??
            null,
          totalTTC,
          totalHT,
          input.valide,
        ]
      );

      const purchaseId =
        (purchaseResult as any)
          .insertId;

      /**
       * Créer détails + mettre stock
       */
      for (const line of
        input.lignes) {
        await connection.query(
          `
          INSERT INTO DetailAchatProd
          (
            achatProdId,
            produitId,
            date,
            quantite,
            prixAchat,
            tauxTVA,
            valide
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [
            purchaseId,
            line.produitId,
            toDate(
              input.dateAchat
            ),
            line.quantite,
            line.prixAchat,
            line.tauxTVA,
            input.valide,
          ]
        );

        await connection.query(
          `
          UPDATE produit
          SET
            stock = COALESCE(stock, 0) + ?,
            prixAchatHT = ?
          WHERE id = ?
          `,
          [
            line.quantite,
            line.prixAchat,
            line.produitId,
          ]
        );
      }

      await connection.commit();

      /**
       * Retourner achat
       */
      const [
        purchaseRows,
      ] = await db.query(
        `
        SELECT *
        FROM achatProd
        WHERE id = ?
        LIMIT 1
        `,
        [purchaseId]
      );

      const purchase =
        (purchaseRows as any[])[0];

      const [
        detailRows,
      ] = await db.query(
        `
        SELECT *
        FROM DetailAchatProd
        WHERE achatProdId = ?
        `,
        [purchaseId]
      );

      response.status(201).json({
        ...purchase,

        totalTTC: numberValue(
          purchase.totalTTC
        ),

        totHT: numberValue(
          purchase.totHT
        ),

        details: detailRows,
      });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  }
);

/**
 * GET /achats-produits
 */
router.get(
  '/achats-produits',
  ...read,
  async (
    request: AuthRequest,
    response,
    next
  ) => {
    try {
      const filter =
        filterSchema.parse(
          request.query
        );

      const conditions: string[] = [];

      const params: any[] = [];

      /**
       * Magasin
       */
      if (
        request.user?.magasinId !==
          null &&
        request.user?.magasinId !==
          undefined
      ) {
        conditions.push(
          'a.magasinId = ?'
        );

        params.push(
          request.user.magasinId
        );
      }

      /**
       * Fournisseur
       */
      if (
        filter.fournisseurId !==
        undefined
      ) {
        conditions.push(
          'a.fournisseurId = ?'
        );

        params.push(
          filter.fournisseurId
        );
      }

      /**
       * Date début
       */
      if (filter.dateFrom) {
        conditions.push(
          'a.dateAchat >= ?'
        );

        params.push(
          toDate(
            filter.dateFrom
          )
        );
      }

      /**
       * Date fin
       */
      if (filter.dateTo) {
        const dateTo =
          toDate(filter.dateTo);

        dateTo.setUTCDate(
          dateTo.getUTCDate() + 1
        );

        conditions.push(
          'a.dateAchat < ?'
        );

        params.push(dateTo);
      }

      const where =
        conditions.length
          ? `WHERE ${conditions.join(
              ' AND '
            )}`
          : '';

      const [
        purchaseRows,
      ] = await db.query(
        `
        SELECT
          a.*,

          f.id AS fournisseur_id,
          f.libelle AS fournisseur_libelle

        FROM achatProd a

        LEFT JOIN fournisseur f
          ON f.id = a.fournisseurId

        ${where}

        ORDER BY
          a.dateAchat DESC
        `,
        params
      );

      const purchases =
        purchaseRows as any[];

      const result = [];

      for (const purchase of
        purchases) {
        const [
          detailRows,
        ] = await db.query(
          `
          SELECT
            d.*,

            p.id AS produit_id,
            p.libelle AS produit_libelle

          FROM DetailAchatProd d

          LEFT JOIN produit p
            ON p.id = d.produitId

          WHERE d.achatProdId = ?
          `,
          [purchase.id]
        );

        result.push({
          ...purchase,

          totalTTC: numberValue(purchase.totalTTC),
          totHT: numberValue(purchase.totHT),

          fournisseur: {
            id: purchase.fournisseur_id,
            libelle: purchase.fournisseur_libelle,
          },

          details: (detailRows as any[]).map((line) => ({
            ...line,
            prixAchat: numberValue(line.prixAchat),
            produit: {
              id: line.produit_id,
              libelle: line.produit_libelle,
            },
          })),
        });
      }

      response.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;