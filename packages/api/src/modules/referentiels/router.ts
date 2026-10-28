import { Router } from 'express';
import { insertRecord, query, queryOne, updateRecord } from '../../lib/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { familleDepenseSchema, tauxTvaSchema } from './schemas.js';

const router = Router();
router.use(requireAuth);
const numberValue = (value: unknown) => Number(value ?? 0);

router.get('/referentiels/taux-tva', async (_request, response, next) => { try { const rows = await query('SELECT * FROM `TauxTVA` ORDER BY taux'); response.json(rows.map((row) => ({ ...row, taux: numberValue(row.taux) }))); } catch (error) { next(error); } });
router.post('/referentiels/taux-tva', requireRole('gerant'), async (request, response, next) => { try { const input = tauxTvaSchema.parse(request.body); const id = await insertRecord('TauxTVA', input); const row = await queryOne('SELECT * FROM `TauxTVA` WHERE id = ?', [id]); if (!row) throw new Error('Inserted tax rate could not be loaded.'); response.status(201).json({ ...row, taux: numberValue(row.taux) }); } catch (error) { next(error); } });
router.put('/referentiels/taux-tva/:id', requireRole('gerant'), async (request, response, next) => { try { const input = tauxTvaSchema.partial().parse(request.body); const id = Number(request.params.id); await updateRecord('TauxTVA', input, { id }); const row = await queryOne('SELECT * FROM `TauxTVA` WHERE id = ?', [id]); if (!row) { response.status(404).json({ message: 'Taux de TVA introuvable.' }); return; } response.json({ ...row, taux: numberValue(row.taux) }); } catch (error) { next(error); } });
router.get('/referentiels/familles-depenses', async (_request, response, next) => { try { response.json(await query('SELECT * FROM `FAMDEPENSE` ORDER BY libelle')); } catch (error) { next(error); } });
router.post('/referentiels/familles-depenses', requireRole('gerant'), async (request, response, next) => { try { const input = familleDepenseSchema.parse(request.body); const id = await insertRecord('FAMDEPENSE', input); const row = await queryOne('SELECT * FROM `FAMDEPENSE` WHERE id = ?', [id]); if (!row) throw new Error('Inserted expense family could not be loaded.'); response.status(201).json(row); } catch (error) { next(error); } });
router.put('/referentiels/familles-depenses/:id', requireRole('gerant'), async (request, response, next) => { try { const input = familleDepenseSchema.parse(request.body); const id = Number(request.params.id); await updateRecord('FAMDEPENSE', input, { id }); const row = await queryOne('SELECT * FROM `FAMDEPENSE` WHERE id = ?', [id]); if (!row) { response.status(404).json({ message: 'Famille de depenses introuvable.' }); return; } response.json(row); } catch (error) { next(error); } });
router.get('/referentiels/services', async (_request, response, next) => { try { const rows = await query('SELECT * FROM `Service` WHERE actif = ? ORDER BY libelle', [true]); response.json(rows.map((row) => ({ ...row, prixHT: numberValue(row.prixHT), tauxTVA: numberValue(row.tauxTVA), prixTTC: numberValue(row.prixTTC) }))); } catch (error) { next(error); } });

export default router;