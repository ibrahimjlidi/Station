import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole, scopeToMagasin } from '../../middleware/auth.js';
import { avoirSchema, fournisseurSchema, imputationSchema, listFilterSchema, reglementFournisseurSchema, retenueSourceSchema } from './fournisseurs.schema.js';

const router = Router();
const readAccess = [requireAuth];
const managerAccess = [requireAuth, requireRole('gerant')];
const paymentAccess = [requireAuth, requireRole('caissier', 'gerant')];
const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const numberValue = (value: Prisma.Decimal | number | null | undefined) => value == null ? null : Number(value);
const dateFilter = (dateFrom?: string, dateTo?: string) => ({ ...(dateFrom || dateTo ? { gte: dateFrom ? toDate(dateFrom) : undefined, lte: dateTo ? toDate(dateTo) : undefined } : {}) });

router.get('/fournisseurs', ...readAccess, async (_request, response, next) => {
  try {
    const fournisseurs = await prisma.fournisseur.findMany({ include: { achats: { include: { details: true } }, reglements: { include: { details: true } } }, orderBy: { raisonSociale: 'asc' } });
    response.json(fournisseurs.map((fournisseur) => { const totalAchats = fournisseur.achats.reduce((sum, achat) => sum + achat.details.reduce((detailSum, detail) => detailSum + Number(detail.quantite) * Number(detail.prixUnitaire), 0), 0); const totalRegle = fournisseur.reglements.reduce((sum, reglement) => sum + reglement.details.reduce((detailSum, detail) => detailSum + Number(detail.montant), 0), 0); return { id: fournisseur.id, code: fournisseur.code, raisonSociale: fournisseur.raisonSociale, matriculeFiscal: fournisseur.matriculeFiscal, telephone: fournisseur.telephone, adresse: fournisseur.adresse, totalAchats, totalRegle, soldeRestant: totalAchats - totalRegle }; }));
  } catch (error) { next(error); }
});

router.post('/fournisseurs', ...managerAccess, async (request, response, next) => {
  try { response.status(201).json(await prisma.fournisseur.create({ data: fournisseurSchema.parse(request.body) })); } catch (error) { next(error); }
});

router.put('/fournisseurs/:id', ...managerAccess, async (request, response, next) => {
  try { response.json(await prisma.fournisseur.update({ where: { id: Number(request.params.id) }, data: fournisseurSchema.parse(request.body) })); } catch (error) { next(error); }
});

router.get('/achats', ...readAccess, async (request, response, next) => {
  try { const fournisseurId = request.query.fournisseurId ? Number(request.query.fournisseurId) : undefined; const achats = await prisma.achatEssence.findMany({ where: { fournisseurId }, include: { details: true }, orderBy: { date: 'desc' } }); response.json(achats.map((achat) => ({ ...achat, details: achat.details.map((detail) => ({ ...detail, quantite: numberValue(detail.quantite), prixUnitaire: numberValue(detail.prixUnitaire) })) }))); } catch (error) { next(error); }
});

router.post('/reglements-fournisseurs', ...paymentAccess, async (request, response, next) => {
  try {
    const input = reglementFournisseurSchema.parse(request.body);
    const fournisseur = await prisma.fournisseur.findUnique({ where: { id: input.fournisseurId } });
    if (!fournisseur) { response.status(404).json({ message: 'Fournisseur introuvable.' }); return; }
    const total = input.lignes.reduce((sum, line) => sum + line.montant, 0);
    const reglement = await prisma.regFour.create({ data: { fournisseurId: input.fournisseurId, date: toDate(input.date), montantTotal: new Prisma.Decimal(total), valide: input.valide, details: { create: input.lignes.map((line, index) => ({ nLigne: index + 1, numAchats: line.numAchats, proEss: line.proEss, montant: new Prisma.Decimal(line.montant), modePayment: line.modePayment, echeance: line.echeance ? toDate(line.echeance) : undefined, reste: new Prisma.Decimal(line.reste) })) } }, include: { details: true, fournisseur: true } });
    response.status(201).json({ ...reglement, montantTotal: numberValue(reglement.montantTotal), details: reglement.details.map((line) => ({ ...line, montant: numberValue(line.montant), reste: numberValue(line.reste) })) });
  } catch (error) { next(error); }
});

router.get('/reglements-fournisseurs', ...readAccess, async (request, response, next) => {
  try { const filter = listFilterSchema.parse(request.query); const reglements = await prisma.regFour.findMany({ where: { fournisseurId: filter.fournisseurId, date: dateFilter(filter.dateFrom, filter.dateTo) }, include: { fournisseur: true, details: true }, orderBy: { date: 'desc' } }); response.json(reglements.map((reglement) => ({ ...reglement, montantTotal: numberValue(reglement.montantTotal), reste: reglement.details.reduce((sum, line) => sum + Number(line.reste), 0), details: reglement.details.map((line) => ({ ...line, montant: numberValue(line.montant), reste: numberValue(line.reste) })) }))); } catch (error) { next(error); }
});

router.post('/retenues-source', ...managerAccess, async (request, response, next) => {
  try {
    const input = retenueSourceSchema.parse(request.body);
    if (input.lignes.some((line) => line.fournisseurId !== input.fournisseurId)) { response.status(400).json({ message: 'Toutes les lignes doivent appartenir au fournisseur selectionne.' }); return; }
    const totalBrut = input.lignes.reduce((sum, line) => sum + line.mtBrut, 0);
    const totalRetenu = input.lignes.reduce((sum, line) => sum + line.mtBrut * line.tauxRetenu / 100, 0);
    const retenue = await prisma.entRas.create({ data: { dateRas: toDate(input.dateRas), fournisseurId: input.fournisseurId, totalBrut: new Prisma.Decimal(totalBrut), totalRetenu: new Prisma.Decimal(totalRetenu), totalNet: new Prisma.Decimal(totalBrut - totalRetenu), valide: input.valide, details: { create: input.lignes.map((line, index) => ({ numLigne: index + 1, codeRet: line.codeRet, mtBrut: new Prisma.Decimal(line.mtBrut), tauxRetenu: new Prisma.Decimal(line.tauxRetenu), mtRetenu: new Prisma.Decimal(line.mtBrut * line.tauxRetenu / 100), fournisseurId: line.fournisseurId, valide: line.valide })) } }, include: { fournisseur: true, details: true } });
    response.status(201).json({ ...retenue, totalBrut: numberValue(retenue.totalBrut), totalRetenu: numberValue(retenue.totalRetenu), totalNet: numberValue(retenue.totalNet) });
  } catch (error) { next(error); }
});

router.get('/retenues-source', ...readAccess, async (request, response, next) => {
  try { const filter = listFilterSchema.parse(request.query); const retenues = await prisma.entRas.findMany({ where: { fournisseurId: filter.fournisseurId, dateRas: dateFilter(filter.dateFrom, filter.dateTo) }, include: { fournisseur: true, details: true }, orderBy: { dateRas: 'desc' } }); response.json(retenues.map((retenue) => ({ ...retenue, totalBrut: numberValue(retenue.totalBrut), totalRetenu: numberValue(retenue.totalRetenu), totalNet: numberValue(retenue.totalNet) }))); } catch (error) { next(error); }
});

router.get('/libras', ...readAccess, async (_request, response, next) => {
  try { response.json(await prisma.libRas.findMany({ orderBy: { tauxRetenu: 'asc' } })); } catch (error) { next(error); }
});

router.post('/fournisseurs/avoirs', ...managerAccess, async (request, response, next) => { try { const input = avoirSchema.parse(request.body); const row = await prisma.entAvoir.create({ data: { ...input, dateAchat: toDate(input.dateAchat), totalTTC: new Prisma.Decimal(input.totalTTC), reste: new Prisma.Decimal(input.totalTTC), magasinId: request.user!.magasinId } , include: { fournisseur: true } }); response.status(201).json({ ...row, totalTTC: numberValue(row.totalTTC), reste: numberValue(row.reste) }); } catch (error) { next(error); } });
router.get('/fournisseurs/avoirs', ...readAccess, async (request, response, next) => { try { const rows = await prisma.entAvoir.findMany({ where: scopeToMagasin(request, {}), include: { fournisseur: true }, orderBy: { dateAchat: 'desc' } }); response.json(rows.map((row) => ({ ...row, totalTTC: numberValue(row.totalTTC), reste: numberValue(row.reste) }))); } catch (error) { next(error); } });
router.patch('/fournisseurs/avoirs/:id/valider', ...managerAccess, async (request, response, next) => { try { const result = await prisma.entAvoir.updateMany({ where: { id: Number(request.params.id), ...scopeToMagasin(request, {}) }, data: { valide: true } }); if (!result.count) { response.status(404).json({ message: 'Avoir introuvable.' }); return; } response.json({ valide: true }); } catch (error) { next(error); } });
router.patch('/fournisseurs/avoirs/:id/imputer', ...paymentAccess, async (request, response, next) => { try { const input = imputationSchema.parse(request.body); const current = await prisma.entAvoir.findFirst({ where: { id: Number(request.params.id), ...scopeToMagasin(request, {}) } }); if (!current) { response.status(404).json({ message: 'Avoir introuvable.' }); return; } if (input.montant > Number(current.reste)) { response.status(400).json({ message: 'Le montant depasse le reste de l avoir.' }); return; } const row = await prisma.entAvoir.update({ where: { id: current.id }, data: { reste: new Prisma.Decimal(Number(current.reste) - input.montant) }, include: { fournisseur: true } }); response.json({ ...row, totalTTC: numberValue(row.totalTTC), reste: numberValue(row.reste) }); } catch (error) { next(error); } });

export default router;
