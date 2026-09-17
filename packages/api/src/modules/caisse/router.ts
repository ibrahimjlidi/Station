import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole, scopeToMagasin } from '../../middleware/auth.js';
import { BUSINESS_RULES } from '../../lib/business-rules.js';
import { emitSocketEvent } from '../../lib/socket.js';
import { SOCKET_EVENTS } from '../../lib/socket-events.js';
import { clotureSchema, creditLineSchema, depenseLineSchema, recetteLineSchema, sessionSchema, summaryParamsSchema, type SessionInput } from './caisse.schema.js';

const router = Router();
const caisseAccess = [requireAuth, requireRole('caissier', 'gerant')];

const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const toNumber = (value: Prisma.Decimal | number | null | undefined) => value == null ? null : Number(value);

async function ensureOpen(date: Date, equipeId: number) {
  const closure = await prisma.joursClotures.findUnique({ where: { dateJour_equipeId: { dateJour: date, equipeId } } });
  if (closure?.fait) {
    const error = new Error('Cette equipe est deja cloturee pour cette date.') as Error & { statusCode?: number; code?: string };
    error.statusCode = 403;
    error.code = 'SESSION_FERMEE';
    throw error;
  }
}

async function ensureSessionReferences(input: SessionInput) {
  const [equipe, caisse, vendeur] = await Promise.all([
    prisma.equipe.findUnique({ where: { id: input.equipeId } }),
    prisma.caisse.findUnique({ where: { id: input.caisseId } }),
    prisma.vendeur.findUnique({ where: { id: input.vendeurId } }),
  ]);
  if (!equipe || !equipe.actif || !caisse || !caisse.actif || caisse.type !== 'PISTE' || !vendeur || !vendeur.actif) {
    const error = new Error('Equipe, caisse PISTE ou vendeur invalide/inactif.') as Error & { statusCode?: number };
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
    const { line, total } = await prisma.$transaction(async (transaction) => {
      const created = await transaction.detailRecetteCaisse.create({ data: { numRecette: recetteId, modePaymentId: input.modePaymentId, montant: new Prisma.Decimal(input.montant), numero: input.numero, idCuve: input.idCuve, date: new Date(), equipeId: recette.equipeId, caisseId: recette.caisseId, vendeurId: recette.vendeurId } , include: { modePayment: true } });
      const updated = await transaction.recetteCaisse.update({ where: { id: recetteId }, data: { totalRecettes: { increment: new Prisma.Decimal(input.montant) } } });
      return { line: created, total: updated.totalRecettes };
    });
    emitSocketEvent(recette.magasinId, SOCKET_EVENTS.RECETTE_ADDED, { magasinId: recette.magasinId ?? 0, caisseId: recette.caisseId, equipeId: recette.equipeId, montant: input.montant, modePayment: line.modePayment.libelle, total: Number(total) });
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
    const { line, total } = await prisma.$transaction(async (transaction) => {
      const created = await transaction.detailDepenses.create({ data: { numDepense: depenseId, codeDepense: input.codeDepense, montant: new Prisma.Decimal(input.montant), libelle: input.libelle, date: new Date(), equipeId: depense.equipeId, caisseId: depense.caisseId, vendeurId: depense.vendeurId } });
      const updated = await transaction.depensesCaisse.update({ where: { id: depenseId }, data: { totalDepenses: { increment: new Prisma.Decimal(input.montant) } } });
      return { line: created, total: updated.totalDepenses };
    });
    emitSocketEvent(depense.magasinId, SOCKET_EVENTS.DEPENSE_ADDED, { magasinId: depense.magasinId ?? 0, caisseId: depense.caisseId, equipeId: depense.equipeId, montant: input.montant, codeDepense: input.codeDepense, total: Number(total) });
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
    const { line, total } = await prisma.$transaction(async (transaction) => {
      const created = await transaction.detailCredit.create({ data: { numCredit: creditId, clientId: input.clientId, montant: new Prisma.Decimal(input.montant), libelle: input.libelle, modePayment: input.modePayment, date: new Date(), equipeId: credit.equipeId, caisseId: credit.caisseId, vendeurId: credit.vendeurId } });
      const updated = await transaction.creditCaisse.update({ where: { id: creditId }, data: { totalCredits: { increment: new Prisma.Decimal(input.montant) } } });
      if (BUSINESS_RULES.CREDIT_CREATES_RECETTE_LINE) {
        const recette = await transaction.recetteCaisse.findUnique({ where: { date_equipeId_caisseId: { date: credit.date, equipeId: credit.equipeId, caisseId: credit.caisseId } } });
        const creditMode = await transaction.modePayment.findFirst({ where: { OR: [{ libelle: 'Crédit client' }, { famille: '4' }] } });
        if (!recette || !creditMode) throw new Error('La session de recettes ou le mode Crédit client est introuvable.');
        await transaction.detailRecetteCaisse.create({ data: { numRecette: recette.id, modePaymentId: creditMode.id, montant: new Prisma.Decimal(input.montant), date: new Date(), equipeId: credit.equipeId, caisseId: credit.caisseId, vendeurId: credit.vendeurId } });
        await transaction.recetteCaisse.update({ where: { id: recette.id }, data: { totalRecettes: { increment: new Prisma.Decimal(input.montant) } } });
      }
      return { line: created, total: updated.totalCredits };
    });
    emitSocketEvent(credit.magasinId, SOCKET_EVENTS.CREDIT_ADDED, { magasinId: credit.magasinId ?? 0, clientId: input.clientId, montant: input.montant, total: Number(total) });
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
      const recette = await transaction.recetteCaisse.findUnique({ where: { date_equipeId_caisseId: { date, equipeId: input.equipeId, caisseId: input.caisseId } }, include: { caisse: true } });
      if (!recette) { const error = new Error('Aucune session de recettes a cloturer pour cette caisse.') as Error & { statusCode?: number }; error.statusCode = 400; throw error; }
      if (recette.caisse.type !== 'PISTE') { const error = new Error('Le workflow caisse classique est reserve aux caisses PISTE.') as Error & { statusCode?: number }; error.statusCode = 400; throw error; }
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
    emitSocketEvent(request.user?.magasinId, SOCKET_EVENTS.CLOTURE_DONE, { date: result.date.toISOString().slice(0, 10), equipeId: input.equipeId, magasinId: request.user?.magasinId ?? 0 });
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
    const [fuelRows, boutiqueTotal] = await Promise.all([
      prisma.mobVCarCaisse.findMany({ where: { date, equipeId: params.equipeId, caisseId: params.caisseId, indexFermeture: { not: null } } }),
      prisma.carProdSiege.aggregate({ where: { date, equipeId: params.equipeId, caisseId: params.caisseId }, _sum: { prixVenteTTC: true } }),
    ]);
    const totalEspeces = recette?.details.filter((line) => line.modePayment.famille === '1').reduce((total, line) => total.plus(line.montant), new Prisma.Decimal(0)) ?? new Prisma.Decimal(0);
    const totalCheques = recette?.details.filter((line) => line.modePayment.famille === '2' || line.modePayment.libelle.toLowerCase().includes('chèque')).reduce((total, line) => total.plus(line.montant), new Prisma.Decimal(0)) ?? new Prisma.Decimal(0);
    const totalCarte = recette?.details.filter((line) => line.modePayment.famille === '3' || line.modePayment.libelle.toLowerCase().includes('carte')).reduce((total, line) => total.plus(line.montant), new Prisma.Decimal(0)) ?? new Prisma.Decimal(0);
    const totalCarburant = fuelRows.reduce((total, row) => row.indexFermeture == null ? total : total.plus(row.indexFermeture.minus(row.indexOuverture).times(row.prixVente)), new Prisma.Decimal(0));
    const totalBoutique = boutiqueTotal._sum.prixVenteTTC ?? new Prisma.Decimal(0);
    const totalTheorique = totalCarburant.plus(totalBoutique).plus(credit?.totalCredits ?? 0);
    const breakdown = new Map<number, { modePaymentId: number; libelle: string; montant: number }>();
    for (const line of recette?.details ?? []) {
      const current = breakdown.get(line.modePaymentId) ?? { modePaymentId: line.modePaymentId, libelle: line.modePayment.libelle, montant: 0 };
      current.montant += Number(line.montant);
      breakdown.set(line.modePaymentId, current);
    }
    response.json({ recetteId: recette?.id ?? null, depenseId: depense?.id ?? null, creditId: credit?.id ?? null, sessionStatut: recette?.statut ?? (closure?.fait ? 'FERME' : 'NON_OUVERTE'), fondsCaisseOuverture: toNumber(recette?.fondsCaisseOuverture) ?? 0, recettesTotaux: { totalEspeces: totalEspeces.toNumber(), totalCheques: totalCheques.toNumber(), totalCarte: totalCarte.toNumber(), totalCredits, totalDeclaree: totalRecettes }, theorique: { carburant: totalCarburant.toNumber(), boutique: totalBoutique.toNumber(), credits: totalCredits, total: totalTheorique.toNumber() }, ecartProvisoire: new Prisma.Decimal(totalRecettes).minus(totalTheorique).toNumber(), totalRecettes, totalDepenses, totalCredits, soldeNet: totalRecettes - totalDepenses - totalCredits, fait: Boolean(closure?.fait), recettes: (recette?.details ?? []).map((line) => ({ ...line, montant: toNumber(line.montant), cuve: line.cuve ? { id: line.cuve.id, libelle: line.cuve.libelle } : null })), depenses: (depense?.details ?? []).map((line) => ({ ...line, montant: toNumber(line.montant) })), credits: (credit?.details ?? []).map((line) => ({ ...line, montant: toNumber(line.montant), client: { id: line.client.id, nomClient: line.client.nomClient } })), breakdown: [...breakdown.values()] });
  } catch (error) { next(error); }
});

export default router;