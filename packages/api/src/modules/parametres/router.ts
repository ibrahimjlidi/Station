import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { paramSchema, stationSchema } from './parametres.schema.js';
const router = Router();
const n = (value: Prisma.Decimal) => Number(value);
router.get('/stations', requireAuth, async (_request, response, next) => { try { response.json(await prisma.station.findMany({ where: { active: true }, include: { magasin: true }, orderBy: { nom: 'asc' } })); } catch (error) { next(error); } });
router.post('/stations', requireAuth, requireRole('gerant'), async (request, response, next) => {
	try {
		const input = stationSchema.parse(request.body);
		const station = await prisma.$transaction(async (transaction) => {
			const created = await transaction.station.create({ data: { code: input.code, nom: input.nom } });
			return transaction.magasin.create({ data: { stationId: created.id, code: `MAG-${input.code}`, nom: `Magasin de ${input.nom}` }, include: { station: true } });
		});
		response.status(201).json(station);
	} catch (error) { next(error); }
});
router.get('/parametres', requireAuth, async (_request, response, next) => { try { const row = await prisma.setParam.upsert({ where: { id: 1 }, create: { id: 1, nomStation: 'Station Service', devise: 'TND' }, update: {} }); response.json({ ...row, timbre: n(row.timbre), tauxTVADefaut: n(row.tauxTVADefaut) }); } catch (error) { next(error); } });
router.put('/parametres', requireAuth, requireRole('gerant'), async (request, response, next) => { try { const input = paramSchema.parse(request.body); const row = await prisma.setParam.upsert({ where: { id: 1 }, create: { id: 1, ...input, timbre: new Prisma.Decimal(input.timbre), tauxTVADefaut: new Prisma.Decimal(input.tauxTVADefaut) }, update: { ...input, timbre: new Prisma.Decimal(input.timbre), tauxTVADefaut: new Prisma.Decimal(input.tauxTVADefaut) } }); response.json({ ...row, timbre: n(row.timbre), tauxTVADefaut: n(row.tauxTVADefaut) }); } catch (error) { next(error); } });
router.get('/parametres/compteur', requireAuth, async (_request, response, next) => { try { response.json(await prisma.compteur.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} })); } catch (error) { next(error); } });
export default router;
