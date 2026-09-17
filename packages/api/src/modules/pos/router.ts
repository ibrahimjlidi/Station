import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { emitSocketEvent } from '../../lib/socket.js';
import { SOCKET_EVENTS } from '../../lib/socket-events.js';
import { requireAuth, requireRole, scopeToMagasin } from '../../middleware/auth.js';
import { discountSchema, promotionSchema, returnSchema, ticketSchema, type TicketInput } from './schema.js';

const router = Router();
const access = [requireAuth, requireRole('caissier', 'gerant')];
const dateValue = (value: string) => new Date(`${value}T00:00:00.000Z`);
const numberValue = (value: Prisma.Decimal | null | undefined) => value == null ? null : Number(value);
const fail = (message: string, statusCode: number, code?: string) => Object.assign(new Error(message), { statusCode, code });

router.post('/tickets', ...access, async (request, response, next) => {
  try {
    const input = ticketSchema.parse(request.body);
    const result = await prisma.$transaction(async (tx) => {
      const [caisse, equipe, vendeur, products, modes] = await Promise.all([
        tx.caisse.findFirst({ where: { id: input.caisseId, type: 'POS', actif: true, ...scopeToMagasin(request, {}) } }),
        tx.equipe.findFirst({ where: { id: input.equipeId, actif: true, ...scopeToMagasin(request, {}) } }),
        tx.vendeur.findFirst({ where: { id: input.vendeurId, actif: true, ...scopeToMagasin(request, {}) } }),
        tx.produit.findMany({ where: { id: { in: input.lignes.map((line) => line.produitId) }, actif: true } }),
        tx.modePayment.findMany({ where: { id: { in: input.paiements.map((payment) => payment.modePaymentId) } } }),
      ]);
      if (!caisse || !equipe || !vendeur) throw fail('La caisse POS, l equipe ou le vendeur est invalide.', 400, 'POS_REFERENCE_INVALID');
      if (products.length !== new Set(input.lignes.map((line) => line.produitId)).size || modes.length !== new Set(input.paiements.map((payment) => payment.modePaymentId)).size) throw fail('Produit ou mode de paiement invalide.', 400, 'POS_REFERENCE_INVALID');
      const productMap = new Map(products.map((product) => [product.id, product]));
      const promotion = input.promotionId ? await tx.promotion.findFirst({ where: { id: input.promotionId, actif: true, produits: { some: { produitId: { in: input.lignes.map((line) => line.produitId) } } } } }) : null;
      const lines = input.lignes.map((line) => {
        const product = productMap.get(line.produitId)!;
        const lineDiscount = new Prisma.Decimal(line.remise).plus(promotion?.remise ?? 0);
        const total = new Prisma.Decimal(product.prixVenteHT).times(line.quantite).times(new Prisma.Decimal(1).plus(product.tauxTVA.div(100))).minus(lineDiscount);
        if (lineDiscount.greaterThan(new Prisma.Decimal(product.prixVenteHT).times(line.quantite))) throw fail('La remise depasse le montant de la ligne.', 400, 'DISCOUNT_INVALID');
        if (product.stock.lessThan(new Prisma.Decimal(line.quantite))) throw fail(`Stock insuffisant pour ${product.libelle}.`, 409, 'STOCK_NEGATIF');
        return { input: line, product, lineDiscount, total };
      });
      const totalHT = lines.reduce((sum, line) => sum.plus(new Prisma.Decimal(line.product.prixVenteHT).times(line.input.quantite).minus(line.lineDiscount)), new Prisma.Decimal(0));
      const totalTTC = lines.reduce((sum, line) => sum.plus(line.total), new Prisma.Decimal(0)).minus(input.remise);
      const paid = input.paiements.reduce((sum, payment) => sum.plus(payment.montant), new Prisma.Decimal(0));
      if (!paid.equals(totalTTC)) throw fail(`Le paiement (${paid.toFixed(3)}) doit egaler le total (${totalTTC.toFixed(3)}).`, 400, 'PAYMENT_TOTAL_INVALID');
      const ticket = await tx.pOSTicket.create({ data: { caisseId: caisse.id, equipeId: equipe.id, vendeurId: vendeur.id, date: input.date ? dateValue(input.date) : new Date(), totalHT, totalTTC, remise: new Prisma.Decimal(input.remise).plus(lines.reduce((sum, line) => sum.plus(line.lineDiscount), new Prisma.Decimal(0))), lignes: { create: lines.map((line) => ({ produitId: line.product.id, quantite: new Prisma.Decimal(line.input.quantite), prixUnitaire: line.product.prixVenteHT, remise: line.lineDiscount, total: line.total })) }, paiements: { create: input.paiements.map((payment) => ({ modePaymentId: payment.modePaymentId, montant: new Prisma.Decimal(payment.montant) })) } }, include: { lignes: true, paiements: true } });
      for (const line of lines) await tx.produit.update({ where: { id: line.product.id }, data: { stock: { decrement: new Prisma.Decimal(line.input.quantite) } } });
      return ticket;
    });
    emitSocketEvent(request.user?.magasinId, SOCKET_EVENTS.STOCK_PRODUIT_UPDATED, { ticketId: result.id });
    response.status(201).json({ ...result, totalHT: numberValue(result.totalHT), totalTTC: numberValue(result.totalTTC), remise: numberValue(result.remise), lignes: result.lignes.map((line) => ({ ...line, quantite: numberValue(line.quantite), prixUnitaire: numberValue(line.prixUnitaire), remise: numberValue(line.remise), total: numberValue(line.total) })) });
  } catch (error) { next(error); }
});

router.get('/tickets', ...access, async (request, response, next) => {
  try { const rows = await prisma.pOSTicket.findMany({ where: { caisse: scopeToMagasin(request, {}), statut: request.query.statut ? String(request.query.statut) : undefined }, include: { caisse: true, equipe: true, vendeur: true }, orderBy: { date: 'desc' } }); response.json(rows.map((row) => ({ ...row, totalHT: numberValue(row.totalHT), totalTTC: numberValue(row.totalTTC), remise: numberValue(row.remise) }))); } catch (error) { next(error); }
});

router.get('/tickets/:id', ...access, async (request, response, next) => {
  try { const row = await prisma.pOSTicket.findFirst({ where: { id: Number(request.params.id), caisse: scopeToMagasin(request, {}) }, include: { lignes: { include: { produit: true } }, paiements: { include: { modePayment: true } }, caisse: true, equipe: true, vendeur: true } }); if (!row) { response.status(404).json({ message: 'Ticket POS introuvable.' }); return; } response.json({ ...row, totalHT: numberValue(row.totalHT), totalTTC: numberValue(row.totalTTC), remise: numberValue(row.remise) }); } catch (error) { next(error); }
});

router.post('/tickets/:id/annuler', ...access, async (request, response, next) => {
  try {
    await prisma.$transaction(async (tx) => {
      const ticket = await tx.pOSTicket.findFirst({ where: { id: Number(request.params.id), statut: 'VALIDE', caisse: scopeToMagasin(request, {}) }, include: { lignes: true } });
      if (!ticket) throw fail('Ticket POS introuvable ou deja annule.', 404, 'TICKET_INVALID');
      await tx.pOSTicket.update({ where: { id: ticket.id }, data: { statut: 'ANNULE' } });
      for (const line of ticket.lignes) await tx.produit.update({ where: { id: line.produitId }, data: { stock: { increment: line.quantite } } });
    });
    response.json({ statut: 'ANNULE' });
  } catch (error) { next(error); }
});

router.post('/tickets/:id/retour', ...access, async (request, response, next) => {
  try {
    const input = returnSchema.parse(request.body);
    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.pOSTicket.findFirst({ where: { id: Number(request.params.id), statut: 'VALIDE', caisse: scopeToMagasin(request, {}) }, include: { lignes: true } });
      if (!ticket) throw fail('Ticket POS introuvable ou non retournable.', 404, 'TICKET_INVALID');
      const lineMap = new Map(ticket.lignes.map((line) => [line.id, line]));
      const lines = input.lignes.map((line) => { const ticketLine = lineMap.get(line.ticketLineId); if (!ticketLine || new Prisma.Decimal(line.quantite).greaterThan(ticketLine.quantite)) throw fail('Quantite retour invalide.', 400, 'RETURN_INVALID'); return { input: line, ticketLine, amount: new Prisma.Decimal(line.quantite).times(ticketLine.prixUnitaire).minus(new Prisma.Decimal(ticketLine.remise).div(ticketLine.quantite).times(line.quantite)) }; });
      const total = lines.reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0));
      const returned = await tx.retourProduit.create({ data: { ticketId: ticket.id, totalTTC: total, lignes: { create: lines.map((line) => ({ ticketLineId: line.ticketLine.id, quantite: new Prisma.Decimal(line.input.quantite), montant: line.amount })) } }, include: { lignes: true } });
      for (const line of lines) await tx.produit.update({ where: { id: line.ticketLine.produitId }, data: { stock: { increment: new Prisma.Decimal(line.input.quantite) } } });
      return returned;
    });
    response.status(201).json({ ...result, totalTTC: numberValue(result.totalTTC) });
  } catch (error) { next(error); }
});

router.post('/promotions', ...access, async (request, response, next) => {
  try { const input = promotionSchema.parse(request.body); const promotion = await prisma.promotion.create({ data: { libelle: input.libelle, dateDebut: dateValue(input.dateDebut), dateFin: dateValue(input.dateFin), remise: new Prisma.Decimal(input.remise), actif: input.actif, produits: { create: input.produitIds.map((produitId) => ({ produitId })) } }, include: { produits: true } }); response.status(201).json(promotion); } catch (error) { next(error); }
});

router.post('/remises', ...access, async (request, response, next) => {
  try { response.json(discountSchema.parse(request.body)); } catch (error) { next(error); }
});

export default router;
