import { Router } from 'express';
import { execute, insertRecord, query, queryOne, withTransaction, type SqlRow, type SqlValue } from '../../lib/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { bonLivraisonSchema, clientSchema, listFilterSchema, reglementSchema } from './clients.schema.js';

const router = Router();
const access = [requireAuth];
const commercialAccess = [requireAuth, requireRole('caissier', 'gerant')];
const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const numberValue = (value: unknown) => value == null ? null : Number(value);
type LoadedBon = SqlRow & { lignes: SqlRow[] };

function dateConditions(column: string, from?: string, to?: string): { sql: string[]; values: SqlValue[] } {
  const sql: string[] = [];
  const values: SqlValue[] = [];
  if (from) { sql.push(`${column} >= ?`); values.push(toDate(from)); }
  if (to) { sql.push(`${column} <= ?`); values.push(toDate(to)); }
  return { sql, values };
}

async function clientBalance(clientId: number) {
  const row = await queryOne(
    'SELECT c.soldeAnterieur + COALESCE((SELECT SUM(dc.montant) FROM `DetailCredit` dc WHERE dc.clientId = c.id), 0) - COALESCE((SELECT SUM(dr.montant) FROM `DetailReglements` dr WHERE dr.clientId = c.id AND dr.valide = ?), 0) AS soldeActuel FROM `Client` c WHERE c.id = ?',
    [true, clientId],
  );
  return row ? Number(row.soldeActuel) : null;
}

async function loadBon(id: number): Promise<LoadedBon | null> {
  const bon = await queryOne(
    'SELECT b.*, c.nomClient, c.adresse AS clientAdresse, c.telephone AS clientTelephone, c.MF AS clientMF FROM `Bonliv` b JOIN `Client` c ON c.id = b.clientId WHERE b.id = ?',
    [id],
  );
  if (!bon) return null;
  const lignes = await query(
    'SELECT d.*, p.code AS produitCode, p.codeProduit, p.libelle AS produitLibelle, p.familleId, p.prixAchatHT, p.prixVenteHT, p.tva AS produitTva, p.tauxTVA AS produitTauxTVA, p.stock, p.fournisseurId, p.actif FROM `Detbonliv` d JOIN `Produit` p ON p.id = d.idProduit WHERE d.bonlivId = ? ORDER BY d.numLigne',
    [id],
  );
  return {
    ...bon,
    client: { id: bon.clientId, nomClient: bon.nomClient, adresse: bon.clientAdresse, telephone: bon.clientTelephone, MF: bon.clientMF },
    lignes: lignes.map((line) => ({
      ...line,
      produit: {
        id: line.idProduit, code: line.produitCode, codeProduit: line.codeProduit, libelle: line.produitLibelle,
        familleId: line.familleId, prixAchatHT: line.prixAchatHT, prixVenteHT: line.prixVenteHT,
        tva: line.produitTva, tauxTVA: line.produitTauxTVA, stock: line.stock, fournisseurId: line.fournisseurId, actif: line.actif,
      },
    })),
  };
}

router.get('/produits', ...access, async (_request, response, next) => {
  try { response.json(await query('SELECT id, code, libelle, prixVenteHT, tva FROM `Produit` WHERE actif = ? ORDER BY libelle', [true])); } catch (error) { next(error); }
});

router.get('/clients', ...access, async (_request, response, next) => {
  try {
    const clients = await query('SELECT * FROM `Client` ORDER BY nomClient');
    const balances = await Promise.all(clients.map((client) => clientBalance(Number(client.id))));
    response.json(clients.map((client, index) => ({ ...client, quota: numberValue(client.quota), soldeAnterieur: numberValue(client.soldeAnterieur), tva: numberValue(client.tva), soldeActuel: balances[index] })));
  } catch (error) { next(error); }
});

router.get('/clients/:id', ...access, async (request, response, next) => {
  try {
    const clientId = Number(request.params.id);
    const client = await queryOne('SELECT * FROM `Client` WHERE id = ?', [clientId]);
    if (!client) { response.status(404).json({ message: 'Client introuvable.' }); return; }
    const [bons, factures, reglements, impayes] = await Promise.all([
      query('SELECT * FROM `Bonliv` WHERE clientId = ? ORDER BY date DESC', [clientId]),
      query('SELECT * FROM `Facture` WHERE clientId = ? ORDER BY date DESC', [clientId]),
      query('SELECT * FROM `DetailReglements` WHERE clientId = ? ORDER BY date DESC', [clientId]),
      query('SELECT * FROM `Impayes` WHERE clientId = ? ORDER BY echeance', [clientId]),
    ]);
    const bonsWithLines = await Promise.all(bons.map(async (bon) => {
      const detailed = await loadBon(Number(bon.id));
      return detailed;
    }));
    const factureDetails = await Promise.all(factures.map(async (facture): Promise<SqlRow> => ({
      ...facture,
      lignes: await query('SELECT d.*, p.code AS produitCode, p.libelle AS produitLibelle FROM `Detfact` d JOIN `Produit` p ON p.id = d.idProduit WHERE d.factureId = ? ORDER BY d.numLigne', [facture.id]),
    })));
    response.json({
      ...client,
      quota: numberValue(client.quota),
      soldeAnterieur: numberValue(client.soldeAnterieur),
      tva: numberValue(client.tva),
      soldeActuel: await clientBalance(clientId),
      bonsLivraison: bonsWithLines.map((bon) => bon && ({
        ...bon,
        totalHT: numberValue(bon.totalHT),
        totalTTC: numberValue(bon.totalTTC),
        totTVA: numberValue(bon.totTVA),
        lignes: bon.lignes.map((line) => ({ ...line, puHT: numberValue(line.puHT), tva: numberValue(line.tva), qte: numberValue(line.qte), remise: numberValue(line.remise), ttc: numberValue(line.ttc) })),
      })),
      factures: factureDetails.map((facture) => ({ ...facture, totalHT: numberValue(facture.totalHT), totalTTC: numberValue(facture.totalTTC), totTVA: numberValue(facture.totTVA), mtTimbre: numberValue(facture.mtTimbre) })),
      reglements: reglements.map((reglement) => ({ ...reglement, montant: numberValue(reglement.montant) })),
      impayes: impayes.map((impaye) => ({ ...impaye, montantLigne: numberValue(impaye.montantLigne) })),
    });
  } catch (error) { next(error); }
});

router.post('/clients', ...access, requireRole('gerant'), async (request, response, next) => {
  try {
    const input = clientSchema.parse(request.body);
    const id = await insertRecord('Client', input);
    const client = await queryOne('SELECT * FROM `Client` WHERE id = ?', [id]);
    if (!client) throw new Error('Inserted client could not be loaded.');
    response.status(201).json({ ...client, quota: numberValue(client.quota), soldeAnterieur: numberValue(client.soldeAnterieur), tva: numberValue(client.tva) });
  } catch (error) { next(error); }
});

router.put('/clients/:id', ...access, requireRole('gerant'), async (request, response, next) => {
  try {
    const input = clientSchema.parse(request.body);
    const id = Number(request.params.id);
    await execute('UPDATE `Client` SET nomClient = ?, adresse = ?, telephone = ?, MF = ?, quota = ?, soldeAnterieur = ?, tva = ?, updatedAt = ? WHERE id = ?', [input.nomClient, input.adresse ?? null, input.telephone ?? null, input.MF ?? null, input.quota, input.soldeAnterieur, input.tva, new Date(), id]);
    const client = await queryOne('SELECT * FROM `Client` WHERE id = ?', [id]);
    if (!client) { response.status(404).json({ message: 'Client introuvable.' }); return; }
    response.json({ ...client, quota: numberValue(client.quota), soldeAnterieur: numberValue(client.soldeAnterieur), tva: numberValue(client.tva) });
  } catch (error) { next(error); }
});

router.post('/bons-livraison', ...commercialAccess, async (request, response, next) => {
  try {
    const input = bonLivraisonSchema.parse(request.body);
    const client = await queryOne('SELECT * FROM `Client` WHERE id = ?', [input.clientId]);
    if (!client) { response.status(404).json({ message: 'Client introuvable.' }); return; }
    const productIds = [...new Set(input.lignes.map((line) => line.idProduit))];
    const placeholders = productIds.map(() => '?').join(', ');
    const products = await query(`SELECT id FROM \`Produit\` WHERE actif = ? AND id IN (${placeholders})`, [true, ...productIds]);
    if (products.length !== productIds.length) { response.status(400).json({ message: 'Un produit est introuvable ou inactif.' }); return; }
    const totals = input.lignes.reduce((total, line) => {
      const ht = Math.max(0, line.puHT * line.qte - line.remise);
      total.ht += ht;
      total.tva += ht * line.tva / 100;
      total.ttc += ht * (1 + line.tva / 100);
      return total;
    }, { ht: 0, tva: 0, ttc: 0 });
    const currentBalance = await clientBalance(input.clientId);
    if (Number(client.quota) > 0 && (currentBalance ?? 0) + totals.ttc > Number(client.quota)) {
      response.status(409).json({ message: 'Le quota client serait depasse.', quota: Number(client.quota), soldeActuel: currentBalance });
      return;
    }
    const id = await withTransaction(async (connection) => {
      const bonId = await insertRecord('Bonliv', { date: toDate(input.date), clientId: input.clientId, totalHT: totals.ht, totalTTC: totals.ttc, totTVA: totals.tva }, connection);
      for (const [index, line] of input.lignes.entries()) {
        const ht = Math.max(0, line.puHT * line.qte - line.remise);
        await insertRecord('Detbonliv', {
          numLigne: index + 1, bonlivId: bonId, idProduit: line.idProduit,
          puHT: line.puHT, tva: line.tva, qte: line.qte, remise: line.remise,
          ttc: ht * (1 + line.tva / 100), date: toDate(input.date),
        }, connection);
      }
      return bonId;
    });
    const bon = await loadBon(id);
    if (!bon) throw new Error('Created delivery note could not be loaded.');
    response.status(201).json({ ...bon, totalHT: numberValue(bon.totalHT), totalTTC: numberValue(bon.totalTTC), totTVA: numberValue(bon.totTVA), lignes: bon.lignes.map((line) => ({ ...line, puHT: numberValue(line.puHT), tva: numberValue(line.tva), qte: numberValue(line.qte), remise: numberValue(line.remise), ttc: numberValue(line.ttc) })) });
  } catch (error) { next(error); }
});

router.get('/bons-livraison', ...access, async (request, response, next) => {
  try {
    const filter = listFilterSchema.parse(request.query);
    const conditions = dateConditions('b.date', filter.dateFrom, filter.dateTo);
    if (filter.clientId !== undefined) { conditions.sql.push('b.clientId = ?'); conditions.values.push(filter.clientId); }
    const bons = await query(`SELECT b.*, c.nomClient, c.adresse AS clientAdresse, c.telephone AS clientTelephone, c.MF AS clientMF FROM \`Bonliv\` b JOIN \`Client\` c ON c.id = b.clientId${conditions.sql.length ? ` WHERE ${conditions.sql.join(' AND ')}` : ''} ORDER BY b.date DESC`, conditions.values);
    response.json(bons.map((bon) => ({ ...bon, client: { id: bon.clientId, nomClient: bon.nomClient, adresse: bon.clientAdresse, telephone: bon.clientTelephone, MF: bon.clientMF }, totalHT: numberValue(bon.totalHT), totalTTC: numberValue(bon.totalTTC), totTVA: numberValue(bon.totTVA) })));
  } catch (error) { next(error); }
});

router.post('/bons-livraison/:id/facturer', ...commercialAccess, async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const bon = await queryOne('SELECT * FROM `Bonliv` WHERE id = ?', [id]);
    if (!bon) { response.status(404).json({ message: 'Bon de livraison introuvable.' }); return; }
    if (bon.numFact) { response.status(409).json({ message: 'Ce bon est deja facture.', factureId: bon.numFact }); return; }
    const factureId = await withTransaction(async (connection) => {
      const lockedBon = await queryOne('SELECT * FROM `Bonliv` WHERE id = ? FOR UPDATE', [id], connection);
      if (!lockedBon) throw new Error('Delivery note disappeared during invoicing.');
      if (lockedBon.numFact) {
        const conflict = new Error('Ce bon est deja facture.') as Error & { statusCode?: number };
        conflict.statusCode = 409;
        throw conflict;
      }
      const lignes = await query('SELECT * FROM `Detbonliv` WHERE bonlivId = ? ORDER BY numLigne', [id], connection);
      const invoiceId = await insertRecord('Facture', { date: lockedBon.date, clientId: lockedBon.clientId, totalHT: lockedBon.totalHT, totalTTC: lockedBon.totalTTC, totTVA: lockedBon.totTVA, numBL: id }, connection);
      for (const line of lignes) {
        await insertRecord('Detfact', { numLigne: line.numLigne, factureId: invoiceId, idProduit: line.idProduit, puHT: line.puHT, qte: line.qte, ttc: line.ttc, date: line.date }, connection);
      }
      await execute('UPDATE `Bonliv` SET numFact = ?, updatedAt = ? WHERE id = ?', [invoiceId, new Date(), id], connection);
      return invoiceId;
    });
    const facture = await queryOne('SELECT * FROM `Facture` WHERE id = ?', [factureId]);
    if (!facture) throw new Error('Created invoice could not be loaded.');
    response.status(201).json({ ...facture, totalHT: numberValue(facture.totalHT), totalTTC: numberValue(facture.totalTTC), totTVA: numberValue(facture.totTVA), mtTimbre: numberValue(facture.mtTimbre) });
  } catch (error) { next(error); }
});

router.get('/factures', ...access, async (request, response, next) => {
  try {
    const filter = listFilterSchema.parse(request.query);
    const conditions = dateConditions('f.date', filter.dateFrom, filter.dateTo);
    if (filter.clientId !== undefined) { conditions.sql.push('f.clientId = ?'); conditions.values.push(filter.clientId); }
    const factures = await query(`SELECT f.*, c.nomClient, c.adresse AS clientAdresse, c.telephone AS clientTelephone, c.MF AS clientMF FROM \`Facture\` f JOIN \`Client\` c ON c.id = f.clientId${conditions.sql.length ? ` WHERE ${conditions.sql.join(' AND ')}` : ''} ORDER BY f.date DESC`, conditions.values);
    response.json(factures.map((facture) => ({ ...facture, client: { id: facture.clientId, nomClient: facture.nomClient, adresse: facture.clientAdresse, telephone: facture.clientTelephone, MF: facture.clientMF }, totalHT: numberValue(facture.totalHT), totalTTC: numberValue(facture.totalTTC), totTVA: numberValue(facture.totTVA), mtTimbre: numberValue(facture.mtTimbre), statut: 'impayee' })));
  } catch (error) { next(error); }
});

router.post('/reglements', ...commercialAccess, async (request, response, next) => {
  try {
    const input = reglementSchema.parse(request.body);
    const result = await withTransaction(async (connection) => {
      const reglementId = await insertRecord('DetailReglements', { clientId: input.clientId, equipeId: input.equipeId, caisseId: input.caisseId, date: toDate(input.date), montant: input.montant, modePayment: input.modePayment, echeance: input.echeance ? toDate(input.echeance) : undefined, impaye: input.impaye, valide: input.valide }, connection);
      const reglement = await queryOne('SELECT * FROM `DetailReglements` WHERE id = ?', [reglementId], connection);
      if (!reglement) throw new Error('Created client payment could not be loaded.');
      if (input.impaye || input.echeance) {
        await insertRecord('Impayes', { numReg: reglementId, clientId: input.clientId, dateReg: toDate(input.date), montantLigne: input.montant, echeance: input.echeance ? toDate(input.echeance) : undefined, numCheque: input.numCheque, numRib: input.numRib, nomBanque: input.nomBanque, impaye: input.impaye, valide: input.valide }, connection);
      }
      return reglement;
    });
    response.status(201).json({ ...result, montant: numberValue(result.montant) });
  } catch (error) { next(error); }
});

router.get('/impayes', ...access, async (request, response, next) => {
  try {
    const clientId = request.query.clientId ? Number(request.query.clientId) : undefined;
    const values: number[] = [];
    const where = ['i.impaye = ?'];
    values.push(1);
    if (clientId !== undefined) { where.push('i.clientId = ?'); values.push(clientId); }
    const impayes = await query(`SELECT i.*, c.nomClient, c.adresse AS clientAdresse FROM \`Impayes\` i JOIN \`Client\` c ON c.id = i.clientId WHERE ${where.join(' AND ')} ORDER BY i.echeance`, values);
    const now = Date.now();
    response.json(impayes.map((item) => ({ ...item, client: { id: item.clientId, nomClient: item.nomClient, adresse: item.clientAdresse }, montantLigne: numberValue(item.montantLigne), joursRetard: item.echeance ? Math.max(0, Math.floor((now - new Date(item.echeance).getTime()) / 86400000)) : 0 })));
  } catch (error) { next(error); }
});

export default router;
