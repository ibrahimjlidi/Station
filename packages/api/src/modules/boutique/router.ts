import { Router } from 'express';
import { execute, insertRecord, query, queryOne, updateRecord, withTransaction, type SqlRow, type SqlValue } from '../../lib/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { achatSchema, familleSchema, filterSchema, inventSchema, produitSchema, transfertSchema } from './boutique.schema.js';

const router = Router();
const read = [requireAuth];
const cashier = [requireAuth, requireRole('caissier', 'gerant')];
const manager = [requireAuth, requireRole('gerant')];
const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const numberValue = (value: unknown) => value == null ? null : Number(value);

function scopedStore(request: { user?: { magasinId: number | null } }, alias: string) {
  return request.user?.magasinId == null ? { clause: '', values: [] as SqlValue[] } : { clause: ` AND ${alias}.magasinId = ?`, values: [request.user.magasinId] as SqlValue[] };
}

router.get('/produits', ...read, async (request, response, next) => {
  try {
    const conditions = ['p.actif = ?'];
    const values: SqlValue[] = [true];
    if (request.query.familleId) { conditions.push('p.familleId = ?'); values.push(Number(request.query.familleId)); }
    const rows = await query(`SELECT p.*, f.libelle AS familleLibelle, f.cumulOuiNon, f.typeProd, f.compteCPT, f.compteACH, s.code AS fournisseurCode, s.raisonSociale, s.matriculeFiscal, s.telephone AS fournisseurTelephone, s.adresse AS fournisseurAdresse FROM \`Produit\` p LEFT JOIN \`FamilleProduit\` f ON f.id = p.familleId LEFT JOIN \`Fournisseur\` s ON s.id = p.fournisseurId WHERE ${conditions.join(' AND ')} ORDER BY p.libelle`, values);
    response.json(rows.map((product) => ({
      ...product,
      prixAchatHT: numberValue(product.prixAchatHT),
      prixVenteHT: numberValue(product.prixVenteHT),
      tva: numberValue(product.tva),
      tauxTVA: numberValue(product.tauxTVA),
      stock: numberValue(product.stock),
      famille: product.familleId == null ? null : { id: product.familleId, libelle: product.familleLibelle, cumulOuiNon: product.cumulOuiNon, typeProd: product.typeProd, compteCPT: product.compteCPT, compteACH: product.compteACH },
      fournisseur: product.fournisseurId == null ? null : { id: product.fournisseurId, code: product.fournisseurCode, raisonSociale: product.raisonSociale, matriculeFiscal: product.matriculeFiscal, telephone: product.fournisseurTelephone, adresse: product.fournisseurAdresse },
    })));
  } catch (error) { next(error); }
});

router.post('/produits', ...manager, async (request, response, next) => {
  try {
    const input = produitSchema.parse(request.body);
    const id = await insertRecord('Produit', { ...input, tva: input.tauxTVA });
    const product = await queryOne('SELECT * FROM `Produit` WHERE id = ?', [id]);
    if (!product) throw new Error('Inserted product could not be loaded.');
    response.status(201).json({ ...product, stock: numberValue(product.stock) });
  } catch (error) { next(error); }
});

router.put('/produits/:id', ...manager, async (request, response, next) => {
  try {
    const input = produitSchema.partial().parse(request.body);
    const id = Number(request.params.id);
    const current = await queryOne('SELECT id FROM `Produit` WHERE id = ?', [id]);
    if (!current) { response.status(404).json({ message: 'Produit introuvable.' }); return; }
    const fields: Record<string, SqlValue | undefined> = { ...input };
    if (input.tauxTVA !== undefined) fields.tva = input.tauxTVA;
    await updateRecord('Produit', fields, { id });
    const product = await queryOne('SELECT * FROM `Produit` WHERE id = ?', [id]);
    if (!product) throw new Error('Updated product could not be loaded.');
    response.json({ ...product, stock: numberValue(product.stock) });
  } catch (error) { next(error); }
});

router.get('/familles-produits', ...read, async (_request, response, next) => {
  try { response.json(await query('SELECT * FROM `FamilleProduit` ORDER BY libelle')); } catch (error) { next(error); }
});

router.post('/familles-produits', ...manager, async (request, response, next) => {
  try {
    const id = await insertRecord('FamilleProduit', familleSchema.parse(request.body));
    const row = await queryOne('SELECT * FROM `FamilleProduit` WHERE id = ?', [id]);
    if (!row) throw new Error('Inserted product family could not be loaded.');
    response.status(201).json(row);
  } catch (error) { next(error); }
});

router.post('/achats-produits', ...cashier, async (request, response, next) => {
  try {
    const input = achatSchema.parse(request.body);
    const productIds = [...new Set(input.lignes.map((line) => line.produitId))];
    const products = await query(`SELECT id FROM \`Produit\` WHERE actif = ? AND id IN (${productIds.map(() => '?').join(', ')})`, [true, ...productIds]);
    if (products.length !== productIds.length) { response.status(400).json({ message: 'Un produit est introuvable ou inactif.' }); return; }
    const totalHT = input.lignes.reduce((sum, line) => sum + line.quantite * line.prixAchat, 0);
    const totalTTC = input.lignes.reduce((sum, line) => sum + line.quantite * line.prixAchat * (1 + line.tauxTVA / 100), 0);
    const id = await withTransaction(async (connection) => {
      const purchaseId = await insertRecord('AchatProd', {
        magasinId: request.user?.magasinId,
        fournisseurId: input.fournisseurId,
        dateAchat: toDate(input.dateAchat),
        dateFacture: input.dateFacture ? toDate(input.dateFacture) : undefined,
        numFacture: input.numFacture,
        totalTTC,
        totHT: totalHT,
        valide: input.valide,
      }, connection);
      for (const line of input.lignes) {
        await insertRecord('DetailAchatProd', { achatProdId: purchaseId, produitId: line.produitId, date: toDate(input.dateAchat), quantite: line.quantite, prixAchat: line.prixAchat, tauxTVA: line.tauxTVA, valide: input.valide }, connection);
        await execute('UPDATE `Produit` SET stock = stock + ?, prixAchatHT = ?, updatedAt = ? WHERE id = ?', [line.quantite, line.prixAchat, new Date(), line.produitId], connection);
      }
      return purchaseId;
    });
    const purchase = await queryOne('SELECT * FROM `AchatProd` WHERE id = ?', [id]);
    if (!purchase) throw new Error('Created product purchase could not be loaded.');
    response.status(201).json({ ...purchase, totalTTC: numberValue(purchase.totalTTC), totHT: numberValue(purchase.totHT) });
  } catch (error) { next(error); }
});

router.get('/achats-produits', ...read, async (request, response, next) => {
  try {
    const filter = filterSchema.parse(request.query);
    const conditions = ['1 = 1'];
    const values: SqlValue[] = [];
    if (filter.fournisseurId !== undefined) { conditions.push('a.fournisseurId = ?'); values.push(filter.fournisseurId); }
    if (filter.dateFrom) { conditions.push('a.dateAchat >= ?'); values.push(toDate(filter.dateFrom)); }
    if (filter.dateTo) { conditions.push('a.dateAchat <= ?'); values.push(toDate(filter.dateTo)); }
    const scope = scopedStore(request, 'a');
    conditions.push(scope.clause.replace(/^ AND /, '') || '1 = 1');
    values.push(...scope.values);
    const rows = await query(`SELECT a.*, f.code AS fournisseurCode, f.raisonSociale, f.matriculeFiscal, f.telephone AS fournisseurTelephone, f.adresse AS fournisseurAdresse FROM \`AchatProd\` a JOIN \`Fournisseur\` f ON f.id = a.fournisseurId WHERE ${conditions.join(' AND ')} ORDER BY a.dateAchat DESC`, values);
    const purchases: SqlRow[] = await Promise.all(rows.map(async (row): Promise<SqlRow> => {
      const details = await query('SELECT d.*, p.code AS produitCode, p.libelle AS produitLibelle FROM `DetailAchatProd` d JOIN `Produit` p ON p.id = d.produitId WHERE d.achatProdId = ? ORDER BY d.id', [row.id]);
      return { ...row, fournisseur: { id: row.fournisseurId, code: row.fournisseurCode, raisonSociale: row.raisonSociale, matriculeFiscal: row.matriculeFiscal, telephone: row.fournisseurTelephone, adresse: row.fournisseurAdresse }, details: details.map((d) => ({ ...d, produit: { id: d.produitId, code: d.produitCode, libelle: d.produitLibelle } })) };
    }));
    response.json(purchases.map((purchase) => ({ ...purchase, totalTTC: numberValue(purchase.totalTTC), totHT: numberValue(purchase.totHT), reste: numberValue(purchase.reste) })));
  } catch (error) { next(error); }
});

router.post('/inventaires', ...read, async (request, response, next) => {
  try {
    const input = inventSchema.parse(request.body);
    const ids = [...new Set(input.lignes.map((line) => line.produitId))];
    const products = await query(`SELECT * FROM \`Produit\` WHERE id IN (${ids.map(() => '?').join(', ')})`, ids);
    const map = new Map(products.map((product) => [Number(product.id), product]));
    if (map.size !== ids.length) { response.status(400).json({ message: 'Un produit inventorie est introuvable.' }); return; }
    const inventoryId = await withTransaction(async (connection) => {
      const total = input.lignes.reduce((sum, line) => sum + line.stockInventaire * Number(map.get(line.produitId)!.prixAchatHT), 0);
      const id = await insertRecord('Invent', { date: toDate(input.date), operateur: input.operateur, valeurStock: total }, connection);
      for (const line of input.lignes) {
        const product = map.get(line.produitId)!;
        const stock = Number(product.stock);
        const price = Number(product.prixAchatHT);
        await insertRecord('DetInvent', { inventId: id, produitId: line.produitId, date: toDate(input.date), stockTheorique: stock, stockInventaire: line.stockInventaire, valeurTheorique: stock * price, ecartStock: line.stockInventaire - stock, familleId: product.familleId }, connection);
      }
      return id;
    });
    const inventory = await queryOne('SELECT * FROM `Invent` WHERE id = ?', [inventoryId]);
    if (!inventory) throw new Error('Created inventory could not be loaded.');
    response.status(201).json({ ...inventory, valeurStock: numberValue(inventory.valeurStock) });
  } catch (error) { next(error); }
});

router.patch('/inventaires/:id/cloturer', ...manager, async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const inventory = await queryOne('SELECT * FROM `Invent` WHERE id = ?', [id]);
    if (!inventory) { response.status(404).json({ message: 'Inventaire introuvable.' }); return; }
    if (inventory.cloture) { response.status(409).json({ message: 'Inventaire deja cloture.' }); return; }
    await withTransaction(async (connection) => {
      const lines = await query('SELECT * FROM `DetInvent` WHERE inventId = ?', [id], connection);
      for (const line of lines) await execute('UPDATE `Produit` SET stock = ?, updatedAt = ? WHERE id = ?', [line.stockInventaire, new Date(), line.produitId], connection);
      await execute('UPDATE `Invent` SET cloture = ?, updatedAt = ? WHERE id = ? AND cloture = ?', [true, new Date(), id, false], connection);
    });
    const updated = await queryOne('SELECT * FROM `Invent` WHERE id = ?', [id]);
    if (!updated) throw new Error('Closed inventory could not be loaded.');
    response.json(updated);
  } catch (error) { next(error); }
});

router.get('/inventaires', ...read, async (_request, response, next) => {
  try {
    const rows = await query('SELECT i.*, u.nom AS operateurNom FROM `Invent` i JOIN `User` u ON u.id = i.operateur ORDER BY i.date DESC');
    response.json(rows.map((inventory) => ({ ...inventory, valeurStock: numberValue(inventory.valeurStock) })));
  } catch (error) { next(error); }
});

router.get('/ventes/resume', ...read, async (request, response, next) => {
  try {
    const filter = filterSchema.parse(request.query);
    const conditions = ['1 = 1'];
    const values: SqlValue[] = [];
    if (filter.dateFrom) { conditions.push('date >= ?'); values.push(toDate(filter.dateFrom)); }
    if (filter.dateTo) { conditions.push('date <= ?'); values.push(toDate(filter.dateTo)); }
    if (filter.equipeId !== undefined) { conditions.push('equipeId = ?'); values.push(filter.equipeId); }
    const sales = await query(`SELECT numVente, prixVenteTTC, prixAchatTTC, quantite, marge, codeFamille FROM \`CarProdSiege\` WHERE ${conditions.join(' AND ')}`, values);
    const totalCA = sales.reduce((sum, sale) => sum + Number(sale.prixVenteTTC) * Number(sale.quantite), 0);
    const totalMarge = sales.reduce((sum, sale) => sum + Number(sale.marge) * Number(sale.quantite), 0);
    const familles = new Map<string, number>();
    sales.forEach((sale) => familles.set(sale.codeFamille ?? 'Sans famille', (familles.get(sale.codeFamille ?? 'Sans famille') ?? 0) + Number(sale.prixVenteTTC) * Number(sale.quantite)));
    response.json({ totalCA, totalMarge, nombreVentes: new Set(sales.map((sale) => sale.numVente)).size, margePourcentage: totalCA ? totalMarge / totalCA * 100 : 0, parFamille: [...familles.entries()].map(([famille, ca]) => ({ famille, ca })) });
  } catch (error) { next(error); }
});

router.post('/transferts', ...manager, async (request, response, next) => {
  try {
    const input = transfertSchema.parse(request.body);
    const id = await withTransaction(async (connection) => {
      const transferId = await insertRecord('TransEtranger', { fournisseurId: input.fournisseurId, dateTransfert: toDate(input.dateTransfert), op: input.op, valide: input.valide }, connection);
      for (const line of input.lignes) {
        await insertRecord('DetTransEtranger', { transfertId: transferId, produitId: line.produitId, quantite: line.quantite, prixUnitaire: line.prixUnitaire }, connection);
        await execute('UPDATE `Produit` SET stock = stock - ?, updatedAt = ? WHERE id = ?', [line.quantite, new Date(), line.produitId], connection);
      }
      return transferId;
    });
    const transfer = await queryOne('SELECT * FROM `TransEtranger` WHERE id = ?', [id]);
    const details = await query('SELECT * FROM `DetTransEtranger` WHERE transfertId = ? ORDER BY id', [id]);
    if (!transfer) throw new Error('Created transfer could not be loaded.');
    response.status(201).json({ ...transfer, details });
  } catch (error) { next(error); }
});

export default router;
