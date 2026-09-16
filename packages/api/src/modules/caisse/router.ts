import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole, scopeToMagasin } from '../../middleware/auth.js';
import { clotureSchema, creditLineSchema, depenseLineSchema, recetteLineSchema, sessionSchema, summaryParamsSchema, type SessionInput } from './caisse.schema.js';

const router = Router();
const caisseAccess = [requireAuth, requireRole('caissier', 'gerant')];

const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const toNumber = (value: Prisma.Decimal | number | null | undefined) => value == null ? null : Number(value);

async function ensureOpen(date: Date, equipeId: number) {
  const closure = await prisma.joursClotures.findUnique({ where: { dateJour_equipeId: { dateJour: date, equipeId } } });
  if (closure?.fait) {
    const error = new Error('Cette equipe est deja cloturee pour cette date.') as Error & { statusCode?: number };
    error.statusCode = 409;
    throw error;
  }
}

async function ensureSessionReferences(input: SessionInput) {
  const [equipe, caisse, vendeur] = await Promise.all([
    prisma.equipe.findUnique({ where: { id: input.equipeId } }),
    prisma.caisse.findUnique({ where: { id: input.caisseId } }),
    prisma.vendeur.findUnique({ where: { id: input.vendeurId } }),
  ]);
  if (!equipe || !equipe.actif || !caisse || !caisse.actif || !vendeur || !vendeur.actif) {
    const error = new Error('Equipe, caisse ou vendeur invalide/inactif.') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
}

const sessionWhere = (input: SessionInput) => ({ date_equipeId_caisseId: { date: toDate(input.date), equipeId: input.equipeId, caisseId: input.caisseId } });

router.get('/modes-payment', ...caisseAccess, async (_request, response, next) => {
  try { response.json(await prisma.modePayment.findMany({ orderBy: { libelle: 'asc' } })); } catch (error) { next(error); }
});

router.get('/types-depenses', ...caisseAccess, async (_request, response, next) => {
  try { response.json(await prisma.depenses.findMany({ orderBy: { typeDepense: 'asc' } })); } catch (error) { next(error); }
});

router.get('/clients', ...caisseAccess, async (_request, response, next) => {
  try { response.json(await prisma.client.findMany({ orderBy: { nomClient: 'asc' } })); } catch (error) { next(error); }
});

router.post('/recettes', ...caisseAccess, async (request, response, next) => {
  try {
    const input = sessionSchema.parse(request.body);
    const date = toDate(input.date);
    await ensureOpen(date, input.equipeId);
    await ensureSessionReferences(input);
    const cuves = await prisma.cuve.findMany({ where: { magasinId: request.user?.magasinId } });
    const reserveDepart = cuves.reduce((total, cuve) => total.plus(cuve.stock.times(cuve.prixAchatHT)), new Prisma.Decimal(0));
    const session = await prisma.recetteCaisse.upsert({ where: sessionWhere(input), create: { date, equipeId: input.equipeId, caisseId: input.caisseId, vendeurId: input.vendeurId, magasinId: request.user?.magasinId, reserveDepart }, update: { vendeurId: input.vendeurId } });
    response.status(201).json({ ...session, totalRecettes: toNumber(session.totalRecettes) });
  } catch (error) { next(error); }
});

router.post('/recettes/:id/lignes', ...caisseAccess, async (request, response, next) => {
  try {
    const recetteId = Number(request.params.id);
    const input = recetteLineSchema.parse(request.body);
    const recette = await prisma.recetteCaisse.findUnique({ where: { id: recetteId } });
    if (!recette) { response.status(404).json({ message: 'Session de recettes introuvable.' }); return; }
    await ensureOpen(recette.date, recette.equipeId);
    if (recette.fait) { response.status(409).json({ message: 'La session de recettes est deja validee.' }); return; }
    const line = await prisma.$transaction(async (transaction) => {
      const created = await transaction.detailRecetteCaisse.create({ data: { numRecette: recetteId, modePaymentId: input.modePaymentId, montant: new Prisma.Decimal(input.montant), numero: input.numero, idCuve: input.idCuve } });
      await transaction.recetteCaisse.update({ where: { id: recetteId }, data: { totalRecettes: { increment: new Prisma.Decimal(input.montant) } } });
      return created;
    });
    response.status(201).json({ ...line, montant: toNumber(line.montant) });
  } catch (error) { next(error); }
});

router.post('/depenses', ...caisseAccess, async (request, response, next) => {
  try {
    const input = sessionSchema.parse(request.body);
    const date = toDate(input.date);
    await ensureOpen(date, input.equipeId);
    await ensureSessionReferences(input);
    const session = await prisma.depensesCaisse.upsert({ where: sessionWhere(input), create: { date, equipeId: input.equipeId, caisseId: input.caisseId, vendeurId: input.vendeurId, magasinId: request.user?.magasinId }, update: { vendeurId: input.vendeurId } });
    response.status(201).json({ ...session, totalDepenses: toNumber(session.totalDepenses) });
  } catch (error) { next(error); }
});

router.post('/depenses/:id/lignes', ...caisseAccess, async (request, response, next) => {
  try {
    const depenseId = Number(request.params.id);
    const input = depenseLineSchema.parse(request.body);
    const depense = await prisma.depensesCaisse.findUnique({ where: { id: depenseId } });
    if (!depense) { response.status(404).json({ message: 'Session de depenses introuvable.' }); return; }
    await ensureOpen(depense.date, depense.equipeId);
    if (depense.fait) { response.status(409).json({ message: 'La session de depenses est deja validee.' }); return; }
    const line = await prisma.$transaction(async (transaction) => {
      const created = await transaction.detailDepenses.create({ data: { numDepense: depenseId, codeDepense: input.codeDepense, montant: new Prisma.Decimal(input.montant), libelle: input.libelle } });
      await transaction.depensesCaisse.update({ where: { id: depenseId }, data: { totalDepenses: { increment: new Prisma.Decimal(input.montant) } } });
      return created;
    });
    response.status(201).json({ ...line, montant: toNumber(line.montant) });
  } catch (error) { next(error); }
});

router.post('/credits', ...caisseAccess, async (request, response, next) => {
  try {
    const input = sessionSchema.parse(request.body);
    const date = toDate(input.date);
    await ensureOpen(date, input.equipeId);
    await ensureSessionReferences(input);
    const session = await prisma.creditCaisse.upsert({ where: sessionWhere(input), create: { date, equipeId: input.equipeId, caisseId: input.caisseId, vendeurId: input.vendeurId, magasinId: request.user?.magasinId }, update: { vendeurId: input.vendeurId } });
    response.status(201).json({ ...session, totalCredits: toNumber(session.totalCredits) });
  } catch (error) { next(error); }
});

router.post('/credits/:id/lignes', ...caisseAccess, async (request, response, next) => {
  try {
    const creditId = Number(request.params.id);
    const input = creditLineSchema.parse(request.body);
    const credit = await prisma.creditCaisse.findUnique({ where: { id: creditId } });
    if (!credit) { response.status(404).json({ message: 'Session de credits introuvable.' }); return; }
    await ensureOpen(credit.date, credit.equipeId);
    if (credit.fait) { response.status(409).json({ message: 'La session de credits est deja validee.' }); return; }
    const line = await prisma.$transaction(async (transaction) => {
      const created = await transaction.detailCredit.create({ data: { numCredit: creditId, clientId: input.clientId, montant: new Prisma.Decimal(input.montant), libelle: input.libelle, modePayment: input.modePayment } });
      await transaction.creditCaisse.update({ where: { id: creditId }, data: { totalCredits: { increment: new Prisma.Decimal(input.montant) } } });
      return created;
    });
    response.status(201).json({ ...line, montant: toNumber(line.montant) });
  } catch (error) { next(error); }
});

router.post('/cloturer', ...caisseAccess, async (request, response, next) => {
  try {
    const input = clotureSchema.parse(request.body);
    const date = toDate(input.date);
    if (input.forcer && request.user?.role !== 'gerant') { response.status(403).json({ message: 'Seul un gerant peut forcer une cloture avec ecart.' }); return; }
    if (input.forcer && !input.commentaire) { response.status(400).json({ message: 'Un commentaire est obligatoire pour forcer la cloture.' }); return; }
    const result = await prisma.$transaction(async (transaction) => {
      const closure = await transaction.joursClotures.findUnique({ where: { dateJour_equipeId: { dateJour: date, equipeId: input.equipeId } } });
      if (closure?.fait) { const error = new Error('Cette equipe est deja cloturee pour cette date.') as Error & { statusCode?: number }; error.statusCode = 409; throw error; }
      const recette = await transaction.recetteCaisse.findUnique({ where: { date_equipeId_caisseId: { date, equipeId: input.equipeId, caisseId: input.caisseId } } });
      if (!recette) { const error = new Error('Aucune session de recettes a cloturer pour cette caisse.') as Error & { statusCode?: number }; error.statusCode = 400; throw error; }
      const [releves, depense, retours] = await Promise.all([
        transaction.mobVCarCaisse.findMany({ where: { date, equipeId: input.equipeId, caisseId: input.caisseId } }),
        transaction.depensesCaisse.findUnique({ where: { date_equipeId_caisseId: { date, equipeId: input.equipeId, caisseId: input.caisseId } } }),
        transaction.retourCuve.findUnique({ where: { date_equipeId_caisseId: { date, equipeId: input.equipeId, caisseId: input.caisseId } }, include: { details: true } }),
      ]);
      const incomplete = releves.find((releve) => releve.indexFermeture == null);
      if (incomplete) { const error = new Error('Toutes les pompes doivent avoir un index de fermeture avant la cloture.') as Error & { statusCode?: number }; error.statusCode = 400; throw error; }
      const recetteTheorique = releves.reduce((total, releve) => total.plus(releve.indexFermeture!.minus(releve.indexOuverture).times(releve.prixVente)), new Prisma.Decimal(0));
      const retourValeur = (retours?.details ?? []).filter((detail) => detail.valide).reduce((total, detail) => total.plus(detail.valeur), new Prisma.Decimal(0));
      const totalCaisse = recette.totalRecettes.minus(retourValeur);
      const totalDepenses = depense?.totalDepenses ?? new Prisma.Decimal(0);
      const reserveFinTheorique = recette.reserveDepart.minus(recetteTheorique).minus(retourValeur);
      const ecartRecette = totalCaisse.minus(recetteTheorique);
      const reserveFinAttendue = recette.reserveDepart.minus(recetteTheorique).minus(retourValeur);
      const ecartCaisse = ecartRecette;
      const tolerance = recette.seuilTolerance;
      if (ecartCaisse.abs().greaterThan(tolerance) && !input.forcer) { const error = new Error(`Cloture bloquee: ecart de ${ecartCaisse.toFixed(3)} TND, tolerance ${tolerance.toFixed(3)} TND.`) as Error & { statusCode?: number }; error.statusCode = 409; throw error; }
      const updated = await transaction.recetteCaisse.update({ where: { id: recette.id }, data: { recetteTheorique, ecartRecette, reserveFinTheorique, reserveFinAttendue, ecartCaisse, commentaireEcart: input.commentaire, validePar: input.forcer ? request.user?.id : undefined, fait: true } });
      await transaction.joursClotures.upsert({ where: { dateJour_equipeId: { dateJour: date, equipeId: input.equipeId } }, create: { dateJour: date, equipeId: input.equipeId, fait: true }, update: { fait: true } });
      await transaction.depensesCaisse.updateMany({ where: { date, equipeId: input.equipeId, caisseId: input.caisseId }, data: { fait: true } });
      await transaction.creditCaisse.updateMany({ where: { date, equipeId: input.equipeId, caisseId: input.caisseId }, data: { fait: true } });
      return updated;
    });
    response.json({ ...result, date: result.date.toISOString().slice(0, 10), totalRecettes: toNumber(result.totalRecettes), recetteTheorique: toNumber(result.recetteTheorique), ecartRecette: toNumber(result.ecartRecette), reserveFinTheorique: toNumber(result.reserveFinTheorique), reserveFinAttendue: toNumber(result.reserveFinAttendue), ecartCaisse: toNumber(result.ecartCaisse) });
  } catch (error) { next(error); }
});

router.get('/resume/:date/:equipeId/:caisseId', ...caisseAccess, async (request, response, next) => {
  try {
    const params = summaryParamsSchema.parse(request.params);
    const date = toDate(params.date);
    const [recette, depense, credit, closure] = await Promise.all([
      prisma.recetteCaisse.findUnique({ where: { date_equipeId_caisseId: { date, equipeId: params.equipeId, caisseId: params.caisseId } }, include: { details: { include: { modePayment: true, cuve: true } } } }),
      prisma.depensesCaisse.findUnique({ where: { date_equipeId_caisseId: { date, equipeId: params.equipeId, caisseId: params.caisseId } }, include: { details: { include: { type: true } } } }),
      prisma.creditCaisse.findUnique({ where: { date_equipeId_caisseId: { date, equipeId: params.equipeId, caisseId: params.caisseId } }, include: { details: { include: { client: true } } } }),
      prisma.joursClotures.findUnique({ where: { dateJour_equipeId: { dateJour: date, equipeId: params.equipeId } } }),
    ]);
    const totalRecettes = Number(recette?.totalRecettes ?? 0);
    const totalDepenses = Number(depense?.totalDepenses ?? 0);
    const totalCredits = Number(credit?.totalCredits ?? 0);
    const breakdown = new Map<number, { modePaymentId: number; libelle: string; montant: number }>();
    for (const line of recette?.details ?? []) {
      const current = breakdown.get(line.modePaymentId) ?? { modePaymentId: line.modePaymentId, libelle: line.modePayment.libelle, montant: 0 };
      current.montant += Number(line.montant);
      breakdown.set(line.modePaymentId, current);
    }
    response.json({ recetteId: recette?.id ?? null, depenseId: depense?.id ?? null, creditId: credit?.id ?? null, totalRecettes, totalDepenses, totalCredits, soldeNet: totalRecettes - totalDepenses - totalCredits, fait: Boolean(closure?.fait), recettes: (recette?.details ?? []).map((line) => ({ ...line, montant: toNumber(line.montant), cuve: line.cuve ? { id: line.cuve.id, libelle: line.cuve.libelle } : null })), depenses: (depense?.details ?? []).map((line) => ({ ...line, montant: toNumber(line.montant) })), credits: (credit?.details ?? []).map((line) => ({ ...line, montant: toNumber(line.montant), client: { id: line.client.id, nomClient: line.client.nomClient } })), breakdown: [...breakdown.values()] });
  } catch (error) { next(error); }
});

export default router;