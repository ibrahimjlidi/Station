import { Router } from 'express';
import { execute, insertRecord, query, queryOne, withTransaction, type SqlRow, type SqlValue } from '../../lib/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { carWashSchema, entretienSchema, serviceSchema, vehiculeSchema } from './entretien.schema.js';

const router = Router();
const access = [requireAuth];
const write = [requireAuth, requireRole('caissier', 'gerant')];
const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const n = (value: unknown) => Number(value ?? 0);

router.get('/entretiens', ...access, async (_request, response, next) => {
  try {
    const rows = await query('SELECT e.*, c.nomClient FROM `Entretien` e JOIN `Client` c ON c.id = e.clientId ORDER BY e.dateEnt DESC');
    response.json(rows.map((row) => ({ ...row, totEntTTC: n(row.totEntTTC), indexKm: n(row.indexKm), prochainIndex: n(row.prochainIndex), client: { id: row.clientId, nomClient: row.nomClient } })));
  } catch (error) { next(error); }
});

router.post('/entretiens', ...write, async (request, response, next) => {
  try {
    const input = entretienSchema.parse(request.body);
    const vehicle = input.vehiculeId
      ? await queryOne('SELECT * FROM `Vehicule` WHERE id = ? AND clientId = ?', [input.vehiculeId, input.clientId])
      : await queryOne('SELECT * FROM `Vehicule` WHERE clientId = ? AND matricule = ?', [input.clientId, input.matricule]);
    if (input.vehiculeId && !vehicle) { response.status(400).json({ message: 'Vehicule introuvable pour ce client.' }); return; }
    let vehicleId = vehicle?.id as number | undefined;
    if (!vehicleId) {
      vehicleId = await insertRecord('Vehicule', { clientId: input.clientId, matricule: input.matricule });
    }

    const serviceIds = [...new Set(input.lignes.flatMap((line) => line.serviceId ? [line.serviceId] : []))];
    const catalog = serviceIds.length
      ? await query(`SELECT * FROM \`Service\` WHERE actif = ? AND id IN (${serviceIds.map(() => '?').join(', ')})`, [true, ...serviceIds])
      : [];
    const serviceMap = new Map(catalog.map((service) => [Number(service.id), service]));
    const lines = input.lignes.map((line) => {
      const service = line.serviceId ? serviceMap.get(line.serviceId) : undefined;
      if (line.serviceId && !service) throw new Error(`Active service ${line.serviceId} was not found.`);
      const prixHT = service ? n(service.prixHT) : line.prixHT!;
      const tauxTVA = service ? n(service.tauxTVA) : line.tauxTVA!;
      return { idService: line.idService, serviceId: line.serviceId, prixHT, tauxTVA, prixTTC: prixHT * (1 + tauxTVA / 100) };
    });
    const total = lines.reduce((sum, line) => sum + line.prixTTC, 0);
    const row = await withTransaction<SqlRow & { details: SqlRow[] }>(async (connection) => {
      const id = await insertRecord('Entretien', { dateEnt: toDate(input.dateEnt), matricule: input.matricule, clientId: input.clientId, vehiculeId: vehicleId, indexKm: input.indexKm, prochainIndex: input.prochainIndex, totEntTTC: total }, connection);
      for (const [index, line] of lines.entries()) {
        await insertRecord('Detentretien', { entretienId: id, idService: line.idService, serviceId: line.serviceId, prixHT: line.prixHT, prixTTC: line.prixTTC, numLigne: index + 1 }, connection);
      }
      const entretien = await queryOne('SELECT e.*, c.nomClient FROM `Entretien` e JOIN `Client` c ON c.id = e.clientId WHERE e.id = ?', [id], connection);
      const details = await query('SELECT d.*, s.libelle AS catalogLibelle FROM `Detentretien` d LEFT JOIN `Service` s ON s.id = d.serviceId WHERE d.entretienId = ? ORDER BY d.numLigne', [id], connection);
      if (!entretien) throw new Error('Created maintenance record could not be loaded.');
      return { ...entretien, details };
    });
    response.status(201).json({ ...row, totEntTTC: n(row.totEntTTC) });
  } catch (error) { next(error); }
});

router.get('/entretiens/:id', ...access, async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const row = await queryOne('SELECT e.*, c.nomClient FROM `Entretien` e JOIN `Client` c ON c.id = e.clientId WHERE e.id = ?', [id]);
    if (!row) { response.status(404).json({ message: 'Entretien introuvable.' }); return; }
    const details = await query('SELECT d.*, p.code AS serviceCode, p.libelle AS serviceLibelle FROM `Detentretien` d LEFT JOIN `Produit` p ON p.id = d.idService WHERE d.entretienId = ? ORDER BY d.numLigne', [id]);
    response.json({
      ...row,
      client: { id: row.clientId, nomClient: row.nomClient },
      totEntTTC: n(row.totEntTTC),
      indexKm: n(row.indexKm),
      prochainIndex: n(row.prochainIndex),
      details: details.map((line) => ({ ...line, service: line.idService == null ? null : { id: line.idService, code: line.serviceCode, libelle: line.serviceLibelle }, prixHT: n(line.prixHT), prixTTC: n(line.prixTTC) })),
    });
  } catch (error) { next(error); }
});

router.get('/carwash', ...access, async (_request, response, next) => {
  try {
    const rows = await query('SELECT * FROM `CarWash` ORDER BY date DESC');
    response.json(rows.map((row) => ({ ...row, indexOuverture: n(row.indexOuverture), indexFermeture: n(row.indexFermeture), nombreLavage: n(row.nombreLavage) })));
  } catch (error) { next(error); }
});

router.post('/carwash', ...write, async (request, response, next) => {
  try {
    const input = carWashSchema.parse(request.body);
    if (input.indexFermeture < input.indexOuverture) { response.status(400).json({ message: 'Index fermeture invalide.' }); return; }
    const date = toDate(input.date);
    await execute('INSERT INTO `CarWash` (date, indexOuverture, indexFermeture, nombreLavage, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE indexOuverture = VALUES(indexOuverture), indexFermeture = VALUES(indexFermeture), nombreLavage = VALUES(nombreLavage), updatedAt = VALUES(updatedAt)', [date, input.indexOuverture, input.indexFermeture, input.indexFermeture - input.indexOuverture, new Date(), new Date()]);
    const row = await queryOne('SELECT * FROM `CarWash` WHERE date = ?', [date]);
    if (!row) throw new Error('Car wash record could not be loaded.');
    response.status(201).json(row);
  } catch (error) { next(error); }
});

router.get('/vehicules', ...access, async (request, response, next) => {
  try {
    const values: SqlValue[] = [];
    const filter = request.query.clientId ? ' WHERE v.clientId = ?' : '';
    if (request.query.clientId) values.push(Number(request.query.clientId));
    const rows = await query(`SELECT v.*, c.nomClient FROM \`Vehicule\` v JOIN \`Client\` c ON c.id = v.clientId${filter} ORDER BY v.matricule`, values);
    response.json(rows.map((row) => ({ ...row, indexKmActuel: row.indexKmActuel == null ? null : Number(row.indexKmActuel), client: { id: row.clientId, nomClient: row.nomClient } })));
  } catch (error) { next(error); }
});

router.post('/vehicules', ...write, async (request, response, next) => {
  try {
    const input = vehiculeSchema.parse(request.body);
    const id = await insertRecord('Vehicule', { ...input, indexKmActuel: input.indexKmActuel == null ? undefined : BigInt(input.indexKmActuel) });
    const row = await queryOne('SELECT v.*, c.nomClient FROM `Vehicule` v JOIN `Client` c ON c.id = v.clientId WHERE v.id = ?', [id]);
    if (!row) throw new Error('Inserted vehicle could not be loaded.');
    response.status(201).json({ ...row, client: { id: row.clientId, nomClient: row.nomClient }, indexKmActuel: row.indexKmActuel == null ? null : Number(row.indexKmActuel) });
  } catch (error) { next(error); }
});

router.put('/vehicules/:id', ...write, async (request, response, next) => {
  try {
    const input = vehiculeSchema.partial().parse(request.body);
    const id = Number(request.params.id);
    const values = { ...input, indexKmActuel: input.indexKmActuel == null ? input.indexKmActuel : BigInt(input.indexKmActuel) } as Record<string, SqlValue | undefined>;
    const fields = Object.entries(values).filter((entry) => entry[1] !== undefined);
    if (fields.length) {
      const sql = fields.map(([field]) => `\`${field}\` = ?`).join(', ');
      await execute(`UPDATE \`Vehicule\` SET ${sql}, updatedAt = ? WHERE id = ?`, [...fields.map(([, value]) => value!), new Date(), id]);
    }
    const row = await queryOne('SELECT v.*, c.nomClient FROM `Vehicule` v JOIN `Client` c ON c.id = v.clientId WHERE v.id = ?', [id]);
    if (!row) { response.status(404).json({ message: 'Vehicule introuvable.' }); return; }
    response.json({ ...row, client: { id: row.clientId, nomClient: row.nomClient }, indexKmActuel: row.indexKmActuel == null ? null : Number(row.indexKmActuel) });
  } catch (error) { next(error); }
});

router.get('/vehicules/:id/historique', ...access, async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const vehicle = await queryOne('SELECT * FROM `Vehicule` WHERE id = ?', [id]);
    if (!vehicle) { response.status(404).json({ message: 'Vehicule introuvable.' }); return; }
    const entretiens = await query('SELECT * FROM `Entretien` WHERE vehiculeId = ? ORDER BY dateEnt DESC', [id]);
    const details = await Promise.all(entretiens.map((item) => query('SELECT d.*, s.libelle AS catalogLibelle FROM `Detentretien` d LEFT JOIN `Service` s ON s.id = d.serviceId WHERE d.entretienId = ? ORDER BY d.numLigne', [item.id])));
    response.json({
      ...vehicle,
      indexKmActuel: vehicle.indexKmActuel == null ? null : Number(vehicle.indexKmActuel),
      entretiens: entretiens.map((item, index) => ({
        ...item,
        totEntTTC: n(item.totEntTTC),
        indexKm: n(item.indexKm),
        prochainIndex: n(item.prochainIndex),
        details: details[index].map((line) => ({ ...line, serviceCatalog: line.serviceId == null ? null : { id: line.serviceId, libelle: line.catalogLibelle }, prixHT: n(line.prixHT), prixTTC: n(line.prixTTC) })),
      })),
    });
  } catch (error) { next(error); }
});

router.get('/services', ...access, async (_request, response, next) => {
  try { const rows = await query('SELECT * FROM `Service` WHERE actif = ? ORDER BY libelle', [true]); response.json(rows.map((row) => ({ ...row, prixHT: n(row.prixHT), tauxTVA: n(row.tauxTVA), prixTTC: n(row.prixTTC) }))); } catch (error) { next(error); }
});

router.post('/services', requireAuth, requireRole('gerant'), async (request, response, next) => {
  try {
    const input = serviceSchema.parse(request.body);
    const id = await insertRecord('Service', { ...input, prixTTC: input.prixHT * (1 + input.tauxTVA / 100) });
    const row = await queryOne('SELECT * FROM `Service` WHERE id = ?', [id]);
    if (!row) throw new Error('Inserted service could not be loaded.');
    response.status(201).json({ ...row, prixHT: n(row.prixHT), tauxTVA: n(row.tauxTVA), prixTTC: n(row.prixTTC) });
  } catch (error) { next(error); }
});

router.put('/services/:id', requireAuth, requireRole('gerant'), async (request, response, next) => {
  try {
    const input = serviceSchema.partial().parse(request.body);
    const id = Number(request.params.id);
    const current = await queryOne('SELECT * FROM `Service` WHERE id = ?', [id]);
    if (!current) { response.status(404).json({ message: 'Service introuvable.' }); return; }
    const prixHT = input.prixHT ?? n(current.prixHT);
    const tauxTVA = input.tauxTVA ?? n(current.tauxTVA);
    const fields = { ...input, prixHT, tauxTVA, prixTTC: prixHT * (1 + tauxTVA / 100) };
    const assignments = Object.keys(fields).map((field) => `\`${field}\` = ?`).join(', ');
    await execute(`UPDATE \`Service\` SET ${assignments}, updatedAt = ? WHERE id = ?`, [...Object.values(fields), new Date(), id]);
    const row = await queryOne('SELECT * FROM `Service` WHERE id = ?', [id]);
    if (!row) throw new Error('Updated service could not be loaded.');
    response.json({ ...row, prixHT: n(row.prixHT), tauxTVA: n(row.tauxTVA), prixTTC: n(row.prixTTC) });
  } catch (error) { next(error); }
});

router.patch('/services/:id/toggle', requireAuth, requireRole('gerant'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const current = await queryOne('SELECT actif FROM `Service` WHERE id = ?', [id]);
    if (!current) { response.status(404).json({ message: 'Service introuvable.' }); return; }
    await execute('UPDATE `Service` SET actif = ?, updatedAt = ? WHERE id = ?', [!current.actif, new Date(), id]);
    const row = await queryOne('SELECT * FROM `Service` WHERE id = ?', [id]);
    if (!row) throw new Error('Updated service could not be loaded.');
    response.json(row);
  } catch (error) { next(error); }
});

export default router;
