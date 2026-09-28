import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { db } from '../../lib/db.js';
import { generatePDF } from '../../lib/pdf.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  journalSchema,
  monthSchema,
  rangeSchema,
} from './rapports.schema.js';

const router = Router();

const toDate = (value: string) => `${value} 00:00:00`;

const monthBounds = (month: number, year: number) => {
  const from = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const to = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01 00:00:00`;

  return { from, to };
};

const n = (
  value: string | number | bigint | null | undefined,
): number => {
  if (value == null) return 0;
  return Number(value);
};

interface GenericRow extends RowDataPacket {
  [key: string]: any;
}

/**
 * Rapport journalier
 */
async function journal(
  dateValue: string,
  equipeId: number,
  caisseId: number,
) {
  const date = toDate(dateValue);
  const nextDate = (() => {
    const d = new Date(`${dateValue}T00:00:00`);
    d.setDate(d.getDate() + 1);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day} 00:00:00`;
  })();

  const [
    recettesResult,
    depensesResult,
    creditsResult,
    carburantResult,
    boutiqueResult,
  ] = await Promise.all([
    db.query<GenericRow[]>(
      `
        SELECT *
        FROM recetteCaisse
        WHERE date = ?
          AND equipeId = ?
          AND caisseId = ?
        LIMIT 1
      `,
      [date, equipeId, caisseId],
    ),

    db.query<GenericRow[]>(
      `
        SELECT *
        FROM depensesCaisse
        WHERE date = ?
          AND equipeId = ?
          AND caisseId = ?
        LIMIT 1
      `,
      [date, equipeId, caisseId],
    ),

    db.query<GenericRow[]>(
      `
        SELECT *
        FROM creditCaisse
        WHERE date = ?
          AND equipeId = ?
          AND caisseId = ?
        LIMIT 1
      `,
      [date, equipeId, caisseId],
    ),

    db.query<GenericRow[]>(
      `
        SELECT
          m.*,
          p.id AS pompe_id,
          p.libelle AS pompe_libelle,
          c.id AS cuve_id,
          c.libelle AS cuve_libelle
        FROM mobVCarCaisse m
        LEFT JOIN pompe p
          ON p.id = m.pompeId
        LEFT JOIN cuve c
          ON c.id = p.cuveId
        WHERE m.date >= ?
          AND m.date < ?
          AND m.equipeId = ?
          AND m.caisseId = ?
      `,
      [date, nextDate, equipeId, caisseId],
    ),

    db.query<GenericRow[]>(
      `
        SELECT
          cps.*,
          p.id AS produit_id,
          p.libelle AS produit_libelle,
          f.id AS famille_id,
          f.libelle AS famille_libelle
        FROM carProdSiege cps
        LEFT JOIN produit p
          ON p.id = cps.produitId
        LEFT JOIN FamilleProduit f
          ON f.id = p.familleId
        WHERE cps.date >= ?
          AND cps.date < ?
          AND cps.equipeId = ?
          AND cps.caisseId = ?
      `,
      [date, nextDate, equipeId, caisseId],
    ),
  ]);

  const recettes = recettesResult[0][0] ?? null;
  const depenses = depensesResult[0][0] ?? null;
  const credits = creditsResult[0][0] ?? null;
  const carburant = carburantResult[0];
  const boutique = boutiqueResult[0];

  let recetteDetails: GenericRow[] = [];
  let depenseDetails: GenericRow[] = [];
  let creditDetails: GenericRow[] = [];

  if (recettes) {
    const [rows] = await db.query<GenericRow[]>(
      `
        SELECT
          d.*,
          mp.id AS modePayment_id,
          mp.libelle AS modePayment_libelle
        FROM detailRecetteCaisse d
        LEFT JOIN modePayment mp
          ON mp.id = d.modePaymentId
        WHERE d.numRecette = ?
      `,
      [recettes.id],
    );

    recetteDetails = rows;
  }

  if (depenses) {
    const [rows] = await db.query<GenericRow[]>(
      `
        SELECT
          d.*,
          t.id AS type_id,
          t.typeDepense AS type_typeDepense
        FROM DetailDepenses d
        LEFT JOIN Depenses t
          ON t.id = d.codeDepense
        WHERE d.numDepense = ?
      `,
      [depenses.id],
    );

    depenseDetails = rows;
  }

  if (credits) {
    const [rows] = await db.query<GenericRow[]>(
      `
        SELECT
          d.*,
          c.id AS client_id,
          c.nomClient AS client_nomClient
        FROM DetailCredit d
        LEFT JOIN client c
          ON c.id = d.clientId
        WHERE d.numCredit = ?
      `,
      [credits.id],
    );

    creditDetails = rows;
  }

  const recetteTotal = n(recettes?.totalRecettes);
  const depenseTotal = n(depenses?.totalDepenses);
  const creditTotal = n(credits?.totalCredits);

  return {
    date: dateValue,
    equipeId,
    caisseId,

    recettes: recetteDetails.map((x) => ({
      mode: x.modePayment_libelle,
      montant: n(x.montant),
    })),

    depenses: depenseDetails.map((x) => ({
      type: x.type_typeDepense,
      montant: n(x.montant),
      libelle: x.libelle,
    })),

    credits: creditDetails.map((x) => ({
      client: x.client_nomClient,
      montant: n(x.montant),
    })),

    ventesCarburant: carburant.map((x) => ({
      cuve: x.cuve_libelle,
      ca:
        (n(x.indexFermeture) - n(x.indexOuverture)) *
        n(x.prixVente),
    })),

    ventesBoutique: boutique.map((x) => ({
      famille:
        x.famille_libelle ??
        x.codeFamille ??
        'Sans famille',
      ca: n(x.prixVenteTTC) * n(x.quantite),
    })),

    soldeNet:
      recetteTotal -
      depenseTotal -
      creditTotal,

    totaux: {
      recettes: recetteTotal,
      depenses: depenseTotal,
      credits: creditTotal,
    },
  };
}

/**
 * GET /rapports/journalier
 */
router.get(
  '/rapports/journalier',
  requireAuth,
  async (request, response, next) => {
    try {
      const input = journalSchema.parse(request.query);

      response.json(
        await journal(
          input.date,
          input.equipeId,
          input.caisseId,
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /rapports/mensuel
 */
router.get(
  '/rapports/mensuel',
  requireAuth,
  async (request, response, next) => {
    try {
      const input = monthSchema.parse(request.query);

      const range = monthBounds(
        input.mois,
        input.annee,
      );

      const [
        fuelResult,
        shopResult,
        fuelPurchasesResult,
        productPurchasesResult,
        expensesResult,
        paymentsResult,
      ] = await Promise.all([
        db.query<GenericRow[]>(
          `
            SELECT *
            FROM mobVCarCaisse
            WHERE date >= ?
              AND date < ?
              AND indexFermeture IS NOT NULL
          `,
          [range.from, range.to],
        ),

        db.query<GenericRow[]>(
          `
            SELECT *
            FROM carProdSiege
            WHERE date >= ?
              AND date < ?
          `,
          [range.from, range.to],
        ),

        db.query<GenericRow[]>(
          `
            SELECT *
            FROM achatEssence
            WHERE date >= ?
              AND date < ?
          `,
          [range.from, range.to],
        ),

        db.query<GenericRow[]>(
          `
            SELECT *
            FROM achatProd
            WHERE dateAchat >= ?
              AND dateAchat < ?
          `,
          [range.from, range.to],
        ),

        db.query<GenericRow[]>(
          `
            SELECT *
            FROM depensesCaisse
            WHERE date >= ?
              AND date < ?
          `,
          [range.from, range.to],
        ),

        db.query<GenericRow[]>(
          `
            SELECT COALESCE(SUM(montant), 0) AS total
            FROM detailReglements
            WHERE date >= ?
              AND date < ?
              AND valide = 1
          `,
          [range.from, range.to],
        ),
      ]);

      const fuel = fuelResult[0];
      const shop = shopResult[0];
      const fuelPurchases = fuelPurchasesResult[0];
      const productPurchases = productPurchasesResult[0];
      const expenses = expensesResult[0];

      const caCarburant = fuel.reduce(
        (sum, x) =>
          sum +
          (n(x.indexFermeture) - n(x.indexOuverture)) *
            n(x.prixVente),
        0,
      );

      const caBoutique = shop.reduce(
        (sum, x) =>
          sum +
          n(x.prixVenteTTC) *
            n(x.quantite),
        0,
      );

      let achatsCarburant = 0;

      if (fuelPurchases.length > 0) {
        const ids = fuelPurchases.map((x) => x.id);
        const placeholders = ids.map(() => '?').join(',');

        const [details] = await db.query<GenericRow[]>(
          `
            SELECT quantite, prixUnitaire
            FROM detailAchatEssence
            WHERE achatEssenceId IN (${placeholders})
          `,
          ids,
        );

        achatsCarburant = details.reduce(
          (sum, detail) =>
            sum +
            n(detail.quantite) *
              n(detail.prixUnitaire),
          0,
        );
      }

      const achatsProduits = productPurchases.reduce(
        (sum, x) =>
          sum + n(x.totalTTC),
        0,
      );

      const totalDepenses = expenses.reduce(
        (sum, x) =>
          sum + n(x.totalDepenses),
        0,
      );

      const margeBrute = shop.reduce(
        (sum, x) =>
          sum +
          n(x.marge) *
            n(x.quantite),
        0,
      );

      const totalReglementsRecus = n(
        paymentsResult[0][0]?.total,
      );

      response.json({
        mois: input.mois,
        annee: input.annee,
        caCarburant,
        caBoutique,
        totalAchatsCarburant: achatsCarburant,
        totalAchatsProduits: achatsProduits,
        totalDepenses,
        totalReglementsRecus,
        margeBrute,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /rapports/stock-cuves
 */
router.get(
  '/rapports/stock-cuves',
  requireAuth,
  async (_request, response, next) => {
    try {
      const [rows] = await db.query<GenericRow[]>(
        `
          SELECT *
          FROM cuve
        `,
      );

      const result = await Promise.all(
        rows.map(async (row) => {
          const [achats] = await db.query<GenericRow[]>(
            `
              SELECT COALESCE(SUM(quantite), 0) AS total
              FROM detailAchatEssence
              WHERE cuveId = ?
            `,
            [row.id],
          );

          /*
           * Dans l'ancien code Prisma :
           *
           * const sorties = row.pompes.reduce(...)
           *
           * Cela ne soustrayait en réalité aucune sortie.
           * On conserve donc exactement le même comportement.
           */
          const sorties = 0;

          const quantiteAchats = n(
            achats[0]?.total,
          );

          const stock =
            n(row.stockInitial) +
            quantiteAchats -
            sorties;

          return {
            id: row.id,
            libelle: row.libelle,
            stock,
            volumeTotal: n(row.volumeTotal),
            valeurStock:
              stock *
              n(row.seuilAlerte),
            alerte:
              stock <
              n(row.volumeTotal) * 0.2,
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
 * GET /rapports/clients-soldes
 */
router.get(
  '/rapports/clients-soldes',
  requireAuth,
  async (_request, response, next) => {
    try {
      const [clients] = await db.query<GenericRow[]>(
        `
          SELECT *
          FROM client
        `,
      );

      const result = await Promise.all(
        clients.map(async (client) => {
          const [credits] = await db.query<GenericRow[]>(
            `
              SELECT COALESCE(SUM(montant), 0) AS total
              FROM detailCredit
              WHERE clientId = ?
            `,
            [client.id],
          );

          const [payments] = await db.query<GenericRow[]>(
            `
              SELECT COALESCE(SUM(montant), 0) AS total
              FROM detailReglements
              WHERE clientId = ?
                AND valide = 1
            `,
            [client.id],
          );

          const solde =
            n(client.soldeAnterieur) +
            n(credits[0]?.total) -
            n(payments[0]?.total);

          return {
            id: client.id,
            nomClient: client.nomClient,
            solde,
          };
        }),
      );

      response.json(
        result
          .filter((x) => x.solde > 0)
          .sort((a, b) => b.solde - a.solde),
      );
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /rapports/fournisseurs-soldes
 */
router.get(
  '/rapports/fournisseurs-soldes',
  requireAuth,
  async (_request, response, next) => {
    try {
      const [fournisseurs] =
        await db.query<GenericRow[]>(
          `
            SELECT *
            FROM fournisseur
          `,
        );

      const result = await Promise.all(
        fournisseurs.map(async (fournisseur) => {
          const [achats] =
            await db.query<GenericRow[]>(
              `
                SELECT
                  COALESCE(
                    SUM(
                      d.quantite *
                      d.prixUnitaire
                    ),
                    0
                  ) AS total
                FROM achatEssence a
                INNER JOIN detailAchatEssence d
                  ON d.achatId = a.id
                WHERE a.fournisseurId = ?
              `,
              [fournisseur.id],
            );

          const [reglements] =
            await db.query<GenericRow[]>(
              `
                SELECT
                  COALESCE(
                    SUM(d.montant),
                    0
                  ) AS total
                FROM regFour r
                INNER JOIN detailRegFour d
                  ON d.regFourId = r.id
                WHERE r.fournisseurId = ?
              `,
              [fournisseur.id],
            );

          const totalAchats =
            n(achats[0]?.total);

          const totalRegle =
            n(reglements[0]?.total);

          return {
            id: fournisseur.id,
            raisonSociale:
              fournisseur.raisonSociale,
            totalAchats,
            totalRegle,
            reste:
              totalAchats -
              totalRegle,
          };
        }),
      );

      response.json(
        result.filter((x) => x.reste > 0),
      );
    } catch (error) {
      next(error);
    }
  },
);

/**
 * HTML utilisé pour la génération PDF
 */
const reportHtml = (
  title: string,
  data: unknown,
) => `
  <html>
    <body style="font-family:Arial">
      <h1>${title}</h1>
      <pre>${JSON.stringify(data, null, 2)}</pre>
    </body>
  </html>
`;

/**
 * POST /rapports/journalier/pdf
 */
router.post(
  '/rapports/journalier/pdf',
  requireAuth,
  async (request, response, next) => {
    try {
      const input =
        journalSchema.parse(request.body);

      const data = await journal(
        input.date,
        input.equipeId,
        input.caisseId,
      );

      const [settings] =
        await db.query<GenericRow[]>(
          `
            SELECT *
            FROM setParam
            WHERE id = 1
            LIMIT 1
          `,
        );

      const pdf = await generatePDF(
        reportHtml(
          settings[0]?.nomStation ??
            'Station Service',
          data,
        ),
      );

      response
        .type('application/pdf')
        .send(pdf);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /rapports/facture/:id/pdf
 */
router.post(
  '/rapports/facture/:id/pdf',
  requireAuth,
  async (request, response, next) => {
    try {
      const invoiceId =
        Number(request.params.id);

      const [invoices] =
        await db.query<GenericRow[]>(
          `
            SELECT
              f.*,
              c.id AS client_id,
              c.nomClient AS client_nomClient
            FROM facture f
            LEFT JOIN client c
              ON c.id = f.clientId
            WHERE f.id = ?
            LIMIT 1
          `,
          [invoiceId],
        );

      if (!invoices.length) {
        response.status(404).json({
          message: 'Facture introuvable.',
        });
        return;
      }

      const invoice = invoices[0];

      const [lignes] =
        await db.query<GenericRow[]>(
          `
            SELECT
              lf.*,
              p.id AS produit_id,
              p.libelle AS produit_libelle
            FROM Detfact lf
            LEFT JOIN produit p
              ON p.id = lf.idProduit
            WHERE lf.factureId = ?
            ORDER BY lf.id ASC
          `,
          [invoiceId],
        );

      const invoiceData = {
        ...invoice,
        client: {
          id: invoice.client_id,
          nomClient:
            invoice.client_nomClient,
        },
        lignes: lignes.map((ligne) => ({
          ...ligne,
          produit: {
            id: ligne.produit_id,
            libelle:
              ligne.produit_libelle,
          },
        })),
      };

      const pdf = await generatePDF(
        reportHtml(
          `Facture ${invoice.id} - ${
            invoice.client_nomClient ??
            ''
          }`,
          invoiceData,
        ),
      );

      response
        .type('application/pdf')
        .send(pdf);
    } catch (error) {
      next(error);
    }
  },
);

export default router;