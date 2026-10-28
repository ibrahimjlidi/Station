import { Router } from 'express';
import { insertRecord, query, queryOne, withTransaction } from '../../lib/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { paramSchema, stationSchema } from './parametres.schema.js';
const router = Router();
const n = (value: unknown) => Number(value);
router.get('/stations', requireAuth, async (_request, response, next) => {
	try {
		const rows = await query(
			'SELECT s.id, s.code, s.nom, s.active, s.createdAt, s.updatedAt, m.id AS magasinId, m.code AS magasinCode, m.nom AS magasinNom, m.active AS magasinActive, m.createdAt AS magasinCreatedAt, m.updatedAt AS magasinUpdatedAt FROM `Station` s LEFT JOIN `Magasin` m ON m.stationId = s.id WHERE s.active = ? ORDER BY s.nom',
			[true],
		);
		response.json(rows.map((row) => ({
			id: row.id,
			code: row.code,
			nom: row.nom,
			active: row.active,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			magasin: row.magasinId == null ? null : {
				id: row.magasinId,
				code: row.magasinCode,
				nom: row.magasinNom,
				active: row.magasinActive,
				createdAt: row.magasinCreatedAt,
				updatedAt: row.magasinUpdatedAt,
			},
		})));
	} catch (error) { next(error); }
});
router.post('/stations', requireAuth, requireRole('gerant'), async (request, response, next) => {
	try {
		const input = stationSchema.parse(request.body);
		const result = await withTransaction(async (connection) => {
			const stationId = await insertRecord('Station', { code: input.code, nom: input.nom }, connection);
			const magasinId = await insertRecord('Magasin', { stationId, code: `MAG-${input.code}`, nom: `Magasin de ${input.nom}` }, connection);
			const rows = await query(
				'SELECT m.id, m.stationId, m.code, m.nom, m.active, m.createdAt, m.updatedAt, s.code AS stationCode, s.nom AS stationNom, s.active AS stationActive, s.createdAt AS stationCreatedAt, s.updatedAt AS stationUpdatedAt FROM `Magasin` m JOIN `Station` s ON s.id = m.stationId WHERE m.id = ?',
				[magasinId],
				connection,
			);
			const row = rows[0];
			if (!row) throw new Error('Created station store could not be loaded.');
			return {
				id: row.id,
				stationId: row.stationId,
				code: row.code,
				nom: row.nom,
				active: row.active,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
				station: {
					id: stationId,
					code: row.stationCode,
					nom: row.stationNom,
					active: row.stationActive,
					createdAt: row.stationCreatedAt,
					updatedAt: row.stationUpdatedAt,
				},
			};
		});
		response.status(201).json(result);
	} catch (error) { next(error); }
});
router.get('/parametres', requireAuth, async (_request, response, next) => { try { await query('INSERT IGNORE INTO `SetParam` (id, nomStation, devise) VALUES (?, ?, ?)', [1, 'Station Service', 'TND']); const row = await queryOne('SELECT * FROM `SetParam` WHERE id = ?', [1]); if (!row) throw new Error('Station settings could not be loaded.'); response.json({ ...row, timbre: n(row.timbre), tauxTVADefaut: n(row.tauxTVADefaut) }); } catch (error) { next(error); } });
router.put('/parametres', requireAuth, requireRole('gerant'), async (request, response, next) => { try { const input = paramSchema.parse(request.body); await query('INSERT INTO `SetParam` (id, nomStation, adresse, tel, mf, rc, logoUrl, timbre, tauxTVADefaut, devise) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nomStation = VALUES(nomStation), adresse = VALUES(adresse), tel = VALUES(tel), mf = VALUES(mf), rc = VALUES(rc), logoUrl = VALUES(logoUrl), timbre = VALUES(timbre), tauxTVADefaut = VALUES(tauxTVADefaut), devise = VALUES(devise)', [1, input.nomStation, input.adresse ?? null, input.tel ?? null, input.mf ?? null, input.rc ?? null, input.logoUrl ?? null, input.timbre, input.tauxTVADefaut, input.devise]); const row = await queryOne('SELECT * FROM `SetParam` WHERE id = ?', [1]); if (!row) throw new Error('Updated station settings could not be loaded.'); response.json({ ...row, timbre: n(row.timbre), tauxTVADefaut: n(row.tauxTVADefaut) }); } catch (error) { next(error); } });
router.get('/parametres/compteur', requireAuth, async (_request, response, next) => { try { await query('INSERT IGNORE INTO `Compteur` (id) VALUES (?)', [1]); const row = await queryOne('SELECT * FROM `Compteur` WHERE id = ?', [1]); if (!row) throw new Error('Counter row could not be loaded.'); response.json(row); } catch (error) { next(error); } });
export default router;
