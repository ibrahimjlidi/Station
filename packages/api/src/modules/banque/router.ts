import { Router } from 'express';
import { execute, insertRecord, query, queryOne, updateRecord } from '../../lib/db.js';
import { requireAuth, requireRole, scopeToMagasin } from '../../middleware/auth.js';
import { banqueSchema, configSchema, mouvementSchema, movementFilterSchema } from './banque.schema.js';

const router = Router();
const read = [requireAuth];
const write = [requireAuth, requireRole('caissier', 'gerant')];
const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const numberValue = (value: unknown) => value == null ? null : Number(value);

router.get('/banques', ...read, async (_request, response, next) => {
  try { response.json(await query('SELECT * FROM `Banque` ORDER BY libelle')); } catch (error) { next(error); }
});

router.post('/banques', ...read, requireRole('gerant'), async (request, response, next) => {
  try { const id = await insertRecord('Banque', banqueSchema.parse(request.body)); const row = await queryOne('SELECT * FROM `Banque` WHERE id = ?', [id]); if (!row) throw new Error('Inserted bank could not be loaded.'); response.status(201).json(row); } catch (error) { next(error); }
});

router.get('/banques/:id/mouvements', ...read, async (request, response, next) => {
  try {
    const filter = movementFilterSchema.parse(request.query);
    const conditions = ['m.banqueId = ?'];
    const values: (number | boolean | Date)[] = [Number(request.params.id)];
    if (filter.modePaymentId !== undefined) { conditions.push('m.modePaymentId = ?'); values.push(filter.modePaymentId); }
    if (filter.rapproche !== undefined) { conditions.push('m.rapproche = ?'); values.push(filter.rapproche === 'true'); }
    if (filter.dateFrom) { conditions.push('m.date >= ?'); values.push(toDate(filter.dateFrom)); }
    if (filter.dateTo) { conditions.push('m.date <= ?'); values.push(toDate(filter.dateTo)); }
    if (request.user?.magasinId != null) { conditions.push('m.magasinId = ?'); values.push(request.user.magasinId); }
    const movements = await query(`SELECT m.*, b.libelle AS banqueLibelle, b.tel AS banqueTel, b.rib AS banqueRib, p.libelle AS modePaymentLibelle FROM \`DetMvtBq\` m JOIN \`Banque\` b ON b.id = m.banqueId JOIN \`ModePayment\` p ON p.id = m.modePaymentId WHERE ${conditions.join(' AND ')} ORDER BY m.date DESC`, values);
    response.json(movements.map((movement) => ({ ...movement, montant: numberValue(movement.montant), banque: { id: movement.banqueId, libelle: movement.banqueLibelle, tel: movement.banqueTel, rib: movement.banqueRib }, modePayment: { id: movement.modePaymentId, libelle: movement.modePaymentLibelle } })));
  } catch (error) { next(error); }
});

router.post('/banques/mouvements', ...write, async (request, response, next) => {
  try {
    const input = mouvementSchema.parse(request.body);
    const id = await insertRecord('DetMvtBq', { magasinId: request.user?.magasinId, banqueId: input.banqueId, modePaymentId: input.modePaymentId, date: toDate(input.date), dateEcheance: input.dateEcheance ? toDate(input.dateEcheance) : undefined, montant: input.montant, numMvtBq: input.numMvtBq, numLigne: input.numLigne });
    const movement = await queryOne('SELECT * FROM `DetMvtBq` WHERE id = ?', [id]);
    if (!movement) throw new Error('Inserted bank movement could not be loaded.');
    response.status(201).json({ ...movement, montant: numberValue(movement.montant) });
  } catch (error) { next(error); }
});

router.patch('/banques/mouvements/:id/rapprocher', ...write, async (request, response, next) => {
  try { const id = Number(request.params.id); const movement = request.user?.magasinId == null ? await queryOne('SELECT id FROM `DetMvtBq` WHERE id = ?', [id]) : await queryOne('SELECT id FROM `DetMvtBq` WHERE id = ? AND magasinId = ?', [id, request.user.magasinId]); if (!movement) { response.status(404).json({ message: 'Mouvement introuvable.' }); return; } await updateRecord('DetMvtBq', { rapproche: true }, { id }); const updated = await queryOne('SELECT * FROM `DetMvtBq` WHERE id = ?', [id]); if (!updated) throw new Error('Updated bank movement could not be loaded.'); response.json({ ...updated, montant: numberValue(updated.montant) }); } catch (error) { next(error); }
});

router.get('/banques/position/:banqueId', ...read, async (request, response, next) => {
  try {
    const banqueId = Number(request.params.banqueId);
    const [totals, configs, movements] = await Promise.all([
      queryOne('SELECT COALESCE(SUM(montant), 0) AS soldeTotal, COALESCE(SUM(CASE WHEN rapproche = ? THEN montant ELSE 0 END), 0) AS soldeRapproche, SUM(CASE WHEN rapproche = ? THEN 1 ELSE 0 END) AS mouvementsEnAttente FROM `DetMvtBq` WHERE banqueId = ?', [true, false, banqueId]),
      query('SELECT * FROM `AgeoCompteMode` WHERE banqueId = ?', [banqueId]),
      query('SELECT montant, modePaymentId FROM `DetMvtBq` WHERE banqueId = ?', [banqueId]),
    ]);
    const rates = new Map(configs.map((config) => [config.modePaymentId, Number(config.tauxCommission) * (1 + Number(config.tvaCom) / 100) / 100]));
    const commissionEstimee = movements.reduce((sum, movement) => sum + Number(movement.montant) * (rates.get(movement.modePaymentId) ?? 0), 0);
    response.json({ banqueId, soldeTotal: numberValue(totals?.soldeTotal), soldeRapproche: numberValue(totals?.soldeRapproche), mouvementsEnAttente: Number(totals?.mouvementsEnAttente ?? 0), commissionEstimee });
  } catch (error) { next(error); }
});

router.get('/banques/config', ...read, async (_request, response, next) => {
  try { response.json(await query('SELECT c.*, b.libelle AS banqueLibelle, b.tel AS banqueTel, b.rib AS banqueRib, p.libelle AS modePaymentLibelle FROM `AgeoCompteMode` c JOIN `Banque` b ON b.id = c.banqueId JOIN `ModePayment` p ON p.id = c.modePaymentId ORDER BY c.banqueId, c.modePaymentId')); } catch (error) { next(error); }
});

router.post('/banques/config', ...write, async (request, response, next) => {
  try { const input = configSchema.parse(request.body); await query('INSERT INTO `AgeoCompteMode` (banqueId, modePaymentId, tauxCommission, nbrJoursCompensation, tvaCom) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE tauxCommission = VALUES(tauxCommission), nbrJoursCompensation = VALUES(nbrJoursCompensation), tvaCom = VALUES(tvaCom)', [input.banqueId, input.modePaymentId, input.tauxCommission, input.nbrJoursCompensation, input.tvaCom]); const config = await queryOne('SELECT * FROM `AgeoCompteMode` WHERE banqueId = ? AND modePaymentId = ?', [input.banqueId, input.modePaymentId]); if (!config) throw new Error('Bank account configuration could not be loaded.'); response.json(config); } catch (error) { next(error); }
});

export default router;
