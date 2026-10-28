import { Router } from 'express';
import { query, queryOne } from '../../lib/db.js';
import { generatePDF } from '../../lib/pdf.js';
import { requireAuth } from '../../middleware/auth.js';
import { journalSchema, monthSchema } from './rapports.schema.js';

const router = Router();
const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const n = (value: unknown) => Number(value ?? 0);

async function journal(dateValue: string, equipeId: number, caisseId: number) {
  const date = toDate(dateValue);
  const [recette, depense, credit, carburant, boutique] = await Promise.all([
    queryOne('SELECT * FROM `RecetteCaisse` WHERE date = ? AND equipeId = ? AND caisseId = ?', [date, equipeId, caisseId]),
    queryOne('SELECT * FROM `DepensesCaisse` WHERE date = ? AND equipeId = ? AND caisseId = ?', [date, equipeId, caisseId]),
    queryOne('SELECT * FROM `CreditCaisse` WHERE date = ? AND equipeId = ? AND caisseId = ?', [date, equipeId, caisseId]),
    query('SELECT v.*, p.cuveId, c.libelle AS cuveLibelle FROM `MobVCarCaisse` v JOIN `Pompe` p ON p.id = v.pompeId JOIN `Cuve` c ON c.id = p.cuveId WHERE v.date = ? AND v.equipeId = ? AND v.caisseId = ?', [date, equipeId, caisseId]),
    query('SELECT s.*, p.familleId, f.libelle AS familleLibelle FROM `CarProdSiege` s JOIN `Produit` p ON p.id = s.produitId LEFT JOIN `FamilleProduit` f ON f.id = p.familleId WHERE s.date = ? AND s.equipeId = ? AND s.caisseId = ?', [date, equipeId, caisseId]),
  ]);
  const [recetteDetails, depenseDetails, creditDetails] = await Promise.all([
    recette ? query('SELECT d.*, m.libelle AS modeLibelle FROM `DetailRecetteCaisse` d JOIN `ModePayment` m ON m.id = d.modePaymentId WHERE d.numRecette = ?', [recette.id]) : [],
    depense ? query('SELECT d.*, t.typeDepense FROM `DetailDepenses` d JOIN `Depenses` t ON t.id = d.codeDepense WHERE d.numDepense = ?', [depense.id]) : [],
    credit ? query('SELECT d.*, c.nomClient FROM `DetailCredit` d JOIN `Client` c ON c.id = d.clientId WHERE d.numCredit = ?', [credit.id]) : [],
  ]);
  const recetteTotal = n(recette?.totalRecettes);
  const depenseTotal = n(depense?.totalDepenses);
  const creditTotal = n(credit?.totalCredits);
  return {
    date: dateValue,
    equipeId,
    caisseId,
    recettes: recetteDetails.map((x) => ({ mode: x.modeLibelle, montant: n(x.montant) })),
    depenses: depenseDetails.map((x) => ({ type: x.typeDepense, montant: n(x.montant), libelle: x.libelle })),
    credits: creditDetails.map((x) => ({ client: x.nomClient, montant: n(x.montant) })),
    ventesCarburant: carburant.map((x) => ({ cuve: x.cuveLibelle, ca: x.indexFermeture == null ? 0 : (n(x.indexFermeture) - n(x.indexOuverture)) * n(x.prixVente) })),
    ventesBoutique: boutique.map((x) => ({ famille: x.familleLibelle ?? x.codeFamille ?? 'Sans famille', ca: n(x.prixVenteTTC) * n(x.quantite) })),
    soldeNet: recetteTotal - depenseTotal - creditTotal,
    totaux: { recettes: recetteTotal, depenses: depenseTotal, credits: creditTotal },
  };
}

router.get('/rapports/journalier', requireAuth, async (request, response, next) => {
  try { const input = journalSchema.parse(request.query); response.json(await journal(input.date, input.equipeId, input.caisseId)); } catch (error) { next(error); }
});

router.get('/rapports/mensuel', requireAuth, async (request, response, next) => {
  try {
    const input = monthSchema.parse(request.query);
    const from = new Date(Date.UTC(input.annee, input.mois - 1, 1));
    const to = new Date(Date.UTC(input.annee, input.mois, 1));
    const [fuel, shop, fuelPurchases, productPurchases, expenses, payments] = await Promise.all([
      queryOne('SELECT COALESCE(SUM((indexFermeture - indexOuverture) * prixVente), 0) AS total FROM `MobVCarCaisse` WHERE date >= ? AND date < ? AND indexFermeture IS NOT NULL', [from, to]),
      queryOne('SELECT COALESCE(SUM(prixVenteTTC * quantite), 0) AS total, COALESCE(SUM(marge * quantite), 0) AS marge FROM `CarProdSiege` WHERE date >= ? AND date < ?', [from, to]),
      queryOne('SELECT COALESCE(SUM(d.quantite * d.prixUnitaire), 0) AS total FROM `AchatEssence` a JOIN `DetailAchatEssence` d ON d.achatId = a.id WHERE a.date >= ? AND a.date < ?', [from, to]),
      queryOne('SELECT COALESCE(SUM(totalTTC), 0) AS total FROM `AchatProd` WHERE dateAchat >= ? AND dateAchat < ?', [from, to]),
      queryOne('SELECT COALESCE(SUM(totalDepenses), 0) AS total FROM `DepensesCaisse` WHERE date >= ? AND date < ?', [from, to]),
      queryOne('SELECT COALESCE(SUM(montant), 0) AS total FROM `DetailReglements` WHERE date >= ? AND date < ? AND valide = ?', [from, to, true]),
    ]);
    response.json({
      mois: input.mois,
      annee: input.annee,
      caCarburant: n(fuel?.total),
      caBoutique: n(shop?.total),
      totalAchatsCarburant: n(fuelPurchases?.total),
      totalAchatsProduits: n(productPurchases?.total),
      totalDepenses: n(expenses?.total),
      totalReglementsRecus: n(payments?.total),
      margeBrute: n(shop?.marge),
    });
  } catch (error) { next(error); }
});

router.get('/rapports/stock-cuves', requireAuth, async (_request, response, next) => {
  try {
    const rows = await query('SELECT c.*, COALESCE(a.achats, 0) AS achats FROM `Cuve` c LEFT JOIN (SELECT cuveId, SUM(quantite) AS achats FROM `DetailAchatEssence` GROUP BY cuveId) a ON a.cuveId = c.id');
    response.json(rows.map((row) => {
      const stock = n(row.stockInitial) + n(row.achats);
      return { id: row.id, libelle: row.libelle, stock, volumeTotal: n(row.volumeTotal), valeurStock: stock * n(row.seuilAlerte), alerte: stock < n(row.volumeTotal) * 0.2 };
    }));
  } catch (error) { next(error); }
});

router.get('/rapports/clients-soldes', requireAuth, async (_request, response, next) => {
  try {
    const rows = await query('SELECT c.id, c.nomClient, c.soldeAnterieur + COALESCE(cr.credits, 0) - COALESCE(p.paiements, 0) AS solde FROM `Client` c LEFT JOIN (SELECT clientId, SUM(montant) AS credits FROM `DetailCredit` GROUP BY clientId) cr ON cr.clientId = c.id LEFT JOIN (SELECT clientId, SUM(montant) AS paiements FROM `DetailReglements` WHERE valide = ? GROUP BY clientId) p ON p.clientId = c.id', [true]);
    response.json(rows.map((row) => ({ ...row, solde: n(row.solde) })).filter((row) => row.solde > 0).sort((a, b) => b.solde - a.solde));
  } catch (error) { next(error); }
});

router.get('/rapports/fournisseurs-soldes', requireAuth, async (_request, response, next) => {
  try {
    const rows = await query('SELECT f.id, f.raisonSociale, COALESCE(a.totalAchats, 0) AS totalAchats, COALESCE(r.totalRegle, 0) AS totalRegle FROM `Fournisseur` f LEFT JOIN (SELECT a.fournisseurId, SUM(d.quantite * d.prixUnitaire) AS totalAchats FROM `AchatEssence` a JOIN `DetailAchatEssence` d ON d.achatId = a.id GROUP BY a.fournisseurId) a ON a.fournisseurId = f.id LEFT JOIN (SELECT r.fournisseurId, SUM(d.montant) AS totalRegle FROM `RegFour` r JOIN `DetailRegFour` d ON d.regFourId = r.id GROUP BY r.fournisseurId) r ON r.fournisseurId = f.id');
    response.json(rows.map((row) => ({ id: row.id, raisonSociale: row.raisonSociale, totalAchats: n(row.totalAchats), totalRegle: n(row.totalRegle), reste: n(row.totalAchats) - n(row.totalRegle) })).filter((row) => row.reste > 0));
  } catch (error) { next(error); }
});

const reportHtml = (title: string, data: unknown) => `<html><body style="font-family:Arial"><h1>${title}</h1><pre>${JSON.stringify(data, null, 2)}</pre></body></html>`;
router.post('/rapports/journalier/pdf', requireAuth, async (request, response, next) => {
  try {
    const input = journalSchema.parse(request.body);
    const [data, settings] = await Promise.all([journal(input.date, input.equipeId, input.caisseId), queryOne('SELECT nomStation FROM `SetParam` WHERE id = ?', [1])]);
    const pdf = await generatePDF(reportHtml(settings?.nomStation ?? 'Station Service', data));
    response.type('application/pdf').send(pdf);
  } catch (error) { next(error); }
});

router.post('/rapports/facture/:id/pdf', requireAuth, async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const invoice = await queryOne('SELECT f.*, c.nomClient FROM `Facture` f JOIN `Client` c ON c.id = f.clientId WHERE f.id = ?', [id]);
    if (!invoice) { response.status(404).json({ message: 'Facture introuvable.' }); return; }
    const lignes = await query('SELECT d.*, p.code AS produitCode, p.libelle AS produitLibelle FROM `Detfact` d JOIN `Produit` p ON p.id = d.idProduit WHERE d.factureId = ? ORDER BY d.numLigne', [id]);
    const pdf = await generatePDF(reportHtml(`Facture ${invoice.id} - ${invoice.nomClient}`, { ...invoice, client: { id: invoice.clientId, nomClient: invoice.nomClient }, lignes }));
    response.type('application/pdf').send(pdf);
  } catch (error) { next(error); }
});

export default router;
