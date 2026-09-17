import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { BUSINESS_RULES } from '../../lib/business-rules.js';
import { emitSocketEvent } from '../../lib/socket.js';
import { SOCKET_EVENTS } from '../../lib/socket-events.js';
import { requireRole, scopeToMagasin, type AuthRequest } from '../../middleware/auth.js';
import { fermerSessionSchema, ouvrirSessionSchema, suggestedOpeningSchema } from './schemas.js';

const router = Router();
const dateValue = (value: string) => new Date(`${value}T00:00:00.000Z`);
const storeWhere = (request: AuthRequest) => request.user?.magasinId == null ? {} : { magasinId: request.user.magasinId };
const fail = (message: string, statusCode: number, code: string) => Object.assign(new Error(message), { statusCode, code });

router.get('/suggested-opening', requireRole('gerant', 'caissier'), async (request, response, next) => {
  try {
    const input = suggestedOpeningSchema.parse(request.query);
    const [caisse, openSession, pumps, previous] = await Promise.all([
      prisma.caisse.findFirst({ where: { id: input.caisseId, actif: true, ...storeWhere(request) } }),
      prisma.recetteCaisse.findFirst({ where: { caisseId: input.caisseId, statut: 'OUVERT', ...storeWhere(request) }, include: { equipe: true }, orderBy: { createdAt: 'desc' } }),
      prisma.pompe.findMany({ where: { caisseId: input.caisseId, active: true, ...storeWhere(request) }, include: { cuve: true }, orderBy: { code: 'asc' } }),
      prisma.recetteCaisse.findFirst({ where: { caisseId: input.caisseId, statut: 'FERME', ...storeWhere(request) }, include: { equipe: true }, orderBy: [{ date: 'desc' }, { heureFermeture: 'desc' }] }),
    ]);
    if (!caisse || caisse.type !== 'PISTE') throw fail('Cette caisse n est pas une caisse PISTE.', 400, 'CAISSE_TYPE_INVALID');
    const suggestions = await Promise.all(pumps.map(async (pump) => {
      const last = await prisma.mobVCarCaisse.findFirst({ where: { pompeId: pump.id, caisseId: input.caisseId, indexFermeture: { not: null } }, orderBy: [{ date: 'desc' }, { heureFermeture: 'desc' }] });
      return { pompeId: pump.id, libelle: pump.libelle, cuveId: pump.cuveId, cuveLibelle: pump.cuve.libelle, indexOuvertureSuggere: Number(last?.indexFermeture ?? 0), sourceSuggestion: last ? `fermeture_${last.date.toISOString().slice(0, 10)}` : 'aucune_fermeture_precedente' };
    }));
    const tankIds = [...new Set(pumps.map((pump) => pump.cuveId))];
    const tanks = await prisma.cuve.findMany({ where: { id: { in: tankIds }, ...storeWhere(request) }, orderBy: { code: 'asc' } });
    const suggestedTanks = await Promise.all(tanks.map(async (tank) => {
      const last = await prisma.jaugeage.findFirst({ where: { cuveId: tank.id }, orderBy: { date: 'desc' } });
      return { cuveId: tank.id, libelle: tank.libelle, stockTheorique: Number(tank.stock), dernierJaugeage: last ? Number(last.quantite) : null };
    }));
    response.json({ caisseType: caisse.type, pompes: suggestions, soldePrecedent: Number(previous?.fondsCaisseFermeture ?? previous?.fondsCaisseOuverture ?? 0), sourceSession: previous ? `${previous.equipe.libelle} - ${previous.date.toISOString().slice(0, 10)} - cloturee` : null, cuves: suggestedTanks, hasOpenSession: Boolean(openSession), openSessionEquipe: openSession?.equipe.libelle ?? null });
  } catch (error) { next(error); }
});

router.post('/ouvrir', requireRole('gerant', 'caissier'), async (request, response, next) => {
  try {
    const input = ouvrirSessionSchema.parse(request.body);
    const date = dateValue(input.date);
    const result = await prisma.$transaction(async (tx) => {
      const where = storeWhere(request);
      const open = await tx.recetteCaisse.findFirst({ where: { caisseId: input.caisseId, statut: 'OUVERT', ...where }, include: { equipe: true } });
      if (open) throw fail(`La session de l'equipe ${open.equipe.libelle} n'est pas encore cloturee. Impossible d'ouvrir une nouvelle session.`, 409, 'SESSION_ALREADY_OPEN');
      const [team, caisse, seller, pumps, tanks, previous, settings] = await Promise.all([
        tx.equipe.findFirst({ where: { id: input.equipeId, actif: true, ...where } }),
        tx.caisse.findFirst({ where: { id: input.caisseId, actif: true, ...where } }),
        tx.vendeur.findFirst({ where: { id: input.vendeurId, actif: true, ...where } }),
        tx.pompe.findMany({ where: { id: { in: input.pompes.map((pump) => pump.pompeId) }, caisseId: input.caisseId, active: true, ...where }, include: { cuve: true } }),
        tx.cuve.findMany({ where: { id: { in: input.jaugeagesOuverture.map((reading) => reading.cuveId) }, ...where } }),
        tx.recetteCaisse.findFirst({ where: { caisseId: input.caisseId, statut: 'FERME', ...where }, orderBy: [{ date: 'desc' }, { heureFermeture: 'desc' }] }),
        tx.setParam.findUnique({ where: { id: 1 } }),
      ]);
      const selectedPumpIds = input.pompes.map((pump) => pump.pompeId);
      const selectedTankIds = [...new Set(pumps.map((pump) => pump.cuveId))];
      const requestedTankIds = input.jaugeagesOuverture.map((reading) => reading.cuveId);
      if (!team || !caisse || caisse.type !== 'PISTE' || !seller || pumps.length !== selectedPumpIds.length || tanks.length !== requestedTankIds.length || selectedTankIds.length !== requestedTankIds.length || selectedTankIds.some((cuveId) => !requestedTankIds.includes(cuveId)) || requestedTankIds.some((cuveId) => !selectedTankIds.includes(cuveId))) throw fail('Equipe, caisse PISTE, vendeur, pompe ou cuve invalide.', 400, 'SESSION_REFERENCE_INVALID');
      const warningsJaugeage: Array<{ cuveId: number; ecart: number; message: string }> = [];
      for (const reading of input.jaugeagesOuverture) {
        const tank = tanks.find((item) => item.id === reading.cuveId)!;
        const ecart = new Prisma.Decimal(reading.stockPhysique).minus(tank.stock);
        const threshold = settings?.seuilJaugeageAlerte ?? new Prisma.Decimal(BUSINESS_RULES.JAUGEAGE_ALERT_THRESHOLD_LITRES);
        if (ecart.abs().greaterThan(threshold)) warningsJaugeage.push({ cuveId: tank.id, ecart: ecart.toNumber(), message: `Ecart de jaugeage de ${ecart.toFixed(3)} L.` });
        if (ecart.abs().greaterThan(BUSINESS_RULES.JAUGEAGE_BLOCK_THRESHOLD_LITRES) && request.user?.role !== 'gerant') throw fail('Cet ecart de jaugeage necessite l approbation du gerant.', 403, 'JAUGEAGE_REQUIERT_GERANT');
      }
      const reserve = tanks.reduce((total, tank) => total.plus(tank.stock.times(tank.prixAchatHT)), new Prisma.Decimal(0));
      const recette = await tx.recetteCaisse.create({ data: { date, equipeId: team.id, caisseId: caisse.id, vendeurId: seller.id, magasinId: request.user?.magasinId, fondsCaisseOuverture: new Prisma.Decimal(input.fondsCaisseOuverture), reserveDepart: reserve, statut: 'OUVERT' } });
      await tx.depensesCaisse.create({ data: { date, equipeId: team.id, caisseId: caisse.id, vendeurId: seller.id, magasinId: request.user?.magasinId } });
      await tx.creditCaisse.create({ data: { date, equipeId: team.id, caisseId: caisse.id, vendeurId: seller.id, magasinId: request.user?.magasinId } });
      await tx.mobVCarCaisse.createMany({ data: input.pompes.map((pump) => { const record = pumps.find((item) => item.id === pump.pompeId)!; return { date, equipeId: team.id, caisseId: caisse.id, vendeurId: seller.id, pompeId: record.id, cuveId: record.cuveId, recetteCaisseId: recette.id, indexOuverture: new Prisma.Decimal(pump.indexOuverture), prixVente: record.prixVente, statut: 'OUVERT' }; }) });
      await tx.jaugeage.createMany({ data: input.jaugeagesOuverture.map((reading) => { const tank = tanks.find((item) => item.id === reading.cuveId)!; return { date, cuveId: tank.id, equipeId: team.id, caisseId: caisse.id, niveau: new Prisma.Decimal(reading.stockPhysique), quantite: new Prisma.Decimal(reading.stockPhysique), type: 'OUVERTURE', sessionId: recette.id, ecart: new Prisma.Decimal(reading.stockPhysique).minus(tank.stock) }; }) });
      const warnings = [...warningsJaugeage];
      if (previous) { const fundGap = new Prisma.Decimal(input.fondsCaisseOuverture).minus(previous.fondsCaisseFermeture ?? previous.fondsCaisseOuverture); if (fundGap.abs().greaterThan(BUSINESS_RULES.FONDS_CAISSE_TOLERANCE_TND)) warnings.push({ cuveId: 0, ecart: fundGap.toNumber(), message: 'Ecart de fond de caisse.' }); }
      return { recette, warnings };
    }, { maxWait: 10000, timeout: 30000 });
    emitSocketEvent(request.user?.magasinId, SOCKET_EVENTS.SESSION_OPENED, { sessionId: result.recette.id, date: input.date, equipeId: input.equipeId, caisseId: input.caisseId, magasinId: request.user?.magasinId ?? 0 });
    response.status(201).json({ sessionId: result.recette.id, recetteCaisseId: result.recette.id, warningsJaugeage: result.warnings });
  } catch (error) { next(error); }
});

router.get('/status', requireRole('gerant', 'caissier'), async (request, response, next) => {
  try {
    const date = typeof request.query.date === 'string' ? dateValue(request.query.date) : dateValue(new Date().toISOString().slice(0, 10));
    const caisseId = Number(request.query.caisseId);
    const teams = await prisma.equipe.findMany({ where: scopeToMagasin(request, { actif: true }), orderBy: { id: 'asc' } });
    const sessions = await Promise.all(teams.map(async (team) => { const row = await prisma.mobVCarCaisse.findFirst({ where: { date, equipeId: team.id, caisseId }, orderBy: { heureOuverture: 'asc' } }); return { equipeId: team.id, equipeLibelle: team.libelle, statut: row ? row.indexFermeture == null ? 'OUVERT' : 'FERME' : 'NON_OUVERT', heureOuverture: row?.heureOuverture?.toISOString() ?? null, heureFermeture: row?.heureFermeture?.toISOString() ?? null, ecart: null }; }));
    response.json({ date: date.toISOString().slice(0, 10), sessions });
  } catch (error) { next(error); }
});

router.post('/fermer', requireRole('gerant', 'caissier'), async (request, response, next) => {
  try {
    const input = fermerSessionSchema.parse(request.body);
    const result = await prisma.$transaction(async (tx) => {
      const where = storeWhere(request);
      const recette = await tx.recetteCaisse.findFirst({ where: { equipeId: input.equipeId, caisseId: input.caisseId, statut: 'OUVERT', ...where }, orderBy: { heureOuverture: 'asc' } });
      if (!recette) throw fail('SESSION_FERMEE ou session introuvable.', 409, 'SESSION_FERMEE');
      const date = recette.date;
      const [rows, boutique, credit, settings] = await Promise.all([
        tx.mobVCarCaisse.findMany({ where: { recetteCaisseId: recette.id, indexFermeture: null }, include: { pompe: true, cuve: true } }),
        tx.carProdSiege.aggregate({ where: { date, equipeId: input.equipeId, caisseId: input.caisseId, equipe: where }, _sum: { prixVenteTTC: true } }),
        tx.creditCaisse.findUnique({ where: { date_equipeId_caisseId: { date, equipeId: input.equipeId, caisseId: input.caisseId } } }),
        tx.setParam.findUnique({ where: { id: 1 } }),
      ]);
      if (!recette || recette.statut === 'FERME' || !rows.length) throw fail('SESSION_FERMEE ou session introuvable.', 409, 'SESSION_FERMEE');
      const requested = new Map(input.releveesPompes.map((item) => [item.pompeId, item]));
      if (requested.size !== input.releveesPompes.length || requested.size !== rows.length || rows.some((row) => !requested.has(row.pompeId))) throw fail('Le périmètre de fermeture ne correspond pas aux pompes de la session.', 400, 'SESSION_SCOPE_INVALID');
      const sales = rows.map((row) => { const closing = requested.get(row.pompeId); if (!closing) throw fail(`Index de fermeture manquant pour ${row.pompe.libelle}.`, 400, 'INDEX_MANQUANT'); const closingIndex = new Prisma.Decimal(closing.indexFermeture); const delta = closingIndex.minus(row.indexOuverture); const retour = new Prisma.Decimal(closing.retourVolume ?? 0); if (delta.lessThan(BUSINESS_RULES.INDEX_FERMETURE_MIN_DELTA) || delta.greaterThan(BUSINESS_RULES.INDEX_FERMETURE_MAX_DELTA_LITRES) || retour.greaterThan(BUSINESS_RULES.MAX_RETOUR_CUVE_LITRES_PER_POMPE) || retour.greaterThan(delta)) throw fail(`INDEX_INVALIDE pour ${row.pompe.libelle}.`, 400, 'INDEX_INVALIDE'); return { row, closing, volume: delta.minus(retour), montant: delta.minus(retour).times(row.prixVente) }; });
      const totalCarburant = sales.reduce((total, sale) => total.plus(sale.montant), new Prisma.Decimal(0));
      const totalBoutique = new Prisma.Decimal(boutique._sum.prixVenteTTC ?? 0);
      const totalCredits = credit?.totalCredits ?? new Prisma.Decimal(0);
      const totalTheorique = totalCarburant.plus(totalBoutique).plus(totalCredits);
      const totalCheques = input.cheques.reduce((total, cheque) => total.plus(cheque.montant), new Prisma.Decimal(0));
      const totalDeclaree = new Prisma.Decimal(input.especes).plus(totalCheques).plus(input.carteBancaire).plus(totalCredits);
      const ecart = totalDeclaree.minus(totalTheorique);
      const auto = settings?.seuilEcartAutoApprove ?? new Prisma.Decimal(0.5); const gerant = settings?.seuilEcartGerantApprove ?? new Prisma.Decimal(5); const bloque = settings?.seuilEcartBloque ?? new Prisma.Decimal(20);
      const statutEcart = ecart.abs().lte(auto) ? 'OK' : ecart.abs().lte(gerant) ? 'AVERTISSEMENT' : ecart.abs().lte(bloque) ? 'REQUIERT_GERANT' : 'BLOQUE';
      if (statutEcart === 'BLOQUE') throw fail(`Ecart de ${ecart.toFixed(3)} TND trop eleve.`, 400, 'ECART_TROP_ELEVE');
      if (statutEcart === 'REQUIERT_GERANT' && request.user?.role !== 'gerant') throw fail(`Ecart de ${ecart.toFixed(3)} TND: approbation gerant requise.`, 403, 'ECART_REQUIERT_GERANT');
      if (!new Prisma.Decimal(input.depotBanque).equals(new Prisma.Decimal(input.especes).minus(input.fondsDeCaisseFermeture))) throw fail('Le depot bancaire doit etre egal aux especes moins le fonds de caisse.', 400, 'DEPOT_INVALIDE');
      const returns = sales.filter((sale) => new Prisma.Decimal(sale.closing.retourVolume ?? 0).greaterThan(0));
      const sessionTankIds = [...new Set(rows.map((row) => row.cuveId ?? row.pompe.cuveId))];
      const requestedTankIds = input.jaugeagesFermeture.map((reading) => reading.cuveId);
      if (requestedTankIds.length !== sessionTankIds.length || requestedTankIds.some((cuveId) => !sessionTankIds.includes(cuveId))) throw fail('Les jaugeages doivent correspondre uniquement aux cuves de la session.', 400, 'SESSION_TANK_SCOPE_INVALID');
      if (returns.length) {
        const magasinId = request.user?.magasinId ?? (await tx.magasin.findFirst({ where: { active: true }, select: { id: true } }))?.id;
        if (!magasinId) throw fail('Aucun magasin actif n est configure.', 400, 'MAGASIN_REQUIRED');
        const totalVolume = returns.reduce((total, sale) => total.plus(sale.closing.retourVolume ?? 0), new Prisma.Decimal(0));
        const totalValue = returns.reduce((total, sale) => total.plus(new Prisma.Decimal(sale.closing.retourVolume ?? 0).times(sale.row.cuve?.prixAchatHT ?? 0)), new Prisma.Decimal(0));
        const retour = await tx.retourCuve.create({ data: { date, equipeId: input.equipeId, caisseId: input.caisseId, vendeurId: rows[0].vendeurId, magasinId, totalVolume, totalValeur: totalValue, valide: true } });
        for (const sale of returns) await tx.detailRetour.create({ data: { retourCuveId: retour.id, pompeId: sale.row.pompeId, cuveId: sale.row.cuveId ?? sale.row.pompe.cuveId, volume: new Prisma.Decimal(sale.closing.retourVolume ?? 0), valeur: new Prisma.Decimal(sale.closing.retourVolume ?? 0).times(sale.row.cuve?.prixAchatHT ?? 0), tauxTVA: 18, valide: true } });
      }
      for (const sale of sales) {
        const tank = await tx.cuve.findUniqueOrThrow({ where: { id: sale.row.cuveId ?? sale.row.pompe.cuveId } });
        if (tank.stock.lessThan(sale.volume)) throw fail(`Stock insuffisant pour la cuve ${tank.libelle}.`, 409, 'STOCK_NEGATIF');
        await tx.mobVCarCaisse.update({ where: { id: sale.row.id }, data: { indexFermeture: new Prisma.Decimal(sale.closing.indexFermeture), statut: 'FERME', heureFermeture: new Date() } });
        await tx.cuve.update({ where: { id: tank.id }, data: { stock: { decrement: sale.volume } } });
      }
      for (const reading of input.jaugeagesFermeture) { const tank = await tx.cuve.findFirstOrThrow({ where: { id: reading.cuveId, ...where } }); await tx.jaugeage.create({ data: { date, cuveId: tank.id, equipeId: input.equipeId, caisseId: input.caisseId, niveau: new Prisma.Decimal(reading.stockPhysique), quantite: new Prisma.Decimal(reading.stockPhysique), type: 'FERMETURE', sessionId: recette.id, ecart: new Prisma.Decimal(reading.stockPhysique).minus(tank.stock) } }); }
      const updated = await tx.recetteCaisse.update({ where: { id: recette.id }, data: { totalRecettes: totalDeclaree, recetteTheorique: totalTheorique, ecartRecette: ecart, totalTheoriqueCarburant: totalCarburant, totalTheoriqueBoutique: totalBoutique, totalEspeces: input.especes, totalCheques, totalCarte: input.carteBancaire, fondsCaisseFermeture: input.fondsDeCaisseFermeture, depotBanque: input.depotBanque, ecartCaisse: ecart, statutEcart, commentaireEcart: input.commentaireEcart, statut: 'FERME', fait: true, heureFermeture: new Date() } });
      await tx.depensesCaisse.updateMany({ where: { date, equipeId: input.equipeId, caisseId: input.caisseId }, data: { fait: true } }); await tx.creditCaisse.updateMany({ where: { date, equipeId: input.equipeId, caisseId: input.caisseId }, data: { fait: true } }); await tx.joursClotures.upsert({ where: { dateJour_equipeId: { dateJour: date, equipeId: input.equipeId } }, create: { dateJour: date, equipeId: input.equipeId, fait: true }, update: { fait: true } });
      return { updated, totalCarburant, totalBoutique, totalCredits, totalTheorique, totalDeclaree, ecart, statutEcart, sales };
    }, { maxWait: 10000, timeout: 30000 });
    emitSocketEvent(request.user?.magasinId, SOCKET_EVENTS.SESSION_CLOSED, { sessionId: result.updated.id, date: input.date, equipeId: input.equipeId, caisseId: input.caisseId, magasinId: request.user?.magasinId ?? 0 });
    for (const sale of result.sales) { const tank = await prisma.cuve.findUnique({ where: { id: sale.row.cuveId ?? sale.row.pompe.cuveId } }); if (tank) { const stockActuel = Number(tank.stock); const volumeTotal = Number(tank.volumeTotal); const pourcentage = volumeTotal ? stockActuel / volumeTotal * 100 : 0; emitSocketEvent(request.user?.magasinId, SOCKET_EVENTS.STOCK_CUVE_UPDATED, { cuveId: tank.id, libelle: tank.libelle, stockActuel, volumeTotal, pourcentage }); if (volumeTotal && stockActuel / volumeTotal < 0.2) emitSocketEvent(request.user?.magasinId, SOCKET_EVENTS.ALERT_STOCK_BAS, { type: 'cuve', id: tank.id, nom: tank.libelle, stockActuel, pourcentage }); } }
    response.json({ recap: { totalTheoriqueCarburant: result.totalCarburant.toNumber(), totalTheoriqueBoutique: result.totalBoutique.toNumber(), totalCredits: result.totalCredits.toNumber(), totalTheorique: result.totalTheorique.toNumber(), totalDeclaree: result.totalDeclaree.toNumber(), ecartCaisse: result.ecart.toNumber(), statutEcart: result.statutEcart, ventesParPompe: result.sales.map((sale) => ({ pompeId: sale.row.pompeId, cuveId: sale.row.cuveId ?? sale.row.pompe.cuveId, volumeVendu: sale.volume.toNumber(), montantTTC: sale.montant.toNumber() })) } });
  } catch (error) { next(error); }
});

export default router;
