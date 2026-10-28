import { Router } from 'express';
import { execute, insertRecord, query, queryOne, withTransaction, type SqlRow, type SqlValue } from '../../lib/db.js';
import { authMiddleware, requireRole, type AuthRequest } from '../../middleware/auth.js';
import { caisseSchema, cuveSchema, equipeSchema, fermerSchema, inventaireCarburantSchema, jaugeageFilterSchema, jaugeageSchema, jaugeagesSchema, pompeSchema, releverSchema, retourSchema } from './schemas.js';

const router = Router();
router.use(authMiddleware);
const asNumber = (value: unknown) => value == null ? null : Number(value);
const toDate = (value: string, endOfDay = false) => new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
type LoadedRetour = SqlRow & { details: SqlRow[] };
type LoadedFuelInventory = SqlRow & { lignes: SqlRow[] };

function scope(request: AuthRequest, alias: string) {
  const column = alias ? `${alias}.magasinId` : 'magasinId';
  return request.user?.magasinId == null
    ? { sql: '', values: [] as SqlValue[] }
    : { sql: ` AND ${column} = ?`, values: [request.user.magasinId] as SqlValue[] };
}

async function activeMagasinId(request: AuthRequest) {
  const filters = request.user?.magasinId == null ? '' : ' AND id = ?';
  const values = request.user?.magasinId == null ? [true] : [true, request.user.magasinId];
  const magasin = await queryOne(`SELECT id FROM \`Magasin\` WHERE active = ?${filters} ORDER BY id LIMIT 1`, values);
  if (!magasin) {
    const error = new Error('Aucun magasin actif n’est configuré.') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
  return Number(magasin.id);
}

async function loadRetour(id: number, magasinId?: number | null): Promise<LoadedRetour | null> {
  const scopeSql = magasinId == null ? '' : ' AND r.magasinId = ?';
  const values: SqlValue[] = magasinId == null ? [id] : [id, magasinId];
  const retour = await queryOne(`SELECT r.*, e.code AS equipeCode, e.libelle AS equipeLibelle, c.code AS caisseCode, c.libelle AS caisseLibelle, v.matricule AS vendeurMatricule, v.nom AS vendeurNom FROM \`RetourCuve\` r JOIN \`Equipe\` e ON e.id = r.equipeId JOIN \`Caisse\` c ON c.id = r.caisseId JOIN \`Vendeur\` v ON v.id = r.vendeurId WHERE r.id = ?${scopeSql}`, values);
  if (!retour) return null;
  const details = await query('SELECT d.*, p.code AS pompeCode, p.libelle AS pompeLibelle, p.prixVente AS pompePrixVente, cu.code AS cuveCode, cu.libelle AS cuveLibelle, cu.carburant AS cuveCarburant, cu.volumeTotal, cu.stock, cu.prixAchatHT FROM `DetailRetour` d JOIN `Pompe` p ON p.id = d.pompeId JOIN `Cuve` cu ON cu.id = d.cuveId WHERE d.retourCuveId = ? ORDER BY d.id', [id]);
  return {
    ...retour,
    equipe: { id: retour.equipeId, code: retour.equipeCode, libelle: retour.equipeLibelle },
    caisse: { id: retour.caisseId, code: retour.caisseCode, libelle: retour.caisseLibelle },
    vendeur: { id: retour.vendeurId, matricule: retour.vendeurMatricule, nom: retour.vendeurNom },
    details: details.map((line) => ({
      ...line,
      pompe: { id: line.pompeId, code: line.pompeCode, libelle: line.pompeLibelle, prixVente: line.pompePrixVente },
      cuve: { id: line.cuveId, code: line.cuveCode, libelle: line.cuveLibelle, carburant: line.cuveCarburant, volumeTotal: line.volumeTotal, stock: line.stock, prixAchatHT: line.prixAchatHT },
    })),
  };
}

async function loadFuelInventory(id: number, magasinId?: number | null): Promise<LoadedFuelInventory | null> {
  const suffix = magasinId == null ? '' : ' AND i.magasinId = ?';
  const values: SqlValue[] = magasinId == null ? [id] : [id, magasinId];
  const inventory = await queryOne(`SELECT * FROM \`InventaireCarburant\` i WHERE i.id = ?${suffix}`, values);
  if (!inventory) return null;
  const lignes = await query('SELECT d.*, c.code AS cuveCode, c.libelle AS cuveLibelle, c.carburant AS cuveCarburant, c.volumeTotal, c.stock, c.prixAchatHT, c.stockInitial, c.seuilAlerte FROM `DetailInventaireCarburant` d JOIN `Cuve` c ON c.id = d.cuveId WHERE d.inventaireCarId = ? ORDER BY d.id', [id]);
  return { ...inventory, lignes: lignes.map((line) => ({ ...line, cuve: { id: line.cuveId, code: line.cuveCode, libelle: line.cuveLibelle, carburant: line.cuveCarburant, volumeTotal: line.volumeTotal, stock: line.stock, prixAchatHT: line.prixAchatHT, stockInitial: line.stockInitial, seuilAlerte: line.seuilAlerte } })) };
}

router.get('/cuves', async (request, response, next) => {
  try {
    const filters = scope(request, 'c');
    const rows = await query(`SELECT c.* FROM \`Cuve\` c WHERE 1 = 1${filters.sql} ORDER BY c.code`, filters.values);
    response.json(rows.map((cuve) => ({ ...cuve, volumeTotal: asNumber(cuve.volumeTotal), stockInitial: asNumber(cuve.stockInitial), stock: asNumber(cuve.stock), prixAchatHT: asNumber(cuve.prixAchatHT), seuilAlerte: asNumber(cuve.seuilAlerte) })));
  } catch (error) { next(error); }
});

router.get('/pompes', async (request, response, next) => {
  try {
    const filters = scope(request, 'p');
    const rows = await query(`SELECT p.*, c.code AS cuveCode, c.libelle AS cuveLibelle, c.carburant AS cuveCarburant, c.volumeTotal, c.stock, c.prixAchatHT, c.stockInitial, c.seuilAlerte, c.magasinId AS cuveMagasinId FROM \`Pompe\` p JOIN \`Cuve\` c ON c.id = p.cuveId WHERE 1 = 1${filters.sql} ORDER BY p.code`, filters.values);
    response.json(rows.map((pump) => ({ ...pump, prixVente: asNumber(pump.prixVente), cuve: { id: pump.cuveId, code: pump.cuveCode, libelle: pump.cuveLibelle, carburant: pump.cuveCarburant, volumeTotal: asNumber(pump.volumeTotal), stock: asNumber(pump.stock), prixAchatHT: asNumber(pump.prixAchatHT), stockInitial: asNumber(pump.stockInitial), seuilAlerte: asNumber(pump.seuilAlerte), magasinId: pump.cuveMagasinId } })));
  } catch (error) { next(error); }
});

router.get('/equipes', async (request, response, next) => {
  try { const filters = scope(request, 'e'); response.json(await query(`SELECT e.* FROM \`Equipe\` e WHERE e.actif = ?${filters.sql} ORDER BY e.code`, [true, ...filters.values])); } catch (error) { next(error); }
});

router.get('/caisses', async (request, response, next) => {
  try { const filters = scope(request, 'c'); response.json(await query(`SELECT c.* FROM \`Caisse\` c WHERE c.actif = ?${filters.sql} ORDER BY c.code`, [true, ...filters.values])); } catch (error) { next(error); }
});

router.post('/equipes', requireRole('gerant'), async (request, response, next) => {
  try {
    const input = equipeSchema.parse(request.body);
    const id = await insertRecord('Equipe', { ...input, magasinId: await activeMagasinId(request) });
    const row = await queryOne('SELECT * FROM `Equipe` WHERE id = ?', [id]);
    if (!row) throw new Error('Created team could not be loaded.');
    response.status(201).json(row);
  } catch (error) { next(error); }
});

router.post('/caisses', requireRole('gerant'), async (request, response, next) => {
  try {
    const input = caisseSchema.parse(request.body);
    const id = await insertRecord('Caisse', { ...input, magasinId: await activeMagasinId(request) });
    const row = await queryOne('SELECT * FROM `Caisse` WHERE id = ?', [id]);
    if (!row) throw new Error('Created till could not be loaded.');
    response.status(201).json(row);
  } catch (error) { next(error); }
});

router.post('/cuves', requireRole('gerant'), async (request, response, next) => {
  try {
    const input = cuveSchema.parse(request.body);
    const id = await insertRecord('Cuve', { ...input, magasinId: await activeMagasinId(request), stock: input.stockInitial, prixAchatHT: 0 });
    const cuve = await queryOne('SELECT * FROM `Cuve` WHERE id = ?', [id]);
    if (!cuve) throw new Error('Created tank could not be loaded.');
    response.status(201).json({ ...cuve, volumeTotal: asNumber(cuve.volumeTotal), stockInitial: asNumber(cuve.stockInitial), stock: asNumber(cuve.stock), prixAchatHT: asNumber(cuve.prixAchatHT), seuilAlerte: asNumber(cuve.seuilAlerte) });
  } catch (error) { next(error); }
});

router.post('/pompes', requireRole('gerant'), async (request, response, next) => {
  try {
    const input = pompeSchema.parse(request.body);
    const filters = scope(request, 'c');
    const cuve = await queryOne(`SELECT * FROM \`Cuve\` c WHERE c.id = ?${filters.sql}`, [input.cuveId, ...filters.values]);
    if (!cuve) { response.status(400).json({ message: 'Cuve introuvable.' }); return; }
    const id = await insertRecord('Pompe', { ...input, magasinId: await activeMagasinId(request) });
    const pump = await queryOne('SELECT * FROM `Pompe` WHERE id = ?', [id]);
    if (!pump) throw new Error('Created pump could not be loaded.');
    response.status(201).json({ ...pump, prixVente: asNumber(pump.prixVente), cuve });
  } catch (error) { next(error); }
});

router.get('/vendeurs', async (request, response, next) => {
  try { const filters = scope(request, 'v'); response.json(await query(`SELECT v.* FROM \`Vendeur\` v WHERE v.actif = ?${filters.sql} ORDER BY v.nom`, [true, ...filters.values])); } catch (error) { next(error); }
});

router.get('/releves', async (_request, response, next) => {
  try {
    const rows = await query('SELECT r.*, p.code AS pompeCode, p.libelle AS pompeLibelle, p.active AS pompeActive, p.prixVente AS pompePrixVente, p.cuveId, e.code AS equipeCode, e.libelle AS equipeLibelle, c.code AS caisseCode, c.libelle AS caisseLibelle, v.matricule AS vendeurMatricule, v.nom AS vendeurNom FROM `MobVCarCaisse` r JOIN `Pompe` p ON p.id = r.pompeId JOIN `Equipe` e ON e.id = r.equipeId JOIN `Caisse` c ON c.id = r.caisseId JOIN `Vendeur` v ON v.id = r.vendeurId ORDER BY r.date DESC, r.createdAt DESC LIMIT 100');
    response.json(rows.map((row) => ({
      ...row,
      date: new Date(row.date).toISOString().slice(0, 10),
      indexOuverture: asNumber(row.indexOuverture),
      indexFermeture: asNumber(row.indexFermeture),
      prixVente: asNumber(row.prixVente),
      ca: row.indexFermeture == null ? null : (Number(row.indexFermeture) - Number(row.indexOuverture)) * Number(row.prixVente),
      pompe: { id: row.pompeId, code: row.pompeCode, libelle: row.pompeLibelle, active: row.pompeActive, prixVente: row.pompePrixVente, cuveId: row.cuveId },
      equipe: { id: row.equipeId, code: row.equipeCode, libelle: row.equipeLibelle },
      caisse: { id: row.caisseId, code: row.caisseCode, libelle: row.caisseLibelle },
      vendeur: { id: row.vendeurId, matricule: row.vendeurMatricule, nom: row.vendeurNom },
    })));
  } catch (error) { next(error); }
});

router.post('/pompes/relever', requireRole('gerant', 'caissier'), async (request, response, next) => {
  try {
    const input = releverSchema.parse(request.body);
    const pump = await queryOne('SELECT * FROM `Pompe` WHERE id = ?', [input.pompeId]);
    if (!pump || !pump.active) { response.status(404).json({ message: 'Pompe introuvable ou inactive.' }); return; }
    const date = toDate(input.date);
    const existing = await queryOne('SELECT id FROM `MobVCarCaisse` WHERE date = ? AND equipeId = ? AND caisseId = ? AND pompeId = ?', [date, input.equipeId, input.caisseId, input.pompeId]);
    if (existing) { response.status(409).json({ message: 'Un relevé existe déjà pour cette date, cette équipe, cette caisse et cette pompe.', id: existing.id }); return; }
    const previous = await queryOne('SELECT indexFermeture FROM `MobVCarCaisse` WHERE pompeId = ? AND caisseId = ? AND date <= ? AND indexFermeture IS NOT NULL ORDER BY date DESC, createdAt DESC LIMIT 1', [input.pompeId, input.caisseId, date]);
    if (previous && Number(input.indexOuverture) !== Number(previous.indexFermeture)) {
      response.status(409).json({ message: `L'index d'ouverture doit reprendre la fermeture précédente (${previous.indexFermeture}).`, expected: asNumber(previous.indexFermeture) });
      return;
    }
    const id = await insertRecord('MobVCarCaisse', { ...input, date, prixVente: pump.prixVente });
    const releve = await queryOne('SELECT * FROM `MobVCarCaisse` WHERE id = ?', [id]);
    if (!releve) throw new Error('Created pump reading could not be loaded.');
    response.status(201).json({ ...releve, indexOuverture: asNumber(releve.indexOuverture), prixVente: asNumber(releve.prixVente) });
  } catch (error) { next(error); }
});

router.patch('/pompes/relever/:id/fermer', requireRole('gerant', 'caissier'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const input = fermerSchema.parse(request.body);
    const reading = await queryOne('SELECT * FROM `MobVCarCaisse` WHERE id = ?', [id]);
    if (!reading) { response.status(404).json({ message: 'Releve introuvable.' }); return; }
    if (input.indexFermeture < Number(reading.indexOuverture)) { response.status(400).json({ message: "L'index de fermeture doit etre superieur ou egal a l'ouverture." }); return; }
    await execute('UPDATE `MobVCarCaisse` SET indexFermeture = ?, updatedAt = ? WHERE id = ?', [input.indexFermeture, new Date(), id]);
    const updated = await queryOne('SELECT * FROM `MobVCarCaisse` WHERE id = ?', [id]);
    if (!updated) throw new Error('Updated pump reading could not be loaded.');
    response.json({ ...updated, indexOuverture: asNumber(updated.indexOuverture), indexFermeture: asNumber(updated.indexFermeture), prixVente: asNumber(updated.prixVente), ca: (Number(updated.indexFermeture) - Number(updated.indexOuverture)) * Number(updated.prixVente) });
  } catch (error) { next(error); }
});

router.get('/cuves/stock', async (request, response, next) => {
  try {
    const filters = scope(request, 'c');
    const cuves = await query(`SELECT c.* FROM \`Cuve\` c WHERE 1 = 1${filters.sql} ORDER BY c.code`, filters.values);
    response.json(cuves.map((cuve) => { const stockActuel = Number(cuve.stock); return { id: cuve.id, code: cuve.code, libelle: cuve.libelle, carburant: cuve.carburant, volumeTotal: Number(cuve.volumeTotal), stockActuel, pourcentage: Math.max(0, Math.min(100, stockActuel / Number(cuve.volumeTotal) * 100)) }; }));
  } catch (error) { next(error); }
});

router.post('/retours', requireRole('caissier', 'gerant'), async (request, response, next) => {
  try {
    const input = retourSchema.parse(request.body);
    const pumpIds = [...new Set(input.lignes.map((line) => line.pompeId))];
    const filters = scope(request, 'p');
    const pumps = await query(`SELECT p.*, c.prixAchatHT, c.stock, c.libelle AS cuveLibelle FROM \`Pompe\` p JOIN \`Cuve\` c ON c.id = p.cuveId WHERE p.id IN (${pumpIds.map(() => '?').join(', ')})${filters.sql}`, [...pumpIds, ...filters.values]);
    const pumpMap = new Map(pumps.map((pump) => [Number(pump.id), pump]));
    if (pumpMap.size !== pumpIds.length) { response.status(400).json({ message: 'Une pompe est introuvable ou hors magasin.' }); return; }
    const lines = input.lignes.map((line) => {
      const pump = pumpMap.get(line.pompeId)!;
      if (line.volume > Number(pump.stock)) throw new Error(`Stock insuffisant pour la cuve ${pump.cuveLibelle}.`);
      return { ...line, cuveId: Number(pump.cuveId), valeur: line.volume * Number(pump.prixAchatHT) };
    });
    const magasinId = await activeMagasinId(request);
    const id = await withTransaction(async (connection) => {
      const retourId = await insertRecord('RetourCuve', { date: toDate(input.date), equipeId: input.equipeId, caisseId: input.caisseId, vendeurId: input.vendeurId, magasinId, totalVolume: lines.reduce((sum, line) => sum + line.volume, 0), totalValeur: lines.reduce((sum, line) => sum + line.valeur, 0) }, connection);
      for (const line of lines) {
        await insertRecord('DetailRetour', { retourCuveId: retourId, pompeId: line.pompeId, cuveId: line.cuveId, volume: line.volume, valeur: line.valeur, tauxTVA: line.tauxTVA }, connection);
        const result = await execute('UPDATE `Cuve` SET stock = stock - ?, updatedAt = ? WHERE id = ? AND stock >= ?', [line.volume, new Date(), line.cuveId, line.volume], connection);
        if (!result.affectedRows) throw new Error(`Stock insuffisant pour la cuve ${pumpMap.get(line.pompeId)?.cuveLibelle ?? ''}.`);
      }
      return retourId;
    });
    const retour = await loadRetour(id);
    if (!retour) throw new Error('Created tank return could not be loaded.');
    response.status(201).json({ ...retour, totalVolume: asNumber(retour.totalVolume), totalValeur: asNumber(retour.totalValeur) });
  } catch (error) { next(error); }
});

router.get('/retours', async (request, response, next) => {
  try {
    const conditions = ['1 = 1'];
    const values: SqlValue[] = [];
    if (request.query.equipeId) { conditions.push('r.equipeId = ?'); values.push(Number(request.query.equipeId)); }
    if (typeof request.query.dateFrom === 'string') { conditions.push('r.date >= ?'); values.push(toDate(request.query.dateFrom)); }
    if (typeof request.query.dateTo === 'string') { conditions.push('r.date <= ?'); values.push(toDate(request.query.dateTo, true)); }
    const filters = scope(request, 'r');
    conditions.push(filters.sql.replace(/^ AND /, '') || '1 = 1');
    values.push(...filters.values);
    const rows = await query(`SELECT r.id FROM \`RetourCuve\` r WHERE ${conditions.join(' AND ')} ORDER BY r.date DESC`, values);
    const results = await Promise.all(rows.map((row) => loadRetour(Number(row.id))));
    response.json(results.map((row) => row && ({ ...row, totalVolume: asNumber(row.totalVolume), totalValeur: asNumber(row.totalValeur) })));
  } catch (error) { next(error); }
});

router.get('/retours/:id', async (request, response, next) => {
  try {
    const row = await loadRetour(Number(request.params.id), request.user?.magasinId);
    if (!row) { response.status(404).json({ message: 'Retour cuve introuvable.' }); return; }
    response.json({ ...row, totalVolume: asNumber(row.totalVolume), totalValeur: asNumber(row.totalValeur), details: row.details.map((line) => ({ ...line, volume: asNumber(line.volume), valeur: asNumber(line.valeur), tauxTVA: asNumber(line.tauxTVA) })) });
  } catch (error) { next(error); }
});

router.patch('/retours/:id/valider', requireRole('gerant'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const filters = scope(request, '');
    const suffix = request.user?.magasinId == null ? '' : ' AND magasinId = ?';
    const values: SqlValue[] = [true, new Date(), id, ...filters.values];
    const result = await execute(`UPDATE \`RetourCuve\` SET valide = ?, updatedAt = ? WHERE id = ?${suffix}`, values);
    if (!result.affectedRows) { response.status(404).json({ message: 'Retour cuve introuvable.' }); return; }
    response.json({ valide: true });
  } catch (error) { next(error); }
});

router.post('/inventaires', requireRole('gerant'), async (request, response, next) => {
  try {
    const input = inventaireCarburantSchema.parse(request.body);
    const cuveIds = [...new Set(input.lignes.map((line) => line.cuveId))];
    const filters = scope(request, 'c');
    const cuves = await query(`SELECT c.* FROM \`Cuve\` c WHERE c.id IN (${cuveIds.map(() => '?').join(', ')})${filters.sql}`, [...cuveIds, ...filters.values]);
    const cuveMap = new Map(cuves.map((cuve) => [Number(cuve.id), cuve]));
    if (cuveMap.size !== cuveIds.length) { response.status(400).json({ message: 'Une cuve est introuvable ou hors magasin.' }); return; }
    const magasinId = await activeMagasinId(request);
    const id = await withTransaction(async (connection) => {
      const lines = input.lignes.map((line) => {
        const cuve = cuveMap.get(line.cuveId)!;
        const stockComptable = Number(cuve.stock);
        const prixUnitaire = Number(cuve.prixAchatHT);
        return { cuveId: line.cuveId, stockPhysique: line.stockPhysique, stockComptable, prixUnitaire, valeur: line.stockPhysique * prixUnitaire, ecart: line.stockPhysique - stockComptable };
      });
      const inventoryId = await insertRecord('InventaireCarburant', { date: toDate(input.date), operateur: input.operateur, valeurStock: lines.reduce((sum, line) => sum + line.valeur, 0), magasinId }, connection);
      for (const line of lines) await insertRecord('DetailInventaireCarburant', { inventaireCarId: inventoryId, ...line, date: toDate(input.date) }, connection);
      return inventoryId;
    });
    const created = await loadFuelInventory(id);
    if (!created) throw new Error('Created fuel inventory could not be loaded.');
    response.status(201).json({ ...created, valeurStock: asNumber(created.valeurStock), lignes: created.lignes.map((line) => ({ ...line, stockPhysique: asNumber(line.stockPhysique), stockComptable: asNumber(line.stockComptable), prixUnitaire: asNumber(line.prixUnitaire), valeur: asNumber(line.valeur), ecart: asNumber(line.ecart) })) });
  } catch (error) { next(error); }
});

router.get('/inventaires', async (request, response, next) => {
  try {
    const filters = scope(request, 'i');
    const rows = await query(`SELECT i.* FROM \`InventaireCarburant\` i WHERE 1 = 1${filters.sql} ORDER BY i.date DESC`, filters.values);
    response.json(rows.map((row) => ({ ...row, valeurStock: asNumber(row.valeurStock) })));
  } catch (error) { next(error); }
});

router.get('/inventaires/:id', async (request, response, next) => {
  try {
    const row = await loadFuelInventory(Number(request.params.id), request.user?.magasinId);
    if (!row) { response.status(404).json({ message: 'Inventaire carburant introuvable.' }); return; }
    response.json({ ...row, valeurStock: asNumber(row.valeurStock), lignes: row.lignes.map((line) => ({ ...line, stockPhysique: asNumber(line.stockPhysique), stockComptable: asNumber(line.stockComptable), prixUnitaire: asNumber(line.prixUnitaire), valeur: asNumber(line.valeur), ecart: asNumber(line.ecart) })) });
  } catch (error) { next(error); }
});

router.patch('/inventaires/:id/cloturer', requireRole('gerant'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const inventory = await loadFuelInventory(id, request.user?.magasinId);
    if (!inventory) { response.status(404).json({ message: 'Inventaire carburant introuvable.' }); return; }
    if (inventory.cloture) { response.status(409).json({ message: 'Inventaire deja cloture.' }); return; }
    await withTransaction(async (connection) => {
      for (const line of inventory.lignes) await execute('UPDATE `Cuve` SET stock = ?, updatedAt = ? WHERE id = ?', [line.stockPhysique, new Date(), line.cuveId], connection);
      const values: SqlValue[] = [true, new Date(), id];
      let where = 'id = ?';
      if (request.user?.magasinId != null) { where += ' AND magasinId = ?'; values.push(request.user.magasinId); }
      await execute(`UPDATE \`InventaireCarburant\` SET cloture = ? , updatedAt = ? WHERE ${where}`, values, connection);
    });
    response.json({ id, cloture: true });
  } catch (error) { next(error); }
});

async function defaultSessionIds(request: AuthRequest, equipeId?: number, caisseId?: number) {
  const filters = scope(request, 'x');
  const [team, till] = await Promise.all([
    equipeId ? queryOne('SELECT id FROM `Equipe` WHERE id = ?', [equipeId]) : queryOne(`SELECT x.id FROM \`Equipe\` x WHERE x.actif = ?${filters.sql} ORDER BY x.id LIMIT 1`, [true, ...filters.values]),
    caisseId ? queryOne('SELECT id FROM `Caisse` WHERE id = ?', [caisseId]) : queryOne(`SELECT x.id FROM \`Caisse\` x WHERE x.actif = ?${filters.sql} ORDER BY x.id LIMIT 1`, [true, ...filters.values]),
  ]);
  return { teamId: team?.id as number | undefined, tillId: till?.id as number | undefined };
}

router.post('/jaugeages', requireRole('caissier', 'gerant'), async (request, response, next) => {
  try {
    const input = jaugeageSchema.parse(request.body);
    const { teamId, tillId } = await defaultSessionIds(request, input.equipeId, input.caisseId);
    if (!teamId || !tillId) { response.status(400).json({ message: 'Une equipe et une caisse sont requises.' }); return; }
    const cuve = await queryOne('SELECT * FROM `Cuve` WHERE id = ?', [input.cuveId]);
    if (!cuve) { response.status(400).json({ message: 'Cuve introuvable.' }); return; }
    const id = await insertRecord('Jaugeage', { date: toDate(input.date), cuveId: input.cuveId, equipeId: teamId, caisseId: tillId, niveau: input.quantite, quantite: input.quantite });
    const row = await queryOne('SELECT * FROM `Jaugeage` WHERE id = ?', [id]);
    if (!row) throw new Error('Created tank gauge could not be loaded.');
    response.status(201).json({ ...row, niveau: asNumber(row.niveau), quantite: asNumber(row.quantite), ecart: Number(row.quantite) - Number(cuve.stock) });
  } catch (error) { next(error); }
});

router.post('/jaugeages/batch', requireRole('caissier', 'gerant'), async (request, response, next) => {
  try {
    const input = jaugeagesSchema.parse(request.body);
    const { teamId, tillId } = await defaultSessionIds(request, input.equipeId, input.caisseId);
    if (!teamId || !tillId) { response.status(400).json({ message: 'Une equipe et une caisse sont requises.' }); return; }
    const rows = await withTransaction(async (connection) => {
      const result = [];
      for (const line of input.lignes) {
        const cuve = await queryOne('SELECT * FROM `Cuve` WHERE id = ?', [line.cuveId], connection);
        if (!cuve) throw new Error(`Tank ${line.cuveId} not found.`);
        const id = await insertRecord('Jaugeage', { date: toDate(input.date), cuveId: line.cuveId, equipeId: teamId, caisseId: tillId, niveau: line.quantite, quantite: line.quantite }, connection);
        const row = await queryOne('SELECT * FROM `Jaugeage` WHERE id = ?', [id], connection);
        if (!row) throw new Error('Created tank gauge could not be loaded.');
        result.push({ ...row, quantite: asNumber(row.quantite), stock: asNumber(cuve.stock), ecart: Number(row.quantite) - Number(cuve.stock) });
      }
      return result;
    });
    response.status(201).json(rows);
  } catch (error) { next(error); }
});

router.get('/jaugeages', async (request, response, next) => {
  try {
    const filter = jaugeageFilterSchema.parse(request.query);
    const conditions = ['1 = 1'];
    const values: SqlValue[] = [];
    if (filter.cuveId !== undefined) { conditions.push('j.cuveId = ?'); values.push(filter.cuveId); }
    if (filter.date) { conditions.push('j.date = ?'); values.push(toDate(filter.date)); }
    else {
      if (filter.dateFrom) { conditions.push('j.date >= ?'); values.push(toDate(filter.dateFrom)); }
      if (filter.dateTo) { conditions.push('j.date <= ?'); values.push(toDate(filter.dateTo, true)); }
    }
    const filters = scope(request, 'c');
    conditions.push(filters.sql.replace(/^ AND /, '') || '1 = 1');
    values.push(...filters.values);
    const rows = await query(`SELECT j.*, c.code AS cuveCode, c.libelle AS cuveLibelle, c.carburant AS cuveCarburant, c.volumeTotal, c.stock, c.prixAchatHT, c.stockInitial, c.seuilAlerte FROM \`Jaugeage\` j JOIN \`Cuve\` c ON c.id = j.cuveId WHERE ${conditions.join(' AND ')} ORDER BY j.date DESC`, values);
    response.json(rows.map((row) => ({ ...row, niveau: asNumber(row.niveau), quantite: asNumber(row.quantite), cuve: { id: row.cuveId, code: row.cuveCode, libelle: row.cuveLibelle, carburant: row.cuveCarburant, volumeTotal: row.volumeTotal, stock: asNumber(row.stock), prixAchatHT: row.prixAchatHT, stockInitial: row.stockInitial, seuilAlerte: row.seuilAlerte } })));
  } catch (error) { next(error); }
});

router.get('/jaugeages/ecarts', async (request, response, next) => {
  try {
    const filter = jaugeageFilterSchema.parse(request.query);
    if (!filter.date) { response.status(400).json({ message: 'La date est requise.' }); return; }
    const filters = scope(request, 'c');
    const rows = await query(`SELECT j.cuveId, j.quantite, c.libelle, c.stock FROM \`Jaugeage\` j JOIN \`Cuve\` c ON c.id = j.cuveId WHERE j.date = ?${filters.sql}`, [toDate(filter.date), ...filters.values]);
    response.json(rows.map((row) => { const ecart = Number(row.quantite) - Number(row.stock); return { cuveId: row.cuveId, cuve: row.libelle, stock: Number(row.stock), quantite: Number(row.quantite), ecart, alerte: Math.abs(ecart) > 100 }; }));
  } catch (error) { next(error); }
});

export default router;
