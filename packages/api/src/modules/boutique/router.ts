import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole, scopeToMagasin } from '../../middleware/auth.js';
import { emitSocketEvent } from '../../lib/socket.js';
import { SOCKET_EVENTS } from '../../lib/socket-events.js';
import { achatSchema, familleSchema, filterSchema, inventSchema, produitSchema, transfertSchema } from './boutique.schema.js';

const router = Router();
const read = [requireAuth];
const cashier = [requireAuth, requireRole('caissier', 'gerant')];
const manager = [requireAuth, requireRole('gerant')];
const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const numberValue = (value: Prisma.Decimal | number | null | undefined) => value == null ? null : Number(value);
const dateFilter = (from?: string, to?: string) => ({ ...(from || to ? { gte: from ? toDate(from) : undefined, lte: to ? toDate(to) : undefined } : {}) });

router.get('/produits', ...read, async (request, response, next) => {
  try { const familleId = request.query.familleId ? Number(request.query.familleId) : undefined; const products = await prisma.produit.findMany({ where: { actif: true, familleId }, include: { famille: true, fournisseur: true }, orderBy: { libelle: 'asc' } }); response.json(products.map((product) => ({ ...product, prixAchatHT: numberValue(product.prixAchatHT), prixVenteHT: numberValue(product.prixVenteHT), tva: numberValue(product.tva), tauxTVA: numberValue(product.tauxTVA), stock: numberValue(product.stock) }))); } catch (error) { next(error); }
});

router.post('/produits', ...manager, async (request, response, next) => {
  try { const input = produitSchema.parse(request.body); const product = await prisma.produit.create({ data: { ...input, prixAchatHT: new Prisma.Decimal(input.prixAchatHT), prixVenteHT: new Prisma.Decimal(input.prixVenteHT), tva: new Prisma.Decimal(input.tauxTVA), tauxTVA: new Prisma.Decimal(input.tauxTVA) } }); response.status(201).json({ ...product, stock: numberValue(product.stock) }); } catch (error) { next(error); }
});

router.put('/produits/:id', ...manager, async (request, response, next) => {
  try { const input = produitSchema.partial().parse(request.body); const product = await prisma.produit.update({ where: { id: Number(request.params.id) }, data: { ...input, ...(input.prixAchatHT === undefined ? {} : { prixAchatHT: new Prisma.Decimal(input.prixAchatHT) }), ...(input.prixVenteHT === undefined ? {} : { prixVenteHT: new Prisma.Decimal(input.prixVenteHT) }), ...(input.tauxTVA === undefined ? {} : { tva: new Prisma.Decimal(input.tauxTVA), tauxTVA: new Prisma.Decimal(input.tauxTVA) }), ...(input.stock === undefined ? {} : { stock: new Prisma.Decimal(input.stock) }) } }); if (input.stock !== undefined) { const stockActuel = Number(product.stock); emitSocketEvent(request.user?.magasinId, SOCKET_EVENTS.STOCK_PRODUIT_UPDATED, { produitId: product.id, libelle: product.libelle, stockActuel }); if (stockActuel <= 5) emitSocketEvent(request.user?.magasinId, SOCKET_EVENTS.ALERT_STOCK_BAS, { type: 'produit', id: product.id, nom: product.libelle, stockActuel }); } response.json({ ...product, stock: numberValue(product.stock) }); } catch (error) { next(error); }
});

router.get('/familles-produits', ...read, async (_request, response, next) => {
  try { response.json(await prisma.familleProduit.findMany({ orderBy: { libelle: 'asc' } })); } catch (error) { next(error); }
});

router.post('/familles-produits', ...manager, async (request, response, next) => {
  try { response.status(201).json(await prisma.familleProduit.create({ data: familleSchema.parse(request.body) })); } catch (error) { next(error); }
});

router.post('/achats-produits', ...cashier, async (request, response, next) => {
  try {
    const input = achatSchema.parse(request.body);
    const productIds = input.lignes.map((line) => line.produitId);
    const products = await prisma.produit.findMany({ where: { id: { in: productIds }, actif: true } });
    if (products.length !== new Set(productIds).size) { response.status(400).json({ message: 'Un produit est introuvable ou inactif.' }); return; }
    const totalHT = input.lignes.reduce((sum, line) => sum + line.quantite * line.prixAchat, 0);
    const totalTTC = input.lignes.reduce((sum, line) => sum + line.quantite * line.prixAchat * (1 + line.tauxTVA / 100), 0);
    const purchase = await prisma.$transaction(async (transaction) => {
      const created = await transaction.achatProd.create({ data: { magasinId: request.user?.magasinId, fournisseurId: input.fournisseurId, dateAchat: toDate(input.dateAchat), dateFacture: input.dateFacture ? toDate(input.dateFacture) : undefined, numFacture: input.numFacture, totalTTC: new Prisma.Decimal(totalTTC), totHT: new Prisma.Decimal(totalHT), valide: input.valide, details: { create: input.lignes.map((line) => ({ produitId: line.produitId, date: toDate(input.dateAchat), quantite: new Prisma.Decimal(line.quantite), prixAchat: new Prisma.Decimal(line.prixAchat), tauxTVA: new Prisma.Decimal(line.tauxTVA), valide: input.valide })) } }, include: { details: true } });
      const updatedProducts = []; for (const line of input.lignes) updatedProducts.push(await transaction.produit.update({ where: { id: line.produitId }, data: { stock: { increment: new Prisma.Decimal(line.quantite) }, prixAchatHT: new Prisma.Decimal(line.prixAchat) } }));
      return { purchase: created, products: updatedProducts };
    });
    for (const product of purchase.products) { const stockActuel = Number(product.stock); emitSocketEvent(request.user?.magasinId, SOCKET_EVENTS.STOCK_PRODUIT_UPDATED, { produitId: product.id, libelle: product.libelle, stockActuel }); if (stockActuel <= 5) emitSocketEvent(request.user?.magasinId, SOCKET_EVENTS.ALERT_STOCK_BAS, { type: 'produit', id: product.id, nom: product.libelle, stockActuel }); }
    if (input.valide) emitSocketEvent(request.user?.magasinId, SOCKET_EVENTS.ACHAT_PRODUIT_VALIDATED, { achatId: purchase.purchase.id, produits: purchase.products.map((product) => ({ produitId: product.id, newStock: Number(product.stock) })) });
    response.status(201).json({ ...purchase.purchase, totalTTC: numberValue(purchase.purchase.totalTTC), totHT: numberValue(purchase.purchase.totHT) });
  } catch (error) { next(error); }
});

router.get('/achats-produits', ...read, async (request, response, next) => {
  try { const filter = filterSchema.parse(request.query); const purchases = await prisma.achatProd.findMany({ where: scopeToMagasin(request, { fournisseurId: filter.fournisseurId, dateAchat: dateFilter(filter.dateFrom, filter.dateTo) }), include: { fournisseur: true, details: { include: { produit: true } } }, orderBy: { dateAchat: 'desc' } }); response.json(purchases.map((purchase) => ({ ...purchase, totalTTC: numberValue(purchase.totalTTC), totHT: numberValue(purchase.totHT), reste: numberValue(purchase.reste) }))); } catch (error) { next(error); }
});

router.post('/inventaires', ...read, async (request, response, next) => {
  try {
    const input = inventSchema.parse(request.body);
    const products = await prisma.produit.findMany({ where: { id: { in: input.lignes.map((line) => line.produitId) } } });
    const map = new Map(products.map((product) => [product.id, product]));
    if (map.size !== new Set(input.lignes.map((line) => line.produitId)).size) { response.status(400).json({ message: 'Un produit inventorie est introuvable.' }); return; }
    const inventory = await prisma.invent.create({ data: { date: toDate(input.date), operateur: input.operateur, valeurStock: new Prisma.Decimal(input.lignes.reduce((sum, line) => sum + line.stockInventaire * Number(map.get(line.produitId)!.prixAchatHT), 0)), lignes: { create: input.lignes.map((line) => { const product = map.get(line.produitId)!; return { produitId: line.produitId, date: toDate(input.date), stockTheorique: product.stock, stockInventaire: new Prisma.Decimal(line.stockInventaire), valeurTheorique: product.stock.times(product.prixAchatHT), ecartStock: new Prisma.Decimal(line.stockInventaire).minus(product.stock), familleId: product.familleId }; }) } }, include: { lignes: true } });
    response.status(201).json({ ...inventory, valeurStock: numberValue(inventory.valeurStock) });
  } catch (error) { next(error); }
});

router.patch('/inventaires/:id/cloturer', ...manager, async (request, response, next) => {
  try {
    const inventory = await prisma.invent.findUnique({ where: { id: Number(request.params.id) }, include: { lignes: true } });
    if (!inventory) { response.status(404).json({ message: 'Inventaire introuvable.' }); return; }
    if (inventory.cloture) { response.status(409).json({ message: 'Inventaire deja cloture.' }); return; }
    const updated = await prisma.$transaction(async (transaction) => { for (const line of inventory.lignes) await transaction.produit.update({ where: { id: line.produitId }, data: { stock: line.stockInventaire } }); return transaction.invent.update({ where: { id: inventory.id }, data: { cloture: true } }); });
    response.json(updated);
  } catch (error) { next(error); }
});

router.get('/inventaires', ...read, async (_request, response, next) => {
  try { const inventories = await prisma.invent.findMany({ include: { user: true }, orderBy: { date: 'desc' } }); response.json(inventories.map((inventory) => ({ ...inventory, valeurStock: numberValue(inventory.valeurStock), operateurNom: inventory.user.nom }))); } catch (error) { next(error); }
});

router.get('/ventes/resume', ...read, async (request, response, next) => {
  try { const filter = filterSchema.parse(request.query); const sales = await prisma.carProdSiege.findMany({ where: { date: dateFilter(filter.dateFrom, filter.dateTo), equipeId: filter.equipeId }, select: { numVente: true, prixVenteTTC: true, prixAchatTTC: true, quantite: true, marge: true, codeFamille: true } }); const totalCA = sales.reduce((sum, sale) => sum + Number(sale.prixVenteTTC) * Number(sale.quantite), 0); const totalMarge = sales.reduce((sum, sale) => sum + Number(sale.marge) * Number(sale.quantite), 0); const familles = new Map<string, number>(); sales.forEach((sale) => familles.set(sale.codeFamille ?? 'Sans famille', (familles.get(sale.codeFamille ?? 'Sans famille') ?? 0) + Number(sale.prixVenteTTC) * Number(sale.quantite))); response.json({ totalCA, totalMarge, nombreVentes: new Set(sales.map((sale) => sale.numVente)).size, margePourcentage: totalCA ? totalMarge / totalCA * 100 : 0, parFamille: [...familles.entries()].map(([famille, ca]) => ({ famille, ca })) }); } catch (error) { next(error); }
});

router.post('/transferts', ...manager, async (request, response, next) => {
  try { const input = transfertSchema.parse(request.body); const transfer = await prisma.$transaction(async (transaction) => { const created = await transaction.transEtranger.create({ data: { fournisseurId: input.fournisseurId, dateTransfert: toDate(input.dateTransfert), op: input.op, valide: input.valide, details: { create: input.lignes.map((line) => ({ produitId: line.produitId, quantite: new Prisma.Decimal(line.quantite), prixUnitaire: new Prisma.Decimal(line.prixUnitaire) })) } }, include: { details: true } }); for (const line of input.lignes) await transaction.produit.update({ where: { id: line.produitId }, data: { stock: { decrement: new Prisma.Decimal(line.quantite) } } }); return created; }); response.status(201).json(transfer); } catch (error) { next(error); }
});

export default router;
