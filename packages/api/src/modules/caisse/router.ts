import { Router } from 'express';
import { execute, insertRecord, query, queryOne, withTransaction, type SqlValue } from '../../lib/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { clotureSchema, creditLineSchema, depenseLineSchema, recetteLineSchema, sessionSchema, summaryParamsSchema, type SessionInput } from './caisse.schema.js';
import { closureAuditValues, lockShiftClosure, requireOpenShift } from './closure-policy.js';
import type { PoolConnection } from 'mysql2/promise';

const router = Router();
const caisseAccess = [requireAuth, requireRole('caissier', 'gerant')];
const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const toNumber = (value: unknown) => value == null ? null : Number(value);
type SessionTable = 'RecetteCaisse' | 'DepensesCaisse' | 'CreditCaisse';

async function ensureSessionReferences(input: SessionInput) {
  const [equipe, caisse, vendeur] = await Promise.all([
    queryOne('SELECT actif FROM `Equipe` WHERE id = ?', [input.equipeId]),
    queryOne('SELECT actif FROM `Caisse` WHERE id = ?', [input.caisseId]),
    queryOne('SELECT actif FROM `Vendeur` WHERE id = ?', [input.vendeurId]),
  ]);
  if (!equipe?.actif || !caisse?.actif || !vendeur?.actif) {
    const error = new Error('Equipe, caisse ou vendeur invalide/inactif.') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
}

async function ensureSession(table: SessionTable, input: SessionInput, magasinId: number | null | undefined, connection: PoolConnection, extra: Record<string, SqlValue> = {}) {
  const date = toDate(input.date);
  const existing = await queryOne(`SELECT * FROM \`${table}\` WHERE date = ? AND equipeId = ? AND caisseId = ? FOR UPDATE`, [date, input.equipeId, input.caisseId], connection);
  if (existing) {
    if (existing.fait) {
      const error = new Error('Cette session est deja cloturee.') as Error & { statusCode: number };
      error.statusCode = 409;
      throw error;
    }
    await execute(`UPDATE \`${table}\` SET vendeurId = ?, updatedAt = ? WHERE id = ?`, [input.vendeurId, new Date(), existing.id], connection);
    return queryOne(`SELECT * FROM \`${table}\` WHERE id = ?`, [existing.id], connection);
  }
  const id = await insertRecord(table, { date, equipeId: input.equipeId, caisseId: input.caisseId, vendeurId: input.vendeurId, magasinId, ...extra }, connection);
  return queryOne(`SELECT * FROM \`${table}\` WHERE id = ?`, [id], connection);
}

router.get('/modes-payment', ...caisseAccess, async (_request, response, next) => {
  try { response.json(await query('SELECT * FROM `ModePayment` ORDER BY libelle')); } catch (error) { next(error); }
});

router.get('/types-depenses', ...caisseAccess, async (_request, response, next) => {
  try { response.json(await query('SELECT * FROM `Depenses` ORDER BY typeDepense')); } catch (error) { next(error); }
});

router.get('/clients', ...caisseAccess, async (_request, response, next) => {
  try { response.json(await query('SELECT * FROM `Client` ORDER BY nomClient')); } catch (error) { next(error); }
});

router.post('/recettes', ...caisseAccess, async (request, response, next) => {
  try {
    const input = sessionSchema.parse(request.body);
    const date = toDate(input.date);
    await ensureSessionReferences(input);
    const session = await withTransaction(async (connection) => {
      await requireOpenShift(date, input.equipeId, connection);
      const balance = await queryOne('SELECT COALESCE(SUM(stock * prixAchatHT), 0) AS reserve FROM `Cuve` WHERE magasinId <=> ?', [request.user?.magasinId ?? null], connection);
      return ensureSession('RecetteCaisse', input, request.user?.magasinId, connection, { reserveDepart: Number(balance?.reserve ?? 0) });
    });
    if (!session) throw new Error('Cash receipt session could not be loaded.');
    response.status(201).json({ ...session, totalRecettes: toNumber(session.totalRecettes) });
  } catch (error) { next(error); }
});

router.post('/recettes/:id/lignes', ...caisseAccess, async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const input = recetteLineSchema.parse(request.body);
    const result = await withTransaction(async (connection) => {
      const reference = await queryOne('SELECT date, equipeId FROM `RecetteCaisse` WHERE id = ?', [id], connection);
      if (!reference) return null;
      await requireOpenShift(new Date(reference.date), Number(reference.equipeId), connection);
      const session = await queryOne('SELECT * FROM `RecetteCaisse` WHERE id = ? FOR UPDATE', [id], connection);
      if (!session) return null;
      if (session.fait) {
        const error = new Error('La session de recettes est deja validee.') as Error & { statusCode?: number };
        error.statusCode = 409;
        throw error;
      }
      const lineId = await insertRecord('DetailRecetteCaisse', { numRecette: id, modePaymentId: input.modePaymentId, montant: input.montant, numero: input.numero, idCuve: input.idCuve }, connection);
      await execute('UPDATE `RecetteCaisse` SET totalRecettes = totalRecettes + ?, updatedAt = ? WHERE id = ?', [input.montant, new Date(), id], connection);
      return queryOne('SELECT * FROM `DetailRecetteCaisse` WHERE id = ?', [lineId], connection);
    });
    if (!result) { response.status(404).json({ message: 'Session de recettes introuvable.' }); return; }
    response.status(201).json({ ...result, montant: toNumber(result.montant) });
  } catch (error) { next(error); }
});

router.post('/depenses', ...caisseAccess, async (request, response, next) => {
  try {
    const input = sessionSchema.parse(request.body);
    const date = toDate(input.date);
    await ensureSessionReferences(input);
    const session = await withTransaction(async (connection) => {
      await requireOpenShift(date, input.equipeId, connection);
      return ensureSession('DepensesCaisse', input, request.user?.magasinId, connection);
    });
    if (!session) throw new Error('Expense session could not be loaded.');
    response.status(201).json({ ...session, totalDepenses: toNumber(session.totalDepenses) });
  } catch (error) { next(error); }
});

router.post('/depenses/:id/lignes', ...caisseAccess, async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const input = depenseLineSchema.parse(request.body);
    const result = await withTransaction(async (connection) => {
      const reference = await queryOne('SELECT date, equipeId FROM `DepensesCaisse` WHERE id = ?', [id], connection);
      if (!reference) return null;
      await requireOpenShift(new Date(reference.date), Number(reference.equipeId), connection);
      const session = await queryOne('SELECT * FROM `DepensesCaisse` WHERE id = ? FOR UPDATE', [id], connection);
      if (!session) return null;
      if (session.fait) {
        const error = new Error('La session de depenses est deja validee.') as Error & { statusCode?: number };
        error.statusCode = 409;
        throw error;
      }
      const lineId = await insertRecord('DetailDepenses', { numDepense: id, codeDepense: input.codeDepense, montant: input.montant, libelle: input.libelle }, connection);
      await execute('UPDATE `DepensesCaisse` SET totalDepenses = totalDepenses + ?, updatedAt = ? WHERE id = ?', [input.montant, new Date(), id], connection);
      return queryOne('SELECT * FROM `DetailDepenses` WHERE id = ?', [lineId], connection);
    });
    if (!result) { response.status(404).json({ message: 'Session de depenses introuvable.' }); return; }
    response.status(201).json({ ...result, montant: toNumber(result.montant) });
  } catch (error) { next(error); }
});

router.post('/credits', ...caisseAccess, async (request, response, next) => {
  try {
    const input = sessionSchema.parse(request.body);
    const date = toDate(input.date);
    await ensureSessionReferences(input);
    const session = await withTransaction(async (connection) => {
      await requireOpenShift(date, input.equipeId, connection);
      return ensureSession('CreditCaisse', input, request.user?.magasinId, connection);
    });
    if (!session) throw new Error('Credit session could not be loaded.');
    response.status(201).json({ ...session, totalCredits: toNumber(session.totalCredits) });
  } catch (error) { next(error); }
});

router.post('/credits/:id/lignes', ...caisseAccess, async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const input = creditLineSchema.parse(request.body);
    const result = await withTransaction(async (connection) => {
      const reference = await queryOne('SELECT date, equipeId FROM `CreditCaisse` WHERE id = ?', [id], connection);
      if (!reference) return null;
      await requireOpenShift(new Date(reference.date), Number(reference.equipeId), connection);
      const session = await queryOne('SELECT * FROM `CreditCaisse` WHERE id = ? FOR UPDATE', [id], connection);
      if (!session) return null;
      if (session.fait) {
        const error = new Error('La session de credits est deja validee.') as Error & { statusCode?: number };
        error.statusCode = 409;
        throw error;
      }
      const lineId = await insertRecord('DetailCredit', { numCredit: id, clientId: input.clientId, montant: input.montant, libelle: input.libelle, modePayment: input.modePayment }, connection);
      await execute('UPDATE `CreditCaisse` SET totalCredits = totalCredits + ?, updatedAt = ? WHERE id = ?', [input.montant, new Date(), id], connection);
      return queryOne('SELECT * FROM `DetailCredit` WHERE id = ?', [lineId], connection);
    });
    if (!result) { response.status(404).json({ message: 'Session de credits introuvable.' }); return; }
    response.status(201).json({ ...result, montant: toNumber(result.montant) });
  } catch (error) { next(error); }
});

router.post('/cloturer', ...caisseAccess, async (request, response, next) => {
  try {
    const input = clotureSchema.parse(request.body);
    const date = toDate(input.date);
    if (input.forcer && request.user?.role !== 'gerant') { response.status(403).json({ message: 'Seul un gerant peut forcer une cloture avec ecart.' }); return; }
    if (input.forcer && !input.commentaire) { response.status(400).json({ message: 'Un commentaire est obligatoire pour forcer la cloture.' }); return; }
    const result = await withTransaction(async (connection) => {
      const closure = await lockShiftClosure(date, input.equipeId, connection);
      if (closure?.fait) { const error = new Error('Cette equipe est deja cloturee pour cette date.') as Error & { statusCode?: number }; error.statusCode = 409; throw error; }
      const recette = await queryOne('SELECT * FROM `RecetteCaisse` WHERE date = ? AND equipeId = ? AND caisseId = ? FOR UPDATE', [date, input.equipeId, input.caisseId], connection);
      if (!recette) { const error = new Error('Aucune session de recettes a cloturer pour cette caisse.') as Error & { statusCode?: number }; error.statusCode = 400; throw error; }
      const [releves, depense, retours] = await Promise.all([
        query('SELECT * FROM `MobVCarCaisse` WHERE date = ? AND equipeId = ? AND caisseId = ?', [date, input.equipeId, input.caisseId], connection),
        queryOne('SELECT * FROM `DepensesCaisse` WHERE date = ? AND equipeId = ? AND caisseId = ?', [date, input.equipeId, input.caisseId], connection),
        queryOne('SELECT * FROM `RetourCuve` WHERE date = ? AND equipeId = ? AND caisseId = ?', [date, input.equipeId, input.caisseId], connection),
      ]);
      if (releves.some((row) => row.indexFermeture == null)) { const error = new Error('Toutes les pompes doivent avoir un index de fermeture avant la cloture.') as Error & { statusCode?: number }; error.statusCode = 400; throw error; }
      const theoretical = await queryOne('SELECT COALESCE(SUM((indexFermeture - indexOuverture) * prixVente), 0) AS total FROM `MobVCarCaisse` WHERE date = ? AND equipeId = ? AND caisseId = ?', [date, input.equipeId, input.caisseId], connection);
      const returnTotal = retours
        ? await queryOne('SELECT COALESCE(SUM(valeur), 0) AS total FROM `DetailRetour` WHERE retourCuveId = ? AND valide = ?', [retours.id, true], connection)
        : { total: 0 };
      const recetteTheorique = Number(theoretical?.total ?? 0);
      const retourValeur = Number(returnTotal?.total ?? 0);
      const totalCaisse = Number(recette.totalRecettes) - retourValeur;
      const reserveFinTheorique = Number(recette.reserveDepart) - recetteTheorique - retourValeur;
      const ecartRecette = totalCaisse - recetteTheorique;
      const ecartCaisse = ecartRecette;
      const tolerance = Number(recette.seuilTolerance);
      if (Math.abs(ecartCaisse) > tolerance && !input.forcer) {
        const error = new Error(`Cloture bloquee: ecart de ${ecartCaisse.toFixed(3)} TND, tolerance ${tolerance.toFixed(3)} TND.`) as Error & { statusCode?: number };
        error.statusCode = 409;
        throw error;
      }
      const now = new Date();
      await execute('UPDATE `RecetteCaisse` SET recetteTheorique = ?, ecartRecette = ?, reserveFinTheorique = ?, reserveFinAttendue = ?, ecartCaisse = ?, commentaireEcart = ?, validePar = ?, fait = ?, updatedAt = ? WHERE id = ?', [recetteTheorique, ecartRecette, reserveFinTheorique, reserveFinTheorique, ecartCaisse, input.commentaire ?? null, input.forcer ? request.user?.id ?? null : null, true, now, recette.id], connection);
      const audit = closureAuditValues(request.user!.id, input.forcer, input.commentaire);
      await execute('UPDATE `JoursClotures` SET fait = ?, closedByUserId = ?, closedAt = ?, forced = ?, closureReason = ?, updatedAt = ? WHERE id = ?', [true, audit.closedByUserId, audit.closedAt, audit.forced, audit.closureReason, now, closure.id], connection);
      await execute('UPDATE `DepensesCaisse` SET fait = ?, updatedAt = ? WHERE date = ? AND equipeId = ? AND caisseId = ?', [true, now, date, input.equipeId, input.caisseId], connection);
      await execute('UPDATE `CreditCaisse` SET fait = ?, updatedAt = ? WHERE date = ? AND equipeId = ? AND caisseId = ?', [true, now, date, input.equipeId, input.caisseId], connection);
      return queryOne('SELECT * FROM `RecetteCaisse` WHERE id = ?', [recette.id], connection);
    });
    if (!result) throw new Error('Closed cash session could not be loaded.');
    response.json({ ...result, date: new Date(result.date).toISOString().slice(0, 10), totalRecettes: toNumber(result.totalRecettes), recetteTheorique: toNumber(result.recetteTheorique), ecartRecette: toNumber(result.ecartRecette), reserveFinTheorique: toNumber(result.reserveFinTheorique), reserveFinAttendue: toNumber(result.reserveFinAttendue), ecartCaisse: toNumber(result.ecartCaisse) });
  } catch (error) { next(error); }
});

router.get('/resume/:date/:equipeId/:caisseId', ...caisseAccess, async (request, response, next) => {
  try {
    const params = summaryParamsSchema.parse(request.params);
    const date = toDate(params.date);
    const [recette, depense, credit, closure] = await Promise.all([
      queryOne('SELECT * FROM `RecetteCaisse` WHERE date = ? AND equipeId = ? AND caisseId = ?', [date, params.equipeId, params.caisseId]),
      queryOne('SELECT * FROM `DepensesCaisse` WHERE date = ? AND equipeId = ? AND caisseId = ?', [date, params.equipeId, params.caisseId]),
      queryOne('SELECT * FROM `CreditCaisse` WHERE date = ? AND equipeId = ? AND caisseId = ?', [date, params.equipeId, params.caisseId]),
      queryOne('SELECT fait FROM `JoursClotures` WHERE dateJour = ? AND equipeId = ?', [date, params.equipeId]),
    ]);
    const [recettes, depenses, credits] = await Promise.all([
      recette ? query('SELECT d.*, m.libelle AS modeLibelle, c.id AS cuveId, c.libelle AS cuveLibelle FROM `DetailRecetteCaisse` d JOIN `ModePayment` m ON m.id = d.modePaymentId LEFT JOIN `Cuve` c ON c.id = d.idCuve WHERE d.numRecette = ?', [recette.id]) : [],
      depense ? query('SELECT d.*, t.typeDepense FROM `DetailDepenses` d JOIN `Depenses` t ON t.id = d.codeDepense WHERE d.numDepense = ?', [depense.id]) : [],
      credit ? query('SELECT d.*, c.nomClient FROM `DetailCredit` d JOIN `Client` c ON c.id = d.clientId WHERE d.numCredit = ?', [credit.id]) : [],
    ]);
    const totalRecettes = Number(recette?.totalRecettes ?? 0);
    const totalDepenses = Number(depense?.totalDepenses ?? 0);
    const totalCredits = Number(credit?.totalCredits ?? 0);
    const breakdown = new Map<number, { modePaymentId: number; libelle: string; montant: number }>();
    for (const line of recettes) {
      const key = Number(line.modePaymentId);
      const current = breakdown.get(key) ?? { modePaymentId: key, libelle: line.modeLibelle, montant: 0 };
      current.montant += Number(line.montant);
      breakdown.set(key, current);
    }
    response.json({
      recetteId: recette?.id ?? null,
      depenseId: depense?.id ?? null,
      creditId: credit?.id ?? null,
      totalRecettes,
      totalDepenses,
      totalCredits,
      soldeNet: totalRecettes - totalDepenses - totalCredits,
      fait: Boolean(closure?.fait),
      recettes: recettes.map((line) => ({ ...line, montant: toNumber(line.montant), cuve: line.cuveId == null ? null : { id: line.cuveId, libelle: line.cuveLibelle } })),
      depenses: depenses.map((line) => ({ ...line, montant: toNumber(line.montant) })),
      credits: credits.map((line) => ({ ...line, montant: toNumber(line.montant), client: { id: line.clientId, nomClient: line.nomClient } })),
      breakdown: [...breakdown.values()],
    });
  } catch (error) { next(error); }
});

export default router;
