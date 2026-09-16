import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { banqueSchema, configSchema, mouvementSchema, movementFilterSchema } from './banque.schema.js';

const router = Router();
const read = [requireAuth];
const write = [requireAuth, requireRole('caissier', 'gerant')];
const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const numberValue = (value: Prisma.Decimal | number | null | undefined) => value == null ? null : Number(value);
const dateFilter = (dateFrom?: string, dateTo?: string) => ({ ...(dateFrom || dateTo ? { gte: dateFrom ? toDate(dateFrom) : undefined, lte: dateTo ? toDate(dateTo) : undefined } : {}) });

router.get('/banques', ...read, async (_request, response, next) => {
  try { response.json(await prisma.banque.findMany({ orderBy: { libelle: 'asc' } })); } catch (error) { next(error); }
});

router.post('/banques', ...read, requireRole('gerant'), async (request, response, next) => {
  try { response.status(201).json(await prisma.banque.create({ data: banqueSchema.parse(request.body) })); } catch (error) { next(error); }
});

router.get('/banques/:id/mouvements', ...read, async (request, response, next) => {
  try {
    const filter = movementFilterSchema.parse(request.query);
    const movements = await prisma.detMvtBq.findMany({ where: { banqueId: Number(request.params.id), modePaymentId: filter.modePaymentId, rapproche: filter.rapproche === undefined ? undefined : filter.rapproche === 'true', date: dateFilter(filter.dateFrom, filter.dateTo) }, include: { banque: true, modePayment: true }, orderBy: { date: 'desc' } });
    response.json(movements.map((movement) => ({ ...movement, montant: numberValue(movement.montant) })));
  } catch (error) { next(error); }
});

router.post('/banques/mouvements', ...write, async (request, response, next) => {
  try {
    const input = mouvementSchema.parse(request.body);
    const movement = await prisma.detMvtBq.create({ data: { banqueId: input.banqueId, modePaymentId: input.modePaymentId, date: toDate(input.date), dateEcheance: input.dateEcheance ? toDate(input.dateEcheance) : undefined, montant: new Prisma.Decimal(input.montant), numMvtBq: input.numMvtBq, numLigne: input.numLigne } });
    response.status(201).json({ ...movement, montant: numberValue(movement.montant) });
  } catch (error) { next(error); }
});

router.patch('/banques/mouvements/:id/rapprocher', ...write, async (request, response, next) => {
  try { const movement = await prisma.detMvtBq.update({ where: { id: Number(request.params.id) }, data: { rapproche: true } }); response.json({ ...movement, montant: numberValue(movement.montant) }); } catch (error) { next(error); }
});

router.get('/banques/position/:banqueId', ...read, async (request, response, next) => {
  try {
    const banqueId = Number(request.params.banqueId);
    const [all, reconciled, pending, movements] = await Promise.all([
      prisma.detMvtBq.aggregate({ where: { banqueId }, _sum: { montant: true } }),
      prisma.detMvtBq.aggregate({ where: { banqueId, rapproche: true }, _sum: { montant: true } }),
      prisma.detMvtBq.count({ where: { banqueId, rapproche: false } }),
      prisma.detMvtBq.findMany({ where: { banqueId }, select: { montant: true, modePaymentId: true } }),
    ]);
    const configs = await prisma.ageoCompteMode.findMany({ where: { banqueId } });
    const rates = new Map(configs.map((config) => [config.modePaymentId, Number(config.tauxCommission) * (1 + Number(config.tvaCom) / 100) / 100]));
    const commissionEstimee = movements.reduce((sum, movement) => sum + Number(movement.montant) * (rates.get(movement.modePaymentId) ?? 0), 0);
    response.json({ banqueId, soldeTotal: Number(all._sum.montant ?? 0), soldeRapproche: Number(reconciled._sum.montant ?? 0), mouvementsEnAttente: pending, commissionEstimee });
  } catch (error) { next(error); }
});

router.get('/banques/config', ...read, async (_request, response, next) => {
  try { response.json(await prisma.ageoCompteMode.findMany({ include: { banque: true, modePayment: true }, orderBy: [{ banqueId: 'asc' }, { modePaymentId: 'asc' }] })); } catch (error) { next(error); }
});

router.post('/banques/config', ...write, async (request, response, next) => {
  try { const input = configSchema.parse(request.body); const config = await prisma.ageoCompteMode.upsert({ where: { banqueId_modePaymentId: { banqueId: input.banqueId, modePaymentId: input.modePaymentId } }, create: { ...input, tauxCommission: new Prisma.Decimal(input.tauxCommission), tvaCom: new Prisma.Decimal(input.tvaCom) }, update: { tauxCommission: new Prisma.Decimal(input.tauxCommission), nbrJoursCompensation: input.nbrJoursCompensation, tvaCom: new Prisma.Decimal(input.tvaCom) } }); response.json(config); } catch (error) { next(error); }
});

export default router;
