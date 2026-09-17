import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { emitSocketEvent } from '../../lib/socket.js';
import { SOCKET_EVENTS } from '../../lib/socket-events.js';
import { bonLivraisonSchema, clientSchema, listFilterSchema, reglementSchema } from './clients.schema.js';

const router = Router();
const access = [requireAuth];
const commercialAccess = [requireAuth, requireRole('caissier', 'gerant')];
const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const numberValue = (value: Prisma.Decimal | number | null | undefined) => value == null ? null : Number(value);
const dateFilter = (dateFrom?: string, dateTo?: string) => ({ ...(dateFrom || dateTo ? { gte: dateFrom ? toDate(dateFrom) : undefined, lte: dateTo ? toDate(dateTo) : undefined } : {}) });

async function clientBalance(clientId: number) {
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { soldeAnterieur: true } });
  if (!client) return null;
  const [credits, reglements] = await Promise.all([
    prisma.detailCredit.aggregate({ where: { clientId }, _sum: { montant: true } }),
    prisma.detailReglements.aggregate({ where: { clientId, valide: true }, _sum: { montant: true } }),
  ]);
  return Number(client.soldeAnterieur) + Number(credits._sum.montant ?? 0) - Number(reglements._sum.montant ?? 0);
}

router.get('/produits', ...access, async (_request, response, next) => {
  try { response.json(await prisma.produit.findMany({ where: { actif: true }, orderBy: { libelle: 'asc' }, select: { id: true, code: true, libelle: true, prixVenteHT: true, tva: true } })); } catch (error) { next(error); }
});

router.get('/clients', ...access, async (_request, response, next) => {
  try {
    const clients = await prisma.client.findMany({ orderBy: { nomClient: 'asc' } });
    const balances = await Promise.all(clients.map((client) => clientBalance(client.id)));
    response.json(clients.map((client, index) => ({ ...client, quota: numberValue(client.quota), soldeAnterieur: numberValue(client.soldeAnterieur), tva: numberValue(client.tva), soldeActuel: balances[index] })));
  } catch (error) { next(error); }
});

router.get('/clients/:id', ...access, async (request, response, next) => {
  try {
    const clientId = Number(request.params.id);
    const client = await prisma.client.findUnique({ where: { id: clientId }, include: { bonsLivraison: { include: { lignes: { include: { produit: true } } }, orderBy: { date: 'desc' } }, factures: { include: { lignes: { include: { produit: true } } }, orderBy: { date: 'desc' } }, reglements: { orderBy: { date: 'desc' } }, impayes: { orderBy: { echeance: 'asc' } } } });
    if (!client) { response.status(404).json({ message: 'Client introuvable.' }); return; }
    response.json({ ...client, quota: numberValue(client.quota), soldeAnterieur: numberValue(client.soldeAnterieur), tva: numberValue(client.tva), soldeActuel: await clientBalance(clientId), bonsLivraison: client.bonsLivraison.map((bon) => ({ ...bon, totalHT: numberValue(bon.totalHT), totalTTC: numberValue(bon.totalTTC), totTVA: numberValue(bon.totTVA), lignes: bon.lignes.map((line) => ({ ...line, puHT: numberValue(line.puHT), tva: numberValue(line.tva), qte: numberValue(line.qte), remise: numberValue(line.remise), ttc: numberValue(line.ttc) })) })), factures: client.factures.map((facture) => ({ ...facture, totalHT: numberValue(facture.totalHT), totalTTC: numberValue(facture.totalTTC), totTVA: numberValue(facture.totTVA), mtTimbre: numberValue(facture.mtTimbre) })), reglements: client.reglements.map((reglement) => ({ ...reglement, montant: numberValue(reglement.montant) })), impayes: client.impayes.map((impaye) => ({ ...impaye, montantLigne: numberValue(impaye.montantLigne) })) });
  } catch (error) { next(error); }
});

router.post('/clients', ...access, requireRole('gerant'), async (request, response, next) => {
  try { const client = await prisma.client.create({ data: clientSchema.parse(request.body) }); response.status(201).json({ ...client, quota: numberValue(client.quota), soldeAnterieur: numberValue(client.soldeAnterieur), tva: numberValue(client.tva) }); } catch (error) { next(error); }
});

router.put('/clients/:id', ...access, requireRole('gerant'), async (request, response, next) => {
  try { const client = await prisma.client.update({ where: { id: Number(request.params.id) }, data: clientSchema.parse(request.body) }); response.json({ ...client, quota: numberValue(client.quota), soldeAnterieur: numberValue(client.soldeAnterieur), tva: numberValue(client.tva) }); } catch (error) { next(error); }
});

router.post('/bons-livraison', ...commercialAccess, async (request, response, next) => {
  try {
    const input = bonLivraisonSchema.parse(request.body);
    const client = await prisma.client.findUnique({ where: { id: input.clientId } });
    if (!client) { response.status(404).json({ message: 'Client introuvable.' }); return; }
    const products = await prisma.produit.findMany({ where: { id: { in: input.lignes.map((line) => line.idProduit) }, actif: true } });
    if (products.length !== new Set(input.lignes.map((line) => line.idProduit)).size) { response.status(400).json({ message: 'Un produit est introuvable ou inactif.' }); return; }
    const productMap = new Map(products.map((product) => [product.id, product]));
    const totals = input.lignes.reduce((total, line) => { const tva = line.tva; const ht = Math.max(0, line.puHT * line.qte - line.remise); total.ht += ht; total.tva += ht * tva / 100; total.ttc += ht * (1 + tva / 100); return total; }, { ht: 0, tva: 0, ttc: 0 });
    const currentBalance = await clientBalance(input.clientId);
    if (Number(client.quota) > 0 && (currentBalance ?? 0) + totals.ttc > Number(client.quota)) { response.status(409).json({ message: 'Le quota client serait depasse.', quota: Number(client.quota), soldeActuel: currentBalance }); return; }
    const bon = await prisma.bonliv.create({ data: { date: toDate(input.date), clientId: input.clientId, totalHT: new Prisma.Decimal(totals.ht), totalTTC: new Prisma.Decimal(totals.ttc), totTVA: new Prisma.Decimal(totals.tva), lignes: { create: input.lignes.map((line, index) => { const ht = Math.max(0, line.puHT * line.qte - line.remise); return { numLigne: index + 1, idProduit: line.idProduit, puHT: new Prisma.Decimal(line.puHT), tva: new Prisma.Decimal(line.tva), qte: new Prisma.Decimal(line.qte), remise: new Prisma.Decimal(line.remise), ttc: new Prisma.Decimal(ht * (1 + line.tva / 100)), date: toDate(input.date) }; }) } }, include: { client: true, lignes: true } });
    response.status(201).json({ ...bon, totalHT: numberValue(bon.totalHT), totalTTC: numberValue(bon.totalTTC), totTVA: numberValue(bon.totTVA), lignes: bon.lignes.map((line) => ({ ...line, puHT: numberValue(line.puHT), tva: numberValue(line.tva), qte: numberValue(line.qte), remise: numberValue(line.remise), ttc: numberValue(line.ttc) })) });
  } catch (error) { next(error); }
});

router.get('/bons-livraison', ...access, async (request, response, next) => {
  try { const filter = listFilterSchema.parse(request.query); const bons = await prisma.bonliv.findMany({ where: { clientId: filter.clientId, date: dateFilter(filter.dateFrom, filter.dateTo) }, include: { client: true }, orderBy: { date: 'desc' } }); response.json(bons.map((bon) => ({ ...bon, totalHT: numberValue(bon.totalHT), totalTTC: numberValue(bon.totalTTC), totTVA: numberValue(bon.totTVA) }))); } catch (error) { next(error); }
});

router.post('/bons-livraison/:id/facturer', ...commercialAccess, async (request, response, next) => {
  try {
    const bon = await prisma.bonliv.findUnique({ where: { id: Number(request.params.id) }, include: { lignes: true } });
    if (!bon) { response.status(404).json({ message: 'Bon de livraison introuvable.' }); return; }
    if (bon.numFact) { response.status(409).json({ message: 'Ce bon est deja facture.', factureId: bon.numFact }); return; }
    const facture = await prisma.$transaction(async (transaction) => {
      const created = await transaction.facture.create({ data: { date: bon.date, clientId: bon.clientId, totalHT: bon.totalHT, totalTTC: bon.totalTTC, totTVA: bon.totTVA, numBL: bon.id, lignes: { create: bon.lignes.map((line) => ({ numLigne: line.numLigne, idProduit: line.idProduit, puHT: line.puHT, qte: line.qte, ttc: line.ttc, date: line.date })) } } });
      await transaction.bonliv.update({ where: { id: bon.id }, data: { numFact: created.id } });
      return created;
    });
    response.status(201).json({ ...facture, totalHT: numberValue(facture.totalHT), totalTTC: numberValue(facture.totalTTC), totTVA: numberValue(facture.totTVA), mtTimbre: numberValue(facture.mtTimbre) });
  } catch (error) { next(error); }
});

router.get('/factures', ...access, async (request, response, next) => {
  try { const filter = listFilterSchema.parse(request.query); const factures = await prisma.facture.findMany({ where: { clientId: filter.clientId, date: dateFilter(filter.dateFrom, filter.dateTo) }, include: { client: true }, orderBy: { date: 'desc' } }); response.json(factures.map((facture) => ({ ...facture, totalHT: numberValue(facture.totalHT), totalTTC: numberValue(facture.totalTTC), totTVA: numberValue(facture.totTVA), mtTimbre: numberValue(facture.mtTimbre), statut: 'impayee' }))); } catch (error) { next(error); }
});

router.post('/reglements', ...commercialAccess, async (request, response, next) => {
  try {
    const input = reglementSchema.parse(request.body);
    const result = await prisma.$transaction(async (transaction) => {
      const reglement = await transaction.detailReglements.create({ data: { clientId: input.clientId, equipeId: input.equipeId, caisseId: input.caisseId, date: toDate(input.date), montant: new Prisma.Decimal(input.montant), modePayment: input.modePayment, echeance: input.echeance ? toDate(input.echeance) : undefined, impaye: input.impaye, valide: input.valide } });
      const impaye = input.impaye || input.echeance ? await transaction.impayes.create({ data: { numReg: reglement.id, clientId: input.clientId, dateReg: toDate(input.date), montantLigne: new Prisma.Decimal(input.montant), echeance: input.echeance ? toDate(input.echeance) : undefined, numCheque: input.numCheque, numRib: input.numRib, nomBanque: input.nomBanque, impaye: input.impaye, valide: input.valide } }) : null;
      return { reglement, impaye };
    });
    if (result.impaye) { const client = await prisma.client.findUnique({ where: { id: result.impaye.clientId }, select: { nomClient: true } }); if (client) emitSocketEvent(request.user?.magasinId, SOCKET_EVENTS.ALERT_IMPAYE, { clientId: result.impaye.clientId, nomClient: client.nomClient, montant: Number(result.impaye.montantLigne), echeance: result.impaye.echeance?.toISOString().slice(0, 10) ?? null }); }
    response.status(201).json({ ...result.reglement, montant: numberValue(result.reglement.montant) });
  } catch (error) { next(error); }
});

router.get('/impayes', ...access, async (request, response, next) => {
  try { const clientId = request.query.clientId ? Number(request.query.clientId) : undefined; const impayes = await prisma.impayes.findMany({ where: { impaye: true, clientId }, include: { client: true }, orderBy: { echeance: 'asc' } }); const now = Date.now(); response.json(impayes.map((item) => ({ ...item, montantLigne: numberValue(item.montantLigne), joursRetard: item.echeance ? Math.max(0, Math.floor((now - item.echeance.getTime()) / 86400000)) : 0 }))); } catch (error) { next(error); }
});

export default router;
