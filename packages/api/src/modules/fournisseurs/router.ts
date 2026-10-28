import { Router } from 'express';
import { execute, insertRecord, query, queryOne, withTransaction, type SqlRow, type SqlValue } from '../../lib/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { avoirSchema, fournisseurSchema, imputationSchema, listFilterSchema, reglementFournisseurSchema, retenueSourceSchema } from './fournisseurs.schema.js';

const router = Router();
const readAccess = [requireAuth];
const managerAccess = [requireAuth, requireRole('gerant')];
const paymentAccess = [requireAuth, requireRole('caissier', 'gerant')];
const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const numberValue = (value: unknown) => value == null ? null : Number(value);
type SupplierPaymentRow = SqlRow & { details: SqlRow[] };

function filterSql(dateColumn: string, from?: string, to?: string, fournisseurId?: number) {
  const conditions: string[] = [];
  const values: SqlValue[] = [];
  if (fournisseurId !== undefined) { conditions.push('fournisseurId = ?'); values.push(fournisseurId); }
  if (from) { conditions.push(`${dateColumn} >= ?`); values.push(toDate(from)); }
  if (to) { conditions.push(`${dateColumn} <= ?`); values.push(toDate(to)); }
  return { where: conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '', values };
}

async function supplierById(id: number) {
  return queryOne('SELECT * FROM `Fournisseur` WHERE id = ?', [id]);
}

router.get('/fournisseurs', ...readAccess, async (_request, response, next) => {
  try {
    const rows = await query(
      'SELECT f.id, f.code, f.raisonSociale, f.matriculeFiscal, f.telephone, f.adresse, COALESCE(a.totalAchats, 0) AS totalAchats, COALESCE(r.totalRegle, 0) AS totalRegle FROM `Fournisseur` f LEFT JOIN (SELECT a.fournisseurId, SUM(d.quantite * d.prixUnitaire) AS totalAchats FROM `AchatEssence` a JOIN `DetailAchatEssence` d ON d.achatId = a.id GROUP BY a.fournisseurId) a ON a.fournisseurId = f.id LEFT JOIN (SELECT r.fournisseurId, SUM(d.montant) AS totalRegle FROM `RegFour` r JOIN `DetailRegFour` d ON d.regFourId = r.id GROUP BY r.fournisseurId) r ON r.fournisseurId = f.id ORDER BY f.raisonSociale',
    );
    response.json(rows.map((row) => ({ ...row, totalAchats: Number(row.totalAchats), totalRegle: Number(row.totalRegle), soldeRestant: Number(row.totalAchats) - Number(row.totalRegle) })));
  } catch (error) { next(error); }
});

router.post('/fournisseurs', ...managerAccess, async (request, response, next) => {
  try {
    const id = await insertRecord('Fournisseur', fournisseurSchema.parse(request.body));
    const row = await supplierById(id);
    if (!row) throw new Error('Inserted supplier could not be loaded.');
    response.status(201).json(row);
  } catch (error) { next(error); }
});

router.put('/fournisseurs/:id', ...managerAccess, async (request, response, next) => {
  try {
    const input = fournisseurSchema.parse(request.body);
    const id = Number(request.params.id);
    await execute('UPDATE `Fournisseur` SET code = ?, raisonSociale = ?, matriculeFiscal = ?, telephone = ?, adresse = ?, updatedAt = ? WHERE id = ?', [input.code, input.raisonSociale, input.matriculeFiscal ?? null, input.telephone ?? null, input.adresse ?? null, new Date(), id]);
    const row = await supplierById(id);
    if (!row) { response.status(404).json({ message: 'Fournisseur introuvable.' }); return; }
    response.json(row);
  } catch (error) { next(error); }
});

router.get('/achats', ...readAccess, async (request, response, next) => {
  try {
    const fournisseurId = request.query.fournisseurId ? Number(request.query.fournisseurId) : undefined;
    const values: SqlValue[] = [];
    const where = fournisseurId === undefined ? '' : ' WHERE a.fournisseurId = ?';
    if (fournisseurId !== undefined) values.push(fournisseurId);
    const achats = await query(`SELECT a.* FROM \`AchatEssence\` a${where} ORDER BY a.date DESC`, values);
    const result = await Promise.all(achats.map(async (achat) => ({
      ...achat,
      details: await query('SELECT * FROM `DetailAchatEssence` WHERE achatId = ? ORDER BY id', [achat.id]),
    })));
    response.json(result.map((achat) => ({ ...achat, details: achat.details.map((detail) => ({ ...detail, quantite: numberValue(detail.quantite), prixUnitaire: numberValue(detail.prixUnitaire) })) })));
  } catch (error) { next(error); }
});

router.post('/reglements-fournisseurs', ...paymentAccess, async (request, response, next) => {
  try {
    const input = reglementFournisseurSchema.parse(request.body);
    const fournisseur = await supplierById(input.fournisseurId);
    if (!fournisseur) { response.status(404).json({ message: 'Fournisseur introuvable.' }); return; }
    const total = input.lignes.reduce((sum, line) => sum + line.montant, 0);
    const reglement = await withTransaction<SupplierPaymentRow>(async (connection) => {
      const id = await insertRecord('RegFour', { fournisseurId: input.fournisseurId, date: toDate(input.date), montantTotal: total, valide: input.valide }, connection);
      for (const [index, line] of input.lignes.entries()) {
        await insertRecord('DetailRegFour', { regFourId: id, nLigne: index + 1, numAchats: line.numAchats, proEss: line.proEss, montant: line.montant, modePayment: line.modePayment, echeance: line.echeance ? toDate(line.echeance) : undefined, reste: line.reste }, connection);
      }
      const row = await queryOne('SELECT * FROM `RegFour` WHERE id = ?', [id], connection);
      const details = await query('SELECT * FROM `DetailRegFour` WHERE regFourId = ? ORDER BY nLigne', [id], connection);
      if (!row) throw new Error('Created supplier payment could not be loaded.');
      return { ...row, fournisseur, details };
    });
    response.status(201).json({ ...reglement, montantTotal: numberValue(reglement.montantTotal), details: reglement.details.map((line) => ({ ...line, montant: numberValue(line.montant), reste: numberValue(line.reste) })) });
  } catch (error) { next(error); }
});

router.get('/reglements-fournisseurs', ...readAccess, async (request, response, next) => {
  try {
    const filter = listFilterSchema.parse(request.query);
    const filters = filterSql('date', filter.dateFrom, filter.dateTo, filter.fournisseurId);
    const rows = await query(`SELECT r.*, f.code AS fournisseurCode, f.raisonSociale, f.matriculeFiscal, f.telephone, f.adresse FROM \`RegFour\` r JOIN \`Fournisseur\` f ON f.id = r.fournisseurId${filters.where.replaceAll('fournisseurId', 'r.fournisseurId').replaceAll('date', 'r.date')} ORDER BY r.date DESC`, filters.values);
    const results = await Promise.all(rows.map(async (row): Promise<SupplierPaymentRow> => {
      const details = await query('SELECT * FROM `DetailRegFour` WHERE regFourId = ? ORDER BY nLigne', [row.id]);
      return {
        ...row,
        fournisseur: { id: row.fournisseurId, code: row.fournisseurCode, raisonSociale: row.raisonSociale, matriculeFiscal: row.matriculeFiscal, telephone: row.telephone, adresse: row.adresse },
        details,
      };
    }));
    response.json(results.map((row) => ({ ...row, montantTotal: numberValue(row.montantTotal), reste: row.details.reduce((sum, line) => sum + Number(line.reste), 0), details: row.details.map((line) => ({ ...line, montant: numberValue(line.montant), reste: numberValue(line.reste) })) })));
  } catch (error) { next(error); }
});

router.post('/retenues-source', ...managerAccess, async (request, response, next) => {
  try {
    const input = retenueSourceSchema.parse(request.body);
    if (input.lignes.some((line) => line.fournisseurId !== input.fournisseurId)) { response.status(400).json({ message: 'Toutes les lignes doivent appartenir au fournisseur selectionne.' }); return; }
    const fournisseur = await supplierById(input.fournisseurId);
    if (!fournisseur) { response.status(404).json({ message: 'Fournisseur introuvable.' }); return; }
    const totalBrut = input.lignes.reduce((sum, line) => sum + line.mtBrut, 0);
    const totalRetenu = input.lignes.reduce((sum, line) => sum + line.mtBrut * line.tauxRetenu / 100, 0);
    const retenue = await withTransaction<SqlRow>(async (connection) => {
      const id = await insertRecord('EntRas', { dateRas: toDate(input.dateRas), fournisseurId: input.fournisseurId, totalBrut, totalRetenu, totalNet: totalBrut - totalRetenu, valide: input.valide }, connection);
      for (const [index, line] of input.lignes.entries()) {
        await insertRecord('DetRas', { numRas: id, numLigne: index + 1, codeRet: line.codeRet, mtBrut: line.mtBrut, tauxRetenu: line.tauxRetenu, mtRetenu: line.mtBrut * line.tauxRetenu / 100, fournisseurId: line.fournisseurId, valide: line.valide }, connection);
      }
      const row = await queryOne('SELECT * FROM `EntRas` WHERE id = ?', [id], connection);
      const details = await query('SELECT * FROM `DetRas` WHERE numRas = ? ORDER BY numLigne', [id], connection);
      if (!row) throw new Error('Created withholding could not be loaded.');
      return { ...row, fournisseur, details };
    });
    response.status(201).json({ ...retenue, totalBrut: numberValue(retenue.totalBrut), totalRetenu: numberValue(retenue.totalRetenu), totalNet: numberValue(retenue.totalNet) });
  } catch (error) { next(error); }
});

router.get('/retenues-source', ...readAccess, async (request, response, next) => {
  try {
    const filter = listFilterSchema.parse(request.query);
    const filters = filterSql('dateRas', filter.dateFrom, filter.dateTo, filter.fournisseurId);
    const rows = await query(`SELECT r.*, f.code AS fournisseurCode, f.raisonSociale, f.matriculeFiscal, f.telephone, f.adresse FROM \`EntRas\` r JOIN \`Fournisseur\` f ON f.id = r.fournisseurId${filters.where.replaceAll('fournisseurId', 'r.fournisseurId').replaceAll('dateRas', 'r.dateRas')} ORDER BY r.dateRas DESC`, filters.values);
    const results = await Promise.all(rows.map(async (row): Promise<SqlRow & { details: SqlRow[] }> => ({
      ...row,
      fournisseur: { id: row.fournisseurId, code: row.fournisseurCode, raisonSociale: row.raisonSociale, matriculeFiscal: row.matriculeFiscal, telephone: row.telephone, adresse: row.adresse },
      details: await query('SELECT * FROM `DetRas` WHERE numRas = ? ORDER BY numLigne', [row.id]),
    })));
    response.json(results.map((row) => ({ ...row, totalBrut: numberValue(row.totalBrut), totalRetenu: numberValue(row.totalRetenu), totalNet: numberValue(row.totalNet) })));
  } catch (error) { next(error); }
});

router.get('/libras', ...readAccess, async (_request, response, next) => {
  try { response.json(await query('SELECT * FROM `LibRas` ORDER BY tauxRetenu')); } catch (error) { next(error); }
});

router.post('/fournisseurs/avoirs', ...managerAccess, async (request, response, next) => {
  try {
    const input = avoirSchema.parse(request.body);
    const id = await insertRecord('EntAvoir', { ...input, dateAchat: toDate(input.dateAchat), reste: input.totalTTC, magasinId: request.user!.magasinId });
    const row = await queryOne('SELECT a.*, f.code AS fournisseurCode, f.raisonSociale, f.matriculeFiscal, f.telephone, f.adresse FROM `EntAvoir` a JOIN `Fournisseur` f ON f.id = a.fournisseurId WHERE a.id = ?', [id]);
    if (!row) throw new Error('Inserted supplier credit could not be loaded.');
    response.status(201).json({ ...row, fournisseur: { id: row.fournisseurId, code: row.fournisseurCode, raisonSociale: row.raisonSociale, matriculeFiscal: row.matriculeFiscal, telephone: row.telephone, adresse: row.adresse }, totalTTC: numberValue(row.totalTTC), reste: numberValue(row.reste) });
  } catch (error) { next(error); }
});

router.get('/fournisseurs/avoirs', ...readAccess, async (request, response, next) => {
  try {
    const values: SqlValue[] = [];
    const scope = request.user?.magasinId == null ? '' : ' WHERE a.magasinId = ?';
    if (request.user?.magasinId != null) values.push(request.user.magasinId);
    const rows = await query(`SELECT a.*, f.code AS fournisseurCode, f.raisonSociale, f.matriculeFiscal, f.telephone, f.adresse FROM \`EntAvoir\` a JOIN \`Fournisseur\` f ON f.id = a.fournisseurId${scope} ORDER BY a.dateAchat DESC`, values);
    response.json(rows.map((row) => ({ ...row, fournisseur: { id: row.fournisseurId, code: row.fournisseurCode, raisonSociale: row.raisonSociale, matriculeFiscal: row.matriculeFiscal, telephone: row.telephone, adresse: row.adresse }, totalTTC: numberValue(row.totalTTC), reste: numberValue(row.reste) })));
  } catch (error) { next(error); }
});

router.patch('/fournisseurs/avoirs/:id/valider', ...managerAccess, async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const values: SqlValue[] = [id];
    let where = 'id = ?';
    if (request.user?.magasinId != null) { where += ' AND magasinId = ?'; values.push(request.user.magasinId); }
    const result = await execute(`UPDATE \`EntAvoir\` SET valide = ?, updatedAt = ? WHERE ${where}`, [true, new Date(), ...values]);
    if (!result.affectedRows) { response.status(404).json({ message: 'Avoir introuvable.' }); return; }
    response.json({ valide: true });
  } catch (error) { next(error); }
});

router.patch('/fournisseurs/avoirs/:id/imputer', ...paymentAccess, async (request, response, next) => {
  try {
    const input = imputationSchema.parse(request.body);
    const id = Number(request.params.id);
    const values: SqlValue[] = [id];
    let where = 'id = ?';
    if (request.user?.magasinId != null) { where += ' AND magasinId = ?'; values.push(request.user.magasinId); }
    const row = await queryOne(`SELECT * FROM \`EntAvoir\` WHERE ${where}`, values);
    if (!row) { response.status(404).json({ message: 'Avoir introuvable.' }); return; }
    if (input.montant > Number(row.reste)) { response.status(400).json({ message: 'Le montant depasse le reste de l avoir.' }); return; }
    await execute(`UPDATE \`EntAvoir\` SET reste = ?, updatedAt = ? WHERE ${where}`, [Number(row.reste) - input.montant, new Date(), ...values]);
    const updated = await queryOne('SELECT a.*, f.code AS fournisseurCode, f.raisonSociale, f.matriculeFiscal, f.telephone, f.adresse FROM `EntAvoir` a JOIN `Fournisseur` f ON f.id = a.fournisseurId WHERE a.id = ?', [id]);
    if (!updated) throw new Error('Updated supplier credit could not be loaded.');
    response.json({ ...updated, fournisseur: { id: updated.fournisseurId, code: updated.fournisseurCode, raisonSociale: updated.raisonSociale, matriculeFiscal: updated.matriculeFiscal, telephone: updated.telephone, adresse: updated.adresse }, totalTTC: numberValue(updated.totalTTC), reste: numberValue(updated.reste) });
  } catch (error) { next(error); }
});

export default router;
