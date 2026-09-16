import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { authMiddleware, requireRole, scopeToMagasin, type AuthRequest } from '../../middleware/auth.js';
import { caisseSchema, cuveSchema, equipeSchema, fermerSchema, inventaireCarburantSchema, jaugeageFilterSchema, jaugeageSchema, jaugeagesSchema, pompeSchema, releverSchema, retourSchema } from './schemas.js';

const router = Router();
router.use(authMiddleware);

const asNumber = (value: Prisma.Decimal | number | null | undefined) => value == null ? null : Number(value);

async function activeMagasinId(request: AuthRequest) {
  const magasin = await prisma.magasin.findFirst({ where: { ...scopeToMagasin(request, { active: true }) }, orderBy: { id: 'asc' } });
  if (!magasin) {
    const error = new Error('Aucun magasin actif n’est configuré.') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
  return magasin.id;
}

router.get('/cuves', async (request, response, next) => {
  try {
    const cuves = await prisma.cuve.findMany({ where: scopeToMagasin(request, {}), orderBy: { code: 'asc' } });
    response.json(cuves.map((cuve) => ({ ...cuve, volumeTotal: asNumber(cuve.volumeTotal), stockInitial: asNumber(cuve.stockInitial), stock: asNumber(cuve.stock), prixAchatHT: asNumber(cuve.prixAchatHT), seuilAlerte: asNumber(cuve.seuilAlerte) })));
  } catch (error) { next(error); }
});

router.get('/pompes', async (request, response, next) => {
  try {
    const pompes = await prisma.pompe.findMany({ where: scopeToMagasin(request, {}), include: { cuve: true }, orderBy: { code: 'asc' } });
    response.json(pompes.map((pompe) => ({ ...pompe, prixVente: asNumber(pompe.prixVente), cuve: { ...pompe.cuve, volumeTotal: asNumber(pompe.cuve.volumeTotal), stock: asNumber(pompe.cuve.stock), prixAchatHT: asNumber(pompe.cuve.prixAchatHT) } })));
  } catch (error) { next(error); }
});

router.get('/equipes', async (request, response, next) => {
  try { response.json(await prisma.equipe.findMany({ where: scopeToMagasin(request, { actif: true }), orderBy: { code: 'asc' } })); } catch (error) { next(error); }
});

router.get('/caisses', async (request, response, next) => {
  try { response.json(await prisma.caisse.findMany({ where: scopeToMagasin(request, { actif: true }), orderBy: { code: 'asc' } })); } catch (error) { next(error); }
});

router.post('/equipes', requireRole('gerant'), async (request, response, next) => {
  try { response.status(201).json(await prisma.equipe.create({ data: { ...equipeSchema.parse(request.body), magasinId: await activeMagasinId(request) } })); } catch (error) { next(error); }
});

router.post('/caisses', requireRole('gerant'), async (request, response, next) => {
  try { response.status(201).json(await prisma.caisse.create({ data: { ...caisseSchema.parse(request.body), magasinId: await activeMagasinId(request) } })); } catch (error) { next(error); }
});

router.post('/cuves', requireRole('gerant'), async (request, response, next) => {
  try {
    const input = cuveSchema.parse(request.body);
    const cuve = await prisma.cuve.create({ data: { ...input, magasinId: await activeMagasinId(request), stock: new Prisma.Decimal(input.stockInitial), prixAchatHT: new Prisma.Decimal(0), volumeTotal: new Prisma.Decimal(input.volumeTotal), stockInitial: new Prisma.Decimal(input.stockInitial), seuilAlerte: new Prisma.Decimal(input.seuilAlerte) } });
    response.status(201).json({ ...cuve, volumeTotal: asNumber(cuve.volumeTotal), stockInitial: asNumber(cuve.stockInitial), stock: asNumber(cuve.stock), prixAchatHT: asNumber(cuve.prixAchatHT), seuilAlerte: asNumber(cuve.seuilAlerte) });
  } catch (error) { next(error); }
});

router.post('/pompes', requireRole('gerant'), async (request, response, next) => {
  try {
    const input = pompeSchema.parse(request.body);
    const cuve = await prisma.cuve.findFirst({ where: { id: input.cuveId, ...scopeToMagasin(request, {}) } });
    if (!cuve) { response.status(400).json({ message: 'Cuve introuvable.' }); return; }
    const pompe = await prisma.pompe.create({ data: { ...input, magasinId: await activeMagasinId(request), prixVente: new Prisma.Decimal(input.prixVente) }, include: { cuve: true } });
    response.status(201).json({ ...pompe, prixVente: asNumber(pompe.prixVente), cuve: { ...pompe.cuve, volumeTotal: asNumber(pompe.cuve.volumeTotal) } });
  } catch (error) { next(error); }
});

router.get('/vendeurs', async (request, response, next) => {
  try { response.json(await prisma.vendeur.findMany({ where: scopeToMagasin(request, { actif: true }), orderBy: { nom: 'asc' } })); } catch (error) { next(error); }
});

router.get('/releves', async (_request, response, next) => {
  try {
    const releves = await prisma.mobVCarCaisse.findMany({ include: { pompe: true, equipe: true, caisse: true, vendeur: true }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], take: 100 });
    response.json(releves.map((releve) => ({ ...releve, date: releve.date.toISOString().slice(0, 10), indexOuverture: asNumber(releve.indexOuverture), indexFermeture: asNumber(releve.indexFermeture), prixVente: asNumber(releve.prixVente), ca: releve.indexFermeture == null ? null : Number(releve.indexFermeture.minus(releve.indexOuverture).times(releve.prixVente)) })));
  } catch (error) { next(error); }
});

router.post('/pompes/relever', requireRole('gerant', 'caissier'), async (request, response, next) => {
  try {
    const input = releverSchema.parse(request.body);
    const pompe = await prisma.pompe.findUnique({ where: { id: input.pompeId } });
    if (!pompe || !pompe.active) { response.status(404).json({ message: 'Pompe introuvable ou inactive.' }); return; }
    const date = new Date(`${input.date}T00:00:00.000Z`);
    const existing = await prisma.mobVCarCaisse.findUnique({ where: { date_equipeId_caisseId_pompeId: { date, equipeId: input.equipeId, caisseId: input.caisseId, pompeId: input.pompeId } } });
    if (existing) { response.status(409).json({ message: 'Un relevé existe déjà pour cette date, cette équipe, cette caisse et cette pompe.', id: existing.id }); return; }
    const releve = await prisma.mobVCarCaisse.create({ data: { ...input, date, indexOuverture: new Prisma.Decimal(input.indexOuverture), prixVente: pompe.prixVente } });
    response.status(201).json({ ...releve, indexOuverture: asNumber(releve.indexOuverture), prixVente: asNumber(releve.prixVente) });
  } catch (error) { next(error); }
});

router.patch('/pompes/relever/:id/fermer', requireRole('gerant', 'caissier'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const input = fermerSchema.parse(request.body);
    const releve = await prisma.mobVCarCaisse.findUnique({ where: { id } });
    if (!releve) { response.status(404).json({ message: 'Releve introuvable.' }); return; }
    if (new Prisma.Decimal(input.indexFermeture).lessThan(releve.indexOuverture)) { response.status(400).json({ message: "L'index de fermeture doit etre superieur ou egal a l'ouverture." }); return; }
    const updated = await prisma.mobVCarCaisse.update({ where: { id }, data: { indexFermeture: new Prisma.Decimal(input.indexFermeture) } });
    response.json({ ...updated, indexOuverture: asNumber(updated.indexOuverture), indexFermeture: asNumber(updated.indexFermeture), prixVente: asNumber(updated.prixVente), ca: Number(updated.indexFermeture!.minus(updated.indexOuverture).times(updated.prixVente)) });
  } catch (error) { next(error); }
});

router.get('/cuves/stock', async (request, response, next) => {
  try {
    const cuves = await prisma.cuve.findMany({ where: scopeToMagasin(request, {}), orderBy: { code: 'asc' } });
    response.json(cuves.map((cuve) => { const stockActuel = Number(cuve.stock); return { id: cuve.id, code: cuve.code, libelle: cuve.libelle, carburant: cuve.carburant, volumeTotal: Number(cuve.volumeTotal), stockActuel, pourcentage: Math.max(0, Math.min(100, stockActuel / Number(cuve.volumeTotal) * 100)) }; }));
  } catch (error) { next(error); }
});

export default router;

router.post('/retours', requireRole('caissier', 'gerant'), async (request, response, next) => {
  try {
    const input = retourSchema.parse(request.body);
    const pumps = await prisma.pompe.findMany({ where: { id: { in: input.lignes.map((line) => line.pompeId) }, ...scopeToMagasin(request, {}) }, include: { cuve: true } });
    const pumpMap = new Map(pumps.map((pump) => [pump.id, pump]));
    if (pumpMap.size !== new Set(input.lignes.map((line) => line.pompeId)).size) { response.status(400).json({ message: 'Une pompe est introuvable ou hors magasin.' }); return; }
    const lines = input.lignes.map((line) => {
      const pump = pumpMap.get(line.pompeId)!;
      const value = new Prisma.Decimal(line.volume).times(pump.cuve.prixAchatHT);
      if (new Prisma.Decimal(line.volume).greaterThan(pump.cuve.stock)) throw new Error(`Stock insuffisant pour la cuve ${pump.cuve.libelle}.`);
      return { ...line, cuveId: pump.cuveId, valeur: value };
    });
    const totalVolume = lines.reduce((sum, line) => sum.plus(line.volume), new Prisma.Decimal(0));
    const totalValeur = lines.reduce((sum, line) => sum.plus(line.valeur), new Prisma.Decimal(0));
    const retour = await prisma.$transaction(async (transaction) => {
      const created = await transaction.retourCuve.create({ data: { date: new Date(`${input.date}T00:00:00.000Z`), equipeId: input.equipeId, caisseId: input.caisseId, vendeurId: input.vendeurId, magasinId: await activeMagasinId(request), totalVolume, totalValeur, details: { create: lines.map((line) => ({ pompeId: line.pompeId, cuveId: line.cuveId, volume: new Prisma.Decimal(line.volume), valeur: line.valeur, tauxTVA: new Prisma.Decimal(line.tauxTVA) })) } }, include: { details: true } });
      for (const line of lines) await transaction.cuve.update({ where: { id: line.cuveId }, data: { stock: { decrement: new Prisma.Decimal(line.volume) } } });
      return created;
    });
    response.status(201).json({ ...retour, totalVolume: asNumber(retour.totalVolume), totalValeur: asNumber(retour.totalValeur) });
  } catch (error) { next(error); }
});

router.get('/retours', async (request, response, next) => {
  try {
    const dateFrom = typeof request.query.dateFrom === 'string' ? new Date(`${request.query.dateFrom}T00:00:00.000Z`) : undefined;
    const dateTo = typeof request.query.dateTo === 'string' ? new Date(`${request.query.dateTo}T23:59:59.999Z`) : undefined;
    const rows = await prisma.retourCuve.findMany({ where: scopeToMagasin(request, { equipeId: request.query.equipeId ? Number(request.query.equipeId) : undefined, date: dateFrom || dateTo ? { gte: dateFrom, lte: dateTo } : undefined }), include: { equipe: true, caisse: true, vendeur: true, details: { include: { pompe: true, cuve: true } } }, orderBy: { date: 'desc' } });
    response.json(rows.map((row) => ({ ...row, totalVolume: asNumber(row.totalVolume), totalValeur: asNumber(row.totalValeur) })));
  } catch (error) { next(error); }
});

router.get('/retours/:id', async (request, response, next) => {
  try {
    const row = await prisma.retourCuve.findFirst({ where: { id: Number(request.params.id), ...scopeToMagasin(request, {}) }, include: { equipe: true, caisse: true, vendeur: true, details: { include: { pompe: true, cuve: true } } } });
    if (!row) { response.status(404).json({ message: 'Retour cuve introuvable.' }); return; }
    response.json({ ...row, totalVolume: asNumber(row.totalVolume), totalValeur: asNumber(row.totalValeur), details: row.details.map((line) => ({ ...line, volume: asNumber(line.volume), valeur: asNumber(line.valeur), tauxTVA: asNumber(line.tauxTVA) })) });
  } catch (error) { next(error); }
});

router.patch('/retours/:id/valider', requireRole('gerant'), async (request, response, next) => {
  try {
    const row = await prisma.retourCuve.updateMany({ where: { id: Number(request.params.id), ...scopeToMagasin(request, {}) }, data: { valide: true } });
    if (!row.count) { response.status(404).json({ message: 'Retour cuve introuvable.' }); return; }
    response.json({ valide: true });
  } catch (error) { next(error); }
});

router.post('/inventaires', requireRole('gerant'), async (request, response, next) => {
  try {
    const input = inventaireCarburantSchema.parse(request.body);
    const cuves = await prisma.cuve.findMany({ where: { id: { in: input.lignes.map((line) => line.cuveId) }, ...scopeToMagasin(request, {}) } });
    const cuveMap = new Map(cuves.map((cuve) => [cuve.id, cuve]));
    if (cuveMap.size !== new Set(input.lignes.map((line) => line.cuveId)).size) { response.status(400).json({ message: 'Une cuve est introuvable ou hors magasin.' }); return; }
    const rows = input.lignes.map((line) => { const cuve = cuveMap.get(line.cuveId)!; const physical = new Prisma.Decimal(line.stockPhysique); return { cuveId: line.cuveId, stockPhysique: physical, stockComptable: cuve.stock, prixUnitaire: cuve.prixAchatHT, valeur: physical.times(cuve.prixAchatHT), ecart: physical.minus(cuve.stock) }; });
    const valeurStock = rows.reduce((sum, line) => sum.plus(line.valeur), new Prisma.Decimal(0));
    const created = await prisma.inventaireCarburant.create({ data: { date: new Date(`${input.date}T00:00:00.000Z`), operateur: input.operateur, valeurStock, magasinId: await activeMagasinId(request), lignes: { create: rows.map((line) => ({ ...line, date: new Date(`${input.date}T00:00:00.000Z`) })) } }, include: { lignes: { include: { cuve: true } } } });
    response.status(201).json({ ...created, valeurStock: asNumber(created.valeurStock), lignes: created.lignes.map((line) => ({ ...line, stockPhysique: asNumber(line.stockPhysique), stockComptable: asNumber(line.stockComptable), prixUnitaire: asNumber(line.prixUnitaire), valeur: asNumber(line.valeur), ecart: asNumber(line.ecart) })) });
  } catch (error) { next(error); }
});

router.get('/inventaires', async (request, response, next) => {
  try { const rows = await prisma.inventaireCarburant.findMany({ where: scopeToMagasin(request, {}), orderBy: { date: 'desc' } }); response.json(rows.map((row) => ({ ...row, valeurStock: asNumber(row.valeurStock) }))); } catch (error) { next(error); }
});

router.get('/inventaires/:id', async (request, response, next) => {
  try { const row = await prisma.inventaireCarburant.findFirst({ where: { id: Number(request.params.id), ...scopeToMagasin(request, {}) }, include: { lignes: { include: { cuve: true } } } }); if (!row) { response.status(404).json({ message: 'Inventaire carburant introuvable.' }); return; } response.json({ ...row, valeurStock: asNumber(row.valeurStock), lignes: row.lignes.map((line) => ({ ...line, stockPhysique: asNumber(line.stockPhysique), stockComptable: asNumber(line.stockComptable), prixUnitaire: asNumber(line.prixUnitaire), valeur: asNumber(line.valeur), ecart: asNumber(line.ecart) })) }); } catch (error) { next(error); }
});

router.patch('/inventaires/:id/cloturer', requireRole('gerant'), async (request, response, next) => {
  try {
    const inventory = await prisma.inventaireCarburant.findFirst({ where: { id: Number(request.params.id), ...scopeToMagasin(request, {}) }, include: { lignes: true } });
    if (!inventory) { response.status(404).json({ message: 'Inventaire carburant introuvable.' }); return; }
    if (inventory.cloture) { response.status(409).json({ message: 'Inventaire deja cloture.' }); return; }
    await prisma.$transaction(async (transaction) => { for (const line of inventory.lignes) await transaction.cuve.update({ where: { id: line.cuveId }, data: { stock: line.stockPhysique } }); await transaction.inventaireCarburant.update({ where: { id: inventory.id }, data: { cloture: true } }); });
    response.json({ id: inventory.id, cloture: true });
  } catch (error) { next(error); }
});

router.post('/jaugeages', requireRole('caissier', 'gerant'), async (request, response, next) => {
  try {
    const input = jaugeageSchema.parse(request.body);
    const team = input.equipeId ?? (await prisma.equipe.findFirst({ where: scopeToMagasin(request, { actif: true }), orderBy: { id: 'asc' } }))?.id;
    const caisse = input.caisseId ?? (await prisma.caisse.findFirst({ where: scopeToMagasin(request, { actif: true }), orderBy: { id: 'asc' } }))?.id;
    if (!team || !caisse) { response.status(400).json({ message: 'Une equipe et une caisse sont requises.' }); return; }
    const row = await prisma.jaugeage.create({ data: { date: new Date(`${input.date}T00:00:00.000Z`), cuveId: input.cuveId, equipeId: team, caisseId: caisse, niveau: new Prisma.Decimal(input.quantite), quantite: new Prisma.Decimal(input.quantite) }, include: { cuve: true } });
    response.status(201).json({ ...row, niveau: asNumber(row.niveau), quantite: asNumber(row.quantite), ecart: asNumber(row.quantite.minus(row.cuve.stock)) });
  } catch (error) { next(error); }
});

router.post('/jaugeages/batch', requireRole('caissier', 'gerant'), async (request, response, next) => {
  try { const input = jaugeagesSchema.parse(request.body); const equipeId = input.equipeId ?? (await prisma.equipe.findFirst({ where: scopeToMagasin(request, { actif: true }), orderBy: { id: 'asc' } }))?.id; const caisseId = input.caisseId ?? (await prisma.caisse.findFirst({ where: scopeToMagasin(request, { actif: true }), orderBy: { id: 'asc' } }))?.id; if (!equipeId || !caisseId) { response.status(400).json({ message: 'Une equipe et une caisse sont requises.' }); return; } const rows = []; for (const line of input.lignes) { const result = await prisma.jaugeage.create({ data: { date: new Date(`${input.date}T00:00:00.000Z`), cuveId: line.cuveId, equipeId, caisseId, niveau: new Prisma.Decimal(line.quantite), quantite: new Prisma.Decimal(line.quantite) }, include: { cuve: true } }); rows.push({ ...result, quantite: asNumber(result.quantite), stock: asNumber(result.cuve.stock), ecart: asNumber(result.quantite.minus(result.cuve.stock)) }); } response.status(201).json(rows); } catch (error) { next(error); }
});

router.get('/jaugeages', async (request, response, next) => {
  try { const filter = jaugeageFilterSchema.parse(request.query); const rows = await prisma.jaugeage.findMany({ where: { cuveId: filter.cuveId, date: filter.date ? new Date(`${filter.date}T00:00:00.000Z`) : filter.dateFrom || filter.dateTo ? { gte: filter.dateFrom ? new Date(`${filter.dateFrom}T00:00:00.000Z`) : undefined, lte: filter.dateTo ? new Date(`${filter.dateTo}T23:59:59.999Z`) : undefined } : undefined, cuve: scopeToMagasin(request, {}) }, include: { cuve: true }, orderBy: { date: 'desc' } }); response.json(rows.map((row) => ({ ...row, niveau: asNumber(row.niveau), quantite: asNumber(row.quantite), cuve: { ...row.cuve, stock: asNumber(row.cuve.stock) } }))); } catch (error) { next(error); }
});

router.get('/jaugeages/ecarts', async (request, response, next) => {
  try { const filter = jaugeageFilterSchema.parse(request.query); if (!filter.date) { response.status(400).json({ message: 'La date est requise.' }); return; } const rows = await prisma.jaugeage.findMany({ where: { date: new Date(`${filter.date}T00:00:00.000Z`), cuve: scopeToMagasin(request, {}) }, include: { cuve: true } }); response.json(rows.map((row) => { const ecart = Number(row.quantite.minus(row.cuve.stock)); return { cuveId: row.cuveId, cuve: row.cuve.libelle, stock: Number(row.cuve.stock), quantite: Number(row.quantite), ecart, alerte: Math.abs(ecart) > 100 }; })); } catch (error) { next(error); }
});
