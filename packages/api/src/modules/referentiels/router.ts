import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { familleDepenseSchema, tauxTvaSchema } from './schemas.js';

const router = Router();
router.use(requireAuth);
const numberValue = (value: Prisma.Decimal) => Number(value);

router.get('/referentiels/taux-tva', async (_request, response, next) => { try { const rows = await prisma.tauxTVA.findMany({ orderBy: { taux: 'asc' } }); response.json(rows.map((row) => ({ ...row, taux: numberValue(row.taux) }))); } catch (error) { next(error); } });
router.post('/referentiels/taux-tva', requireRole('gerant'), async (request, response, next) => { try { const input = tauxTvaSchema.parse(request.body); const row = await prisma.tauxTVA.create({ data: { ...input, taux: new Prisma.Decimal(input.taux) } }); response.status(201).json({ ...row, taux: numberValue(row.taux) }); } catch (error) { next(error); } });
router.put('/referentiels/taux-tva/:id', requireRole('gerant'), async (request, response, next) => { try { const input = tauxTvaSchema.partial().parse(request.body); const row = await prisma.tauxTVA.update({ where: { id: Number(request.params.id) }, data: { ...input, ...(input.taux === undefined ? {} : { taux: new Prisma.Decimal(input.taux) }) } }); response.json({ ...row, taux: numberValue(row.taux) }); } catch (error) { next(error); } });
router.get('/referentiels/familles-depenses', async (_request, response, next) => { try { response.json(await prisma.famDepense.findMany({ orderBy: { libelle: 'asc' } })); } catch (error) { next(error); } });
router.post('/referentiels/familles-depenses', requireRole('gerant'), async (request, response, next) => { try { response.status(201).json(await prisma.famDepense.create({ data: familleDepenseSchema.parse(request.body) })); } catch (error) { next(error); } });
router.put('/referentiels/familles-depenses/:id', requireRole('gerant'), async (request, response, next) => { try { response.json(await prisma.famDepense.update({ where: { id: Number(request.params.id) }, data: familleDepenseSchema.parse(request.body) })); } catch (error) { next(error); } });
router.get('/referentiels/services', async (_request, response, next) => { try { const rows = await prisma.service.findMany({ where: { actif: true }, orderBy: { libelle: 'asc' } }); response.json(rows.map((row) => ({ ...row, prixHT: numberValue(row.prixHT), tauxTVA: numberValue(row.tauxTVA), prixTTC: numberValue(row.prixTTC) }))); } catch (error) { next(error); } });

export default router;