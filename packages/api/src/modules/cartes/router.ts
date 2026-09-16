import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { bonSchema, carteSchema, importRowSchema } from './cartes.schema.js';

const router = Router();
const read = [requireAuth];
const write = [requireAuth, requireRole('caissier', 'gerant')];
const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const dateWhere = (from?: string, to?: string) => from || to ? { gte: from ? toDate(from) : undefined, lte: to ? toDate(to) : undefined } : undefined;
const numberValue = (value: Prisma.Decimal | null) => value == null ? null : Number(value);

router.get('/cartes', ...read, async (request, response, next) => { try { const rows = await prisma.cartes.findMany({ where: { typeCarte: request.query.typeCarte ? String(request.query.typeCarte) : undefined, date: dateWhere(request.query.dateFrom ? String(request.query.dateFrom) : undefined, request.query.dateTo ? String(request.query.dateTo) : undefined) }, orderBy: { date: 'desc' } }); response.json(rows.map((row) => ({ ...row, montant: numberValue(row.montant) }))); } catch (error) { next(error); } });
router.post('/cartes', ...write, async (request, response, next) => { try { const input = carteSchema.parse(request.body); const row = await prisma.cartes.create({ data: { ...input, date: toDate(input.date), montant: new Prisma.Decimal(input.montant) } }); response.status(201).json({ ...row, montant: numberValue(row.montant) }); } catch (error) { next(error); } });
router.patch('/cartes/:id/valider', ...write, async (request, response, next) => { try { response.json(await prisma.cartes.update({ where: { id: Number(request.params.id) }, data: { fait: true } })); } catch (error) { next(error); } });
router.post('/cartes/import-cn', ...write, async (request, response, next) => { try { const rows = z.array(importRowSchema).parse(request.body); const receipts = rows.map((row) => row.receipt); const existing = await prisma.extractCN.findMany({ where: { receipt: { in: receipts } }, select: { receipt: true } }); const existingSet = new Set(existing.map((row) => row.receipt)); const fresh = rows.filter((row) => !existingSet.has(row.receipt)); await prisma.extractCN.createMany({ data: fresh.map((row) => ({ terminal: row.terminal, shift: row.shift, date: row.date ? toDate(row.date) : undefined, receipt: row.receipt, card: row.card, product: row.product, customerName: row.customerName, transactionType: row.transactionType, quantity: row.quantity === undefined ? undefined : new Prisma.Decimal(row.quantity), amount: row.amount === undefined ? undefined : new Prisma.Decimal(row.amount), numCN: row.numCN, dateAvoir: row.dateAvoir ? toDate(row.dateAvoir) : undefined })), skipDuplicates: true }); response.status(201).json({ imported: fresh.length, duplicates: rows.length - fresh.length }); } catch (error) { next(error); } });
router.get('/cartes/extraits-cn', ...read, async (request, response, next) => { try { const rows = await prisma.extractCN.findMany({ where: { numCN: request.query.numCN ? String(request.query.numCN) : undefined, date: dateWhere(request.query.dateFrom ? String(request.query.dateFrom) : undefined, request.query.dateTo ? String(request.query.dateTo) : undefined) }, orderBy: { date: 'desc' } }); response.json(rows.map((row) => ({ ...row, quantity: numberValue(row.quantity), amount: numberValue(row.amount) }))); } catch (error) { next(error); } });
router.post('/bons-station', ...write, async (request, response, next) => { try { const input = bonSchema.parse(request.body); const row = await prisma.bonsStation.create({ data: { ...input, date: toDate(input.date), montant: new Prisma.Decimal(input.montant) } }); response.status(201).json({ ...row, montant: numberValue(row.montant) }); } catch (error) { next(error); } });
router.get('/bons-station', ...read, async (_request, response, next) => { try { const rows = await prisma.bonsStation.findMany({ orderBy: { date: 'desc' } }); response.json(rows.map((row) => ({ ...row, montant: numberValue(row.montant) }))); } catch (error) { next(error); } });
export default router;
