import { PrismaClient, Role, TypeAchatEssence } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { addDays, subDays } from 'date-fns';

const prisma = new PrismaClient();
const money = (value: number) => Number(value.toFixed(3));
const dateAt = (offset: number) => {
  const value = subDays(new Date(), offset);
  return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
};
const futureDate = (offset: number) => {
  const value = addDays(new Date(), offset);
  return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
};
const lineTotal = (quantity: number, price: number, vat: number) => money(quantity * price * (1 + vat / 100));

async function clearDatabase() {
  await prisma.detailRetour.deleteMany();
  await prisma.retourCuve.deleteMany();
  await prisma.detailInventaireCarburant.deleteMany();
  await prisma.inventaireCarburant.deleteMany();
  await prisma.entAvoir.deleteMany();
  await prisma.service.deleteMany();
  await prisma.tauxTVA.deleteMany();
  await prisma.famDepense.deleteMany();
  await prisma.detInvent.deleteMany();
  await prisma.invent.deleteMany();
  await prisma.detTransEtranger.deleteMany();
  await prisma.transEtranger.deleteMany();
  await prisma.carWash.deleteMany();
  await prisma.detentretien.deleteMany();
  await prisma.entretien.deleteMany();
  await prisma.vehicule.deleteMany();
  await prisma.extractCN.deleteMany();
  await prisma.bonsStation.deleteMany();
  await prisma.cartes.deleteMany();
  await prisma.detRas.deleteMany();
  await prisma.entRas.deleteMany();
  await prisma.detMvtBq.deleteMany();
  await prisma.ageoCompteMode.deleteMany();
  await prisma.banque.deleteMany();
  await prisma.detailRegFour.deleteMany();
  await prisma.regFour.deleteMany();
  await prisma.impayes.deleteMany();
  await prisma.detailReglements.deleteMany();
  await prisma.detfact.deleteMany();
  await prisma.facture.deleteMany();
  await prisma.detbonliv.deleteMany();
  await prisma.bonliv.deleteMany();
  await prisma.carProdSiege.deleteMany();
  await prisma.detailAchatProd.deleteMany();
  await prisma.achatProd.deleteMany();
  await prisma.detailCredit.deleteMany();
  await prisma.creditCaisse.deleteMany();
  await prisma.detailDepenses.deleteMany();
  await prisma.depensesCaisse.deleteMany();
  await prisma.detailRecetteCaisse.deleteMany();
  await prisma.recetteCaisse.deleteMany();
  await prisma.joursClotures.deleteMany();
  await prisma.mobVCarCaisse.deleteMany();
  await prisma.jaugeage.deleteMany();
  await prisma.detailAchatEssence.deleteMany();
  await prisma.achatEssence.deleteMany();
  await prisma.pompe.deleteMany();
  await prisma.cuve.deleteMany();
  await prisma.produit.deleteMany();
  await prisma.depenses.deleteMany();
  await prisma.familleProduit.deleteMany();
  await prisma.famillePayment.deleteMany();
  await prisma.modePayment.deleteMany();
  await prisma.libRas.deleteMany();
  await prisma.vendeur.deleteMany();
  await prisma.user.deleteMany();
  await prisma.client.deleteMany();
  await prisma.fournisseur.deleteMany();
  await prisma.caisse.deleteMany();
  await prisma.equipe.deleteMany();
  await prisma.compteur.deleteMany();
  await prisma.setParam.deleteMany();
  await prisma.magasin.deleteMany();
  await prisma.station.deleteMany();
}

async function main() {
  await clearDatabase();

  const station = await prisma.station.create({ data: { code: 'EL-AMAL', nom: 'Station El Amal' } });
  await prisma.magasin.create({ data: { stationId: station.id, code: 'MAG-PRINCIPAL', nom: 'Magasin principal' } });
  await prisma.setParam.create({ data: { id: 1, stationId: station.id, nomStation: 'Station El Amal', adresse: 'Avenue Habib Bourguiba, Tunis', tel: '71 000 000', mf: '1234567/A/M/000', rc: 'B123456789', devise: 'TND', tauxTVADefaut: 19, timbre: 0.6, seuilEcartAutoApprove: 0.5, seuilEcartGerantApprove: 5, seuilEcartBloque: 20, fondsCaisseDefaut: 200, seuilAlerteCuve: 0.2, seuilJaugeageAlerte: 100 } });
  await prisma.compteur.create({ data: { id: 1 } });

  const magasin = await prisma.magasin.findFirstOrThrow({ where: { stationId: station.id } });
  const equipes = {
    matin: await prisma.equipe.create({ data: { magasinId: magasin.id, code: 'MATIN', libelle: 'Matin (06:00-14:00)' } }),
    apresMidi: await prisma.equipe.create({ data: { magasinId: magasin.id, code: 'APRES-MIDI', libelle: 'Après-midi (14:00-22:00)' } }),
    nuit: await prisma.equipe.create({ data: { magasinId: magasin.id, code: 'NUIT', libelle: 'Nuit (22:00-06:00)' } }),
  };
  const caisses = {
    principale: await prisma.caisse.create({ data: { magasinId: magasin.id, code: 'CP', libelle: 'Caisse Piste Principale', type: 'PISTE' } }),
    secondaire: await prisma.caisse.create({ data: { magasinId: magasin.id, code: 'CS', libelle: 'Caisse POS Boutique', type: 'POS' } }),
  };
  const famillesPayment = {
    especes: await prisma.famillePayment.create({ data: { libFamille: 'Espèces', compteCPT: '531000' } }),
    effets: await prisma.famillePayment.create({ data: { libFamille: 'Effets', compteCPT: '532000' } }),
    cartes: await prisma.famillePayment.create({ data: { libFamille: 'Cartes', compteCPT: '533000' } }),
    creances: await prisma.famillePayment.create({ data: { libFamille: 'Créances', compteCPT: '411000' } }),
  };
  const modes = {
    especes: await prisma.modePayment.create({ data: { libelle: 'Espèces', famille: '1', famillePaymentId: famillesPayment.especes.id, compteCPT: '531000' } }),
    cheque: await prisma.modePayment.create({ data: { libelle: 'Chèque', famille: '2', famillePaymentId: famillesPayment.effets.id, compteCPT: '532000' } }),
    virement: await prisma.modePayment.create({ data: { libelle: 'Virement', famille: '2', famillePaymentId: famillesPayment.effets.id, compteCPT: '532100' } }),
    carte: await prisma.modePayment.create({ data: { libelle: 'Carte bancaire', famille: '3', famillePaymentId: famillesPayment.cartes.id, compteCPT: '533000' } }),
    credit: await prisma.modePayment.create({ data: { libelle: 'Crédit client', famille: '4', famillePaymentId: famillesPayment.creances.id, compteCPT: '411000' } }),
  };
  const famillesProduit = {
    lubrifiants: await prisma.familleProduit.create({ data: { libelle: 'Lubrifiants', compteCPT: '707100', compteACH: '607100' } }),
    accessoires: await prisma.familleProduit.create({ data: { libelle: 'Accessoires', compteCPT: '707200', compteACH: '607200' } }),
    alimentation: await prisma.familleProduit.create({ data: { libelle: 'Alimentation', compteCPT: '707300', compteACH: '607300' } }),
    hygiene: await prisma.familleProduit.create({ data: { libelle: 'Hygiène', compteCPT: '707400', compteACH: '607400' } }),
  };
  const famillesDepenses = {
    exploitation: await prisma.famDepense.create({ data: { libelle: 'Charges exploitation', cpt: '611000' } }),
    entretien: await prisma.famDepense.create({ data: { libelle: 'Entretien', cpt: '615000' } }),
    divers: await prisma.famDepense.create({ data: { libelle: 'Divers', cpt: '658000' } }),
  };
  const depenseTypes = {
    electricite: await prisma.depenses.create({ data: { typeDepense: 'Electricité', famDepenseId: famillesDepenses.exploitation.id } }),
    eau: await prisma.depenses.create({ data: { typeDepense: 'Eau', famDepenseId: famillesDepenses.exploitation.id } }),
    loyer: await prisma.depenses.create({ data: { typeDepense: 'Loyer', famDepenseId: famillesDepenses.exploitation.id } }),
    nettoyage: await prisma.depenses.create({ data: { typeDepense: 'Nettoyage', famDepenseId: famillesDepenses.entretien.id } }),
    reparation: await prisma.depenses.create({ data: { typeDepense: 'Réparation', famDepenseId: famillesDepenses.entretien.id } }),
    divers: await prisma.depenses.create({ data: { typeDepense: 'Divers', famDepenseId: famillesDepenses.divers.id } }),
  };
  const rates = {
    services: await prisma.libRas.create({ data: { libelle: 'Services - 1,5%', tauxRetenu: 1.5, compteCPT: '447100' } }),
    honoraires: await prisma.libRas.create({ data: { libelle: 'Honoraires - 2,5%', tauxRetenu: 2.5, compteCPT: '447200' } }),
    loyers: await prisma.libRas.create({ data: { libelle: 'Loyers - 3%', tauxRetenu: 3, compteCPT: '447300' } }),
    capitaux: await prisma.libRas.create({ data: { libelle: 'Revenus de capitaux - 10%', tauxRetenu: 10, compteCPT: '447400' } }),
  };
  void [equipes.nuit, caisses.secondaire, depenseTypes.loyer, depenseTypes.reparation, depenseTypes.divers, rates.loyers, rates.capitaux];

  const banques = {
    stb: await prisma.banque.create({ data: { libelle: 'STB', rib: '10 006 0123456789 75' } }),
    bna: await prisma.banque.create({ data: { libelle: 'BNA', rib: '03 001 0987654321 42' } }),
    attijari: await prisma.banque.create({ data: { libelle: 'Attijari', rib: '11 002 0456789123 18' } }),
  };
  for (const banque of Object.values(banques)) {
    await prisma.ageoCompteMode.create({ data: { banqueId: banque.id, modePaymentId: modes.cheque.id, tauxCommission: 0.3, nbrJoursCompensation: 3 } });
    await prisma.ageoCompteMode.create({ data: { banqueId: banque.id, modePaymentId: modes.virement.id, tauxCommission: 0.1, nbrJoursCompensation: 1 } });
  }

  const users = {
    admin: await prisma.user.create({ data: { username: 'admin', passwordHash: await bcrypt.hash('Admin123!', 10), nom: 'Ben Ali', prenom: 'Mohamed', role: Role.gerant, magasinId: magasin.id } }),
    caissier1: await prisma.user.create({ data: { username: 'caissier1', passwordHash: await bcrypt.hash('Caisse123!', 10), nom: 'Trabelsi', prenom: 'Fatma', role: Role.caissier, magasinId: magasin.id } }),
    caissier2: await prisma.user.create({ data: { username: 'caissier2', passwordHash: await bcrypt.hash('Caisse123!', 10), nom: 'Chaabane', prenom: 'Khaled', role: Role.caissier, magasinId: magasin.id } }),
    vendeur: await prisma.user.create({ data: { username: 'vendeur1', passwordHash: await bcrypt.hash('Vendeur123!', 10), nom: 'Jlidi', prenom: 'Ibrahim', role: Role.vendeur, magasinId: magasin.id } }),
  };
  const vendeurs = {
    mohamed: await prisma.vendeur.create({ data: { magasinId: magasin.id, equipeId: equipes.matin.id, matricule: 'MBA', nom: 'Mohamed Ben Ali', userId: users.admin.id } }),
    fatma: await prisma.vendeur.create({ data: { magasinId: magasin.id, equipeId: equipes.matin.id, matricule: 'FTR', nom: 'Fatma Trabelsi', userId: users.caissier1.id } }),
    khaled: await prisma.vendeur.create({ data: { magasinId: magasin.id, equipeId: equipes.apresMidi.id, matricule: 'KCH', nom: 'Khaled Chaabane', userId: users.caissier2.id } }),
  };
  void [users.vendeur, vendeurs.mohamed];

  const cuves = {
    sp95: await prisma.cuve.create({ data: { magasinId: magasin.id, code: 'CUVE-SP95', libelle: 'Sans Plomb 95', carburant: 'Sans Plomb 95', volumeTotal: 30000, stockInitial: 18000, seuilAlerte: 6000 } }),
    gasoil: await prisma.cuve.create({ data: { magasinId: magasin.id, code: 'CUVE-GASOIL', libelle: 'Gasoil', carburant: 'Gasoil', volumeTotal: 50000, stockInitial: 35000, seuilAlerte: 10000 } }),
    super: await prisma.cuve.create({ data: { magasinId: magasin.id, code: 'CUVE-SUPER', libelle: 'Super', carburant: 'Super', volumeTotal: 20000, stockInitial: 8000, seuilAlerte: 4000 } }),
    gpl: await prisma.cuve.create({ data: { magasinId: magasin.id, code: 'CUVE-GPL', libelle: 'GPL', carburant: 'GPL', volumeTotal: 15000, stockInitial: 9000, seuilAlerte: 3000 } }),
  };
  const fuel = {
    sp95: { cuve: cuves.sp95, type: '1', achat: 1.85, vente: 1.99, tva: 18 },
    gasoil: { cuve: cuves.gasoil, type: '2', achat: 1.42, vente: 1.545, tva: 18 },
    super: { cuve: cuves.super, type: '3', achat: 2.1, vente: 2.25, tva: 18 },
    gpl: { cuve: cuves.gpl, type: '4', achat: 0.68, vente: 0.795, tva: 18 },
  };
  const pompes = [
    await prisma.pompe.create({ data: { magasinId: magasin.id, caisseId: caisses.principale.id, code: 'P1', libelle: 'Pompe 1', cuveId: cuves.sp95.id, prixVente: lineTotal(1, fuel.sp95.vente, 18) } }),
    await prisma.pompe.create({ data: { code: 'P2', libelle: 'Pompe 2', cuveId: cuves.gasoil.id, prixVente: lineTotal(1, fuel.gasoil.vente, 18) } }),
    await prisma.pompe.create({ data: { code: 'P3', libelle: 'Pompe 3', cuveId: cuves.super.id, prixVente: lineTotal(1, fuel.super.vente, 18) } }),
    await prisma.pompe.create({ data: { code: 'P4', libelle: 'Pompe 4', cuveId: cuves.gasoil.id, prixVente: lineTotal(1, fuel.gasoil.vente, 18) } }),
    await prisma.pompe.create({ data: { code: 'P5', libelle: 'Pompe 5 (GPL)', cuveId: cuves.gpl.id, prixVente: lineTotal(1, fuel.gpl.vente, 18) } }),
    await prisma.pompe.create({ data: { code: 'P6', libelle: 'Pompe 6 (multi)', cuveId: cuves.sp95.id, prixVente: lineTotal(1, fuel.sp95.vente, 18) } }),
  ];

  const fournisseurs = {
    stir: await prisma.fournisseur.create({ data: { code: 'STIR', raisonSociale: 'STIR', adresse: 'Zone Industrielle, Sfax', telephone: '74 111 111', matriculeFiscal: '0123456/A' } }),
    total: await prisma.fournisseur.create({ data: { code: 'TOTAL-TN', raisonSociale: 'TOTAL Tunisie', adresse: 'Lac 2, Tunis', telephone: '71 222 222', matriculeFiscal: '0234567/B' } }),
    sotulub: await prisma.fournisseur.create({ data: { code: 'SOTULUB', raisonSociale: 'Sotulub', adresse: 'Mégrine', telephone: '71 333 333', matriculeFiscal: '0345678/C' } }),
    distrilub: await prisma.fournisseur.create({ data: { code: 'DISTRILUB', raisonSociale: 'Distrilub', adresse: 'Ariana', telephone: '71 444 444', matriculeFiscal: '0456789/D' } }),
    generale: await prisma.fournisseur.create({ data: { code: 'GEN-ALIM', raisonSociale: 'Générale Alimentaire', adresse: 'Ben Arous', telephone: '71 555 555', matriculeFiscal: '0567890/E' } }),
  };
  const clients = {
    transport: await prisma.client.create({ data: { nomClient: 'Société Transport Tunis', MF: '1111111/A', quota: 5000, soldeAnterieur: 1200, tva: 19, telephone: '71 600 001' } }),
    btp: await prisma.client.create({ data: { nomClient: 'Entreprise BTP Sahel', MF: '2222222/B', quota: 3000, tva: 19, telephone: '71 600 002' } }),
    taxi: await prisma.client.create({ data: { nomClient: 'Taxi Collectif Nabeul', MF: '3333333/C', quota: 2000, soldeAnterieur: 500, tva: 0, telephone: '71 600 003' } }),
    mairie: await prisma.client.create({ data: { nomClient: 'Municipalité Ariana', MF: '4444444/D', quota: 10000, tva: 0, telephone: '71 600 004' } }),
    hotel: await prisma.client.create({ data: { nomClient: 'Hôtel Carthage', MF: '5555555/E', quota: 1500, soldeAnterieur: 200, tva: 19, telephone: '71 600 005' } }),
    particulier: await prisma.client.create({ data: { nomClient: 'Particulier Ahmed Maaref', MF: '', quota: 500, tva: 19, telephone: '98 700 001' } }),
  };
  void clients.mairie;

  const productDefinitions = [
    ['LUB-5W30', 'Huile Moteur 5W30', famillesProduit.lubrifiants.id, 18.5, 24, 19, 48, fournisseurs.sotulub.id],
    ['LUB-10W40', 'Huile Moteur 10W40', famillesProduit.lubrifiants.id, 15, 19.5, 19, 36, fournisseurs.sotulub.id],
    ['LUB-DOT4', 'Liquide Frein DOT4', famillesProduit.lubrifiants.id, 8.5, 11, 19, 24, fournisseurs.sotulub.id],
    ['ACC-FH', 'Filtre à huile', famillesProduit.accessoires.id, 6, 8.5, 19, 30, fournisseurs.distrilub.id],
    ['ACC-FA', 'Filtre à air', famillesProduit.accessoires.id, 7.5, 10, 19, 20, fournisseurs.distrilub.id],
    ['ACC-BEG', 'Balai essuie-glace', famillesProduit.accessoires.id, 9, 12.5, 19, 15, fournisseurs.distrilub.id],
    ['ACC-H4', 'Ampoule H4', famillesProduit.accessoires.id, 3.5, 5, 19, 40, fournisseurs.distrilub.id],
    ['ALI-EAU', 'Eau minérale 1.5L', famillesProduit.alimentation.id, 0.35, 0.6, 7, 120, fournisseurs.generale.id],
    ['ALI-CAF', 'Café capsule', famillesProduit.alimentation.id, 0.8, 1.2, 7, 60, fournisseurs.generale.id],
    ['ALI-SAND', 'Sandwich thon', famillesProduit.alimentation.id, 2.5, 3.5, 7, 20, fournisseurs.generale.id],
    ['HYG-LING', 'Lingettes auto', famillesProduit.hygiene.id, 1.2, 1.8, 19, 50, fournisseurs.generale.id],
    ['HYG-DES', 'Désodorisant voiture', famillesProduit.hygiene.id, 2.8, 4, 19, 30, fournisseurs.generale.id],
  ] as const;
  const products: Record<string, Awaited<ReturnType<typeof prisma.produit.create>>> = {};
  for (const [code, libelle, familleId, prixAchatHT, prixVenteHT, tva, stock, fournisseurId] of productDefinitions) {
    products[code] = await prisma.produit.create({ data: { code, libelle, familleId, prixAchatHT, prixVenteHT, tva, tauxTVA: tva, stock, fournisseurId } });
  }
  const fuelProducts = {
    sp95: await prisma.produit.create({ data: { code: 'CARB-SP95', libelle: 'Carburant Sans Plomb 95', prixAchatHT: 1.85, prixVenteHT: 1.99, tva: 18, tauxTVA: 18 } }),
    gasoil: await prisma.produit.create({ data: { code: 'CARB-GASOIL', libelle: 'Carburant Gasoil', prixAchatHT: 1.42, prixVenteHT: 1.545, tva: 18, tauxTVA: 18 } }),
    super: await prisma.produit.create({ data: { code: 'CARB-SUPER', libelle: 'Carburant Super', prixAchatHT: 2.1, prixVenteHT: 2.25, tva: 18, tauxTVA: 18 } }),
    gpl: await prisma.produit.create({ data: { code: 'CARB-GPL', libelle: 'Carburant GPL', prixAchatHT: 0.68, prixVenteHT: 0.795, tva: 18, tauxTVA: 18 } }),
  };
  const serviceProducts = {
    vidange: await prisma.produit.create({ data: { code: 'SRV-VIDANGE', libelle: 'Vidange', prixVenteHT: 35, tva: 19, tauxTVA: 19 } }),
    mainOeuvre: await prisma.produit.create({ data: { code: 'SRV-MO', libelle: "Main d'oeuvre", prixVenteHT: 20, tva: 19, tauxTVA: 19 } }),
  };

  const fuelPurchases = [
    { days: 30, fournisseurId: fournisseurs.stir.id, reference: 'Facture 10011 - valide - reste 0.000 TND', lines: [[cuves.sp95.id, 20000, 1.85], [cuves.gasoil.id, 15000, 1.42]] as const },
    { days: 20, fournisseurId: fournisseurs.stir.id, reference: 'Facture 10045 - valide - reste 12390.000 TND', lines: [[cuves.gasoil.id, 10000, 1.42], [cuves.super.id, 5000, 2.1]] as const },
    { days: 10, fournisseurId: fournisseurs.total.id, reference: 'Facture 5521 - valide - reste 0.000 TND', lines: [[cuves.gasoil.id, 25000, 1.425]] as const },
    { days: 3, fournisseurId: fournisseurs.stir.id, reference: 'Facture 10089 - en attente - reste à valider', lines: [[cuves.sp95.id, 8000, 1.855], [cuves.gpl.id, 6000, 0.68]] as const },
  ];
  const fuelPurchaseRecords = [] as Awaited<ReturnType<typeof prisma.achatEssence.create>>[];
  for (const purchase of fuelPurchases) {
    const header = await prisma.achatEssence.create({ data: { date: dateAt(purchase.days), fournisseurId: purchase.fournisseurId, reference: purchase.reference, type: TypeAchatEssence.achat } });
    fuelPurchaseRecords.push(header);
    for (const [cuveId, quantite, prixUnitaire] of purchase.lines) await prisma.detailAchatEssence.create({ data: { achatId: header.id, cuveId, quantite, prixUnitaire } });
  }
  const productPurchases = [
    { days: 25, fournisseurId: fournisseurs.sotulub.id, facture: '3301', reste: 0, lines: [[products['LUB-5W30'], 20], [products['LUB-10W40'], 15], [products['LUB-DOT4'], 10]] as const },
    { days: 8, fournisseurId: fournisseurs.distrilub.id, facture: '8812', reste: 245.7, lines: [[products['ACC-FH'], 15], [products['ACC-FA'], 10], [products['ACC-H4'], 20]] as const },
  ];
  const productPurchaseRecords = [] as Awaited<ReturnType<typeof prisma.achatProd.create>>[];
  for (const purchase of productPurchases) {
    const totalHT = money(purchase.lines.reduce((sum, [product, quantity]) => sum + Number(product.prixAchatHT) * quantity, 0));
    const totalTTC = money(purchase.lines.reduce((sum, [product, quantity]) => sum + lineTotal(quantity, Number(product.prixAchatHT), Number(product.tva)), 0));
    const header = await prisma.achatProd.create({ data: { fournisseurId: purchase.fournisseurId, dateAchat: dateAt(purchase.days), dateFacture: dateAt(purchase.days), numFacture: purchase.facture, totalTTC, totHT: totalHT, reste: purchase.reste, valide: true } });
    productPurchaseRecords.push(header);
    for (const [product, quantity] of purchase.lines) await prisma.detailAchatProd.create({ data: { achatProdId: header.id, produitId: product.id, date: dateAt(purchase.days), quantite: quantity, prixAchat: product.prixAchatHT, tauxTVA: product.tva, valide: true } });
  }
  const regFour1 = await prisma.regFour.create({ data: { fournisseurId: fournisseurs.stir.id, date: dateAt(30), montantTotal: 0, valide: true } });
  await prisma.detailRegFour.create({ data: { regFourId: regFour1.id, nLigne: 1, numAchats: fuelPurchaseRecords[0].id, montant: money(20000 * 1.85 * 1.18 + 15000 * 1.42 * 1.18), modePayment: 'Virement', reste: 0 } });
  const regFour2 = await prisma.regFour.create({ data: { fournisseurId: fournisseurs.stir.id, date: dateAt(15), montantTotal: 20000, valide: false } });
  await prisma.detailRegFour.create({ data: { regFourId: regFour2.id, nLigne: 1, numAchats: fuelPurchaseRecords[1].id, montant: 20000, modePayment: 'Chèque', echeance: futureDate(30), reste: 12390 } });
  const regFour3 = await prisma.regFour.create({ data: { fournisseurId: fournisseurs.sotulub.id, date: dateAt(24), montantTotal: productPurchaseRecords[0].totalTTC, valide: true } });
  await prisma.achatProd.update({ where: { id: productPurchaseRecords[0].id }, data: { numRegFour: regFour3.id } });
  await prisma.detailRegFour.create({ data: { regFourId: regFour3.id, nLigne: 1, proEss: 'Achat produits 3301', montant: productPurchaseRecords[0].totalTTC, modePayment: 'Espèces', reste: 0 } });

  const fuelProductByCuve = new Map([[cuves.sp95.id, fuelProducts.sp95], [cuves.gasoil.id, fuelProducts.gasoil], [cuves.super.id, fuelProducts.super], [cuves.gpl.id, fuelProducts.gpl]]);
  const pumpCounters = new Map(pompes.map((pump) => [pump.id, 100000 + pump.id * 1000]));
  const boutiqueProducts = Object.values(products);
  for (let daysAgo = 6; daysAgo >= 0; daysAgo -= 1) {
    const date = dateAt(daysAgo);
    for (const [shiftIndex, equipe] of (daysAgo === 0 ? [equipes.matin] : [equipes.matin, equipes.apresMidi]).entries()) {
      const vendeur = shiftIndex === 0 ? vendeurs.fatma : vendeurs.khaled;
      const heureOuverture = new Date(date); heureOuverture.setUTCHours(6 + shiftIndex * 8, 2, 0, 0);
      const heureFermeture = daysAgo === 0 ? undefined : new Date(date); if (heureFermeture) heureFermeture.setUTCHours(14 + shiftIndex * 8, 5, 0, 0);
      let fuelRevenue = 0;
      for (const [pumpNumber, pump] of pompes.entries()) {
        const opening = pumpCounters.get(pump.id)!;
        const volume = 250 + ((daysAgo + pumpNumber * 3 + shiftIndex * 5) % 7) * 75;
        const closing = opening + volume;
        pumpCounters.set(pump.id, closing);
        const fuelInfo = Object.values(fuel).find((item) => item.cuve.id === pump.cuveId)!;
        fuelRevenue += volume * Number(pump.prixVente);
        await prisma.mobVCarCaisse.create({ data: { date, equipeId: equipe.id, caisseId: caisses.principale.id, pompeId: pump.id, vendeurId: vendeur.id, cuveId: pump.cuveId, indexOuverture: opening, indexFermeture: daysAgo === 0 ? undefined : closing, prixVente: pump.prixVente, statut: daysAgo === 0 ? 'OUVERT' : 'FERME', heureOuverture, heureFermeture } });
        const fuelProduct = fuelProductByCuve.get(pump.cuveId)!;
        await prisma.carProdSiege.create({ data: { produitId: fuelProduct.id, date, equipeId: equipe.id, caisseId: caisses.principale.id, vendeurId: vendeur.id, numVente: daysAgo * 10 + shiftIndex, prixAchatHT: fuelInfo.achat, prixVenteHT: fuelInfo.vente, prixVenteTTC: lineTotal(1, fuelInfo.vente, 18), prixAchatTTC: lineTotal(1, fuelInfo.achat, 18), quantite: volume, tva: 18, marge: money((fuelInfo.vente - fuelInfo.achat) * volume), typeCarburant: fuelInfo.type, pompeId: pump.id, numLigne: pumpNumber + 1 } });
      }
      fuelRevenue = money(fuelRevenue);
      const creditRevenue = shiftIndex === 0 ? 550 : 0;
      const cardRevenue = money(fuelRevenue * 0.2);
      const cashRevenue = money(fuelRevenue - cardRevenue - creditRevenue);
      const recette = await prisma.recetteCaisse.create({ data: { date, equipeId: equipe.id, caisseId: caisses.principale.id, vendeurId: vendeur.id, totalRecettes: fuelRevenue, totalEspeces: cashRevenue, totalCarte: cardRevenue, fondsCaisseOuverture: 200, fondsCaisseFermeture: daysAgo === 0 ? undefined : 200, depotBanque: daysAgo === 0 ? undefined : cashRevenue - 200, fait: daysAgo !== 0, statut: daysAgo === 0 ? 'OUVERT' : 'FERME', heureOuverture, heureFermeture } });
      await prisma.detailRecetteCaisse.create({ data: { numRecette: recette.id, modePaymentId: modes.especes.id, montant: cashRevenue } });
      await prisma.detailRecetteCaisse.create({ data: { numRecette: recette.id, modePaymentId: modes.carte.id, montant: cardRevenue } });
      await prisma.detailRecetteCaisse.create({ data: { numRecette: recette.id, modePaymentId: modes.credit.id, montant: creditRevenue } });
      if (shiftIndex === 0) {
        const credit = await prisma.creditCaisse.create({ data: { date, equipeId: equipe.id, caisseId: caisses.principale.id, vendeurId: vendeur.id, totalCredits: creditRevenue, fait: daysAgo !== 0 } });
        await prisma.detailCredit.create({ data: { numCredit: credit.id, clientId: clients.transport.id, montant: 400, libelle: 'Crédit carburant flotte', modePayment: 'Crédit client' } });
        await prisma.detailCredit.create({ data: { numCredit: credit.id, clientId: clients.taxi.id, montant: 150, libelle: 'Crédit carburant taxi', modePayment: 'Crédit client' } });
        const depense = await prisma.depensesCaisse.create({ data: { date, equipeId: equipe.id, caisseId: caisses.principale.id, vendeurId: vendeur.id, totalDepenses: 43, fait: daysAgo !== 0 } });
        await prisma.detailDepenses.create({ data: { numDepense: depense.id, codeDepense: depenseTypes.electricite.id, montant: 15, libelle: 'Consommation électrique' } });
        await prisma.detailDepenses.create({ data: { numDepense: depense.id, codeDepense: depenseTypes.eau.id, montant: 8, libelle: 'Consommation eau' } });
        await prisma.detailDepenses.create({ data: { numDepense: depense.id, codeDepense: depenseTypes.nettoyage.id, montant: 20, libelle: 'Nettoyage station' } });
      }
      for (const [lineIndex, product] of [boutiqueProducts[(daysAgo + shiftIndex) % boutiqueProducts.length], boutiqueProducts[(daysAgo + shiftIndex + 3) % boutiqueProducts.length]].entries()) {
        const quantity = 1 + ((daysAgo + lineIndex + shiftIndex) % 4);
        await prisma.carProdSiege.create({ data: { produitId: product.id, fournisseurId: product.fournisseurId, date, equipeId: equipe.id, caisseId: caisses.principale.id, vendeurId: vendeur.id, numVente: daysAgo * 10 + shiftIndex, prixAchatHT: product.prixAchatHT, prixVenteHT: product.prixVenteHT, prixVenteTTC: lineTotal(1, Number(product.prixVenteHT), Number(product.tva)), prixAchatTTC: lineTotal(1, Number(product.prixAchatHT), Number(product.tva)), quantite: quantity, tva: product.tva, marge: money((Number(product.prixVenteHT) - Number(product.prixAchatHT)) * quantity), codeFamille: String(product.familleId), typeCarburant: '0', numLigne: 100 + lineIndex } });
      }
      await prisma.joursClotures.create({ data: { dateJour: date, equipeId: equipe.id, fait: daysAgo !== 0 } });
    }
  }

  const createInvoice = async (date: Date, clientId: number, lines: Array<{ product: Awaited<ReturnType<typeof prisma.produit.create>>; quantity: number }>) => {
    const totals = lines.reduce((result, line) => { const ht = Number(line.product.prixVenteHT) * line.quantity; const vat = ht * Number(line.product.tva) / 100; result.ht += ht; result.vat += vat; result.ttc += ht + vat; return result; }, { ht: 0, vat: 0, ttc: 0 });
    const bon = await prisma.bonliv.create({ data: { date, clientId, totalHT: money(totals.ht), totalTTC: money(totals.ttc), totTVA: money(totals.vat) } });
    for (const [index, line] of lines.entries()) await prisma.detbonliv.create({ data: { bonlivId: bon.id, numLigne: index + 1, idProduit: line.product.id, puHT: line.product.prixVenteHT, tva: line.product.tva, qte: line.quantity, ttc: lineTotal(line.quantity, Number(line.product.prixVenteHT), Number(line.product.tva)), date } });
    const facture = await prisma.facture.create({ data: { date, clientId, totalHT: money(totals.ht), totalTTC: money(totals.ttc), totTVA: money(totals.vat), numBL: bon.id, mtTimbre: 0.6 } });
    await prisma.bonliv.update({ where: { id: bon.id }, data: { numFact: facture.id } });
    for (const [index, line] of lines.entries()) await prisma.detfact.create({ data: { factureId: facture.id, numLigne: index + 1, idProduit: line.product.id, puHT: line.product.prixVenteHT, qte: line.quantity, ttc: lineTotal(line.quantity, Number(line.product.prixVenteHT), Number(line.product.tva)), date } });
    return { facture, totalTTC: money(totals.ttc) };
  };
  const invoice1 = await createInvoice(dateAt(25), clients.transport.id, [{ product: fuelProducts.sp95, quantity: 200 }, { product: products['LUB-5W30'], quantity: 5 }]);
  const invoice2 = await createInvoice(dateAt(15), clients.btp.id, [{ product: fuelProducts.gasoil, quantity: 500 }, { product: products['ACC-FH'], quantity: 3 }]);
  const invoice3 = await createInvoice(dateAt(5), clients.hotel.id, [{ product: products['ALI-EAU'], quantity: 10 }, { product: products['ALI-CAF'], quantity: 5 }, { product: products['HYG-DES'], quantity: 2 }]);
  const clientReg1 = await prisma.detailReglements.create({ data: { clientId: clients.transport.id, equipeId: equipes.matin.id, caisseId: caisses.principale.id, date: dateAt(20), montant: 500, modePayment: 'Chèque', valide: true } });
  await prisma.impayes.create({ data: { numReg: clientReg1.id, clientId: clients.transport.id, dateReg: dateAt(20), montantLigne: money(invoice1.totalTTC - 500), echeance: futureDate(15), numCheque: 'CH-2026-001', nomBanque: 'STB', impaye: true, valide: false } });
  await prisma.detailReglements.create({ data: { clientId: clients.btp.id, equipeId: equipes.apresMidi.id, caisseId: caisses.principale.id, date: dateAt(10), montant: invoice2.totalTTC, modePayment: 'Virement', valide: true } });
  const hotelReg = await prisma.detailReglements.create({ data: { clientId: clients.hotel.id, equipeId: equipes.matin.id, caisseId: caisses.principale.id, date: dateAt(5), montant: 0, modePayment: 'Crédit client', impaye: true, valide: false } });
  await prisma.impayes.create({ data: { numReg: hotelReg.id, clientId: clients.hotel.id, dateReg: dateAt(5), montantLigne: invoice3.totalTTC, echeance: futureDate(30), nomBanque: 'À recouvrer', impaye: true, valide: false } });

  const serviceLines = [
    { clientId: clients.transport.id, date: dateAt(20), matricule: 'TU 123 456', indexKm: 145000, prochainIndex: 150000, lines: [{ product: serviceProducts.vidange, price: 35 }, { product: products['LUB-5W30'], price: 8.5 }, { product: serviceProducts.mainOeuvre, price: 20 }] },
    { clientId: clients.taxi.id, date: dateAt(10), matricule: 'NA 789 012', indexKm: 230000, prochainIndex: 235000, lines: [{ product: serviceProducts.vidange, price: 35 }, { product: products['ACC-FA'], price: 10 }, { product: products['ACC-FH'], price: 8.5 }] },
    { clientId: clients.particulier.id, date: dateAt(2), matricule: 'TU 456 789', indexKm: 67000, prochainIndex: 72000, lines: [{ product: serviceProducts.vidange, price: 35 }, { product: serviceProducts.mainOeuvre, price: 20 }] },
  ];
  for (const service of serviceLines) {
    const total = service.lines.reduce((sum, line) => sum + lineTotal(1, line.price, 19), 0);
    const entretien = await prisma.entretien.create({ data: { dateEnt: service.date, matricule: service.matricule, clientId: service.clientId, totEntTTC: money(total), indexKm: service.indexKm, prochainIndex: service.prochainIndex } });
    for (const [index, line] of service.lines.entries()) await prisma.detentretien.create({ data: { entretienId: entretien.id, idService: line.product.id, prixHT: line.price, prixTTC: lineTotal(1, line.price, 19), numLigne: index + 1 } });
  }

  const bankMovements = [
    [banques.stb.id, modes.virement.id, 4500, 27, true], [banques.stb.id, modes.virement.id, 5200, 20, true], [banques.bna.id, modes.virement.id, 4800, 12, true],
    [banques.stb.id, modes.cheque.id, 500, 20, true], [banques.stb.id, modes.cheque.id, 20000, 15, false], [banques.bna.id, modes.virement.id, 3200, 4, false], [banques.stb.id, modes.virement.id, 2800, 2, false], [banques.attijari.id, modes.virement.id, 1900, 1, false],
  ] as const;
  for (const [banqueId, modePaymentId, montant, daysAgo, rapproche] of bankMovements) await prisma.detMvtBq.create({ data: { banqueId, modePaymentId, montant, date: dateAt(daysAgo), dateEcheance: modePaymentId === modes.cheque.id ? futureDate(3) : undefined, rapproche } });
  for (const [index, montant] of [180, 260, 95, 310].entries()) await prisma.cartes.create({ data: { numTicket: `CN-${index + 1}`, numCession: `CESS-${index + 1}`, date: dateAt(index * 5 + 1), montant, typeCarte: index < 2 ? '1' : '2', fait: index !== 3 } });
  for (const [index, montant] of [50, 120, 75].entries()) await prisma.bonsStation.create({ data: { numBord: `BS-${index + 1}`, bonStationId: `BON-${index + 1}`, date: dateAt(index + 2), montant, fait: index !== 2 } });
  let carWashOpening = 1000;
  for (let daysAgo = 6; daysAgo >= 0; daysAgo -= 1) {
    const nombreLavage = 8 + (daysAgo * 3) % 18;
    await prisma.carWash.create({ data: { date: dateAt(daysAgo), indexOuverture: carWashOpening, indexFermeture: carWashOpening + nombreLavage, nombreLavage } });
    carWashOpening += nombreLavage;
  }
  const ras1 = await prisma.entRas.create({ data: { fournisseurId: fournisseurs.stir.id, dateRas: dateAt(20), totalBrut: 50000, totalRetenu: 750, totalNet: 49250, valide: true } });
  await prisma.detRas.create({ data: { numRas: ras1.id, numLigne: 1, codeRet: rates.services.id, mtBrut: 50000, tauxRetenu: 1.5, mtRetenu: 750, fournisseurId: fournisseurs.stir.id, valide: true } });
  const ras2 = await prisma.entRas.create({ data: { fournisseurId: fournisseurs.sotulub.id, dateRas: dateAt(12), totalBrut: 8500, totalRetenu: 212.5, totalNet: 8287.5, valide: true } });
  await prisma.detRas.create({ data: { numRas: ras2.id, numLigne: 1, codeRet: rates.honoraires.id, mtBrut: 8500, tauxRetenu: 2.5, mtRetenu: 212.5, fournisseurId: fournisseurs.sotulub.id, valide: true } });

  await prisma.tauxTVA.createMany({ data: [
    { taux: 19, libelle: 'TVA 19%', actif: true },
    { taux: 7, libelle: 'TVA 7%', actif: true },
    { taux: 0, libelle: 'Exonere', actif: true },
  ] });
  const services = await prisma.service.createMany({ data: [
    { libelle: 'Vidange', prixHT: 35, tauxTVA: 19, prixTTC: 41.65 },
    { libelle: 'Filtre a huile', prixHT: 8.5, tauxTVA: 19, prixTTC: 10.115 },
    { libelle: 'Main d oeuvre', prixHT: 20, tauxTVA: 19, prixTTC: 23.8 },
    { libelle: 'Gonflage pneus', prixHT: 3, tauxTVA: 19, prixTTC: 3.57 },
  ] });
  void services;
  await prisma.cuve.updateMany({ data: { stock: { increment: 0 } } });
  for (const [cuve, price] of [[cuves.sp95, 1.85], [cuves.gasoil, 1.42], [cuves.super, 2.1], [cuves.gpl, 0.68]] as const) await prisma.cuve.update({ where: { id: cuve.id }, data: { stock: cuve.stockInitial, prixAchatHT: price } });
  await prisma.pompe.updateMany({ where: { magasinId: null }, data: { magasinId: magasin.id, caisseId: caisses.principale.id } });
  const vehicles = {
    transport: await prisma.vehicule.create({ data: { clientId: clients.transport.id, matricule: 'TU 123 456', marque: 'Mercedes', modele: 'Sprinter', annee: 2019, carburantType: 2, indexKmActuel: 145000 } }),
    taxi: await prisma.vehicule.create({ data: { clientId: clients.taxi.id, matricule: 'NA 789 012', marque: 'Peugeot', modele: 'Partner', annee: 2017, carburantType: 2, indexKmActuel: 230000 } }),
    particulier: await prisma.vehicule.create({ data: { clientId: clients.particulier.id, matricule: 'TU 456 789', marque: 'Renault', modele: 'Clio', annee: 2021, carburantType: 1, indexKmActuel: 67000 } }),
  };
  await prisma.entretien.updateMany({ where: { clientId: clients.transport.id, matricule: vehicles.transport.matricule }, data: { vehiculeId: vehicles.transport.id } });
  await prisma.entretien.updateMany({ where: { clientId: clients.taxi.id, matricule: vehicles.taxi.matricule }, data: { vehiculeId: vehicles.taxi.id } });
  await prisma.entretien.updateMany({ where: { clientId: clients.particulier.id, matricule: vehicles.particulier.matricule }, data: { vehiculeId: vehicles.particulier.id } });

  const retourDate = dateAt(5);
  const retour = await prisma.retourCuve.create({ data: {
    date: retourDate,
    equipeId: equipes.matin.id,
    caisseId: caisses.principale.id,
    vendeurId: vendeurs.fatma.id,
    magasinId: magasin.id,
    totalVolume: 150,
    totalValeur: money(80 * 1.85 + 70 * 1.42),
    valide: true,
  } });
  await prisma.detailRetour.createMany({ data: [
    { retourCuveId: retour.id, pompeId: pompes[0].id, cuveId: cuves.sp95.id, volume: 80, valeur: money(80 * 1.85), tauxTVA: 18, valide: true },
    { retourCuveId: retour.id, pompeId: pompes[1].id, cuveId: cuves.gasoil.id, volume: 70, valeur: money(70 * 1.42), tauxTVA: 18, valide: true },
  ] });
  await prisma.cuve.update({ where: { id: cuves.sp95.id }, data: { stock: { decrement: 80 } } });
  await prisma.cuve.update({ where: { id: cuves.gasoil.id }, data: { stock: { decrement: 70 } } });

  const inventaireDate = dateAt(3);
  const inventaireRows = [
    { cuveId: cuves.sp95.id, stockPhysique: 17800, stockComptable: 17920, prixUnitaire: 1.85 },
    { cuveId: cuves.gasoil.id, stockPhysique: 34800, stockComptable: 34930, prixUnitaire: 1.42 },
    { cuveId: cuves.super.id, stockPhysique: 7900, stockComptable: 8000, prixUnitaire: 2.1 },
    { cuveId: cuves.gpl.id, stockPhysique: 8920, stockComptable: 9000, prixUnitaire: 0.68 },
  ].map((line) => ({ ...line, valeur: money(line.stockPhysique * line.prixUnitaire), ecart: money(line.stockPhysique - line.stockComptable) }));
  const inventaire = await prisma.inventaireCarburant.create({ data: {
    date: inventaireDate,
    operateur: 'admin',
    cloture: false,
    valeurStock: money(inventaireRows.reduce((sum, line) => sum + line.valeur, 0)),
    magasinId: magasin.id,
    lignes: { create: inventaireRows.map((line) => ({ ...line, date: inventaireDate })) },
  } });
  void inventaire;

  await prisma.entAvoir.create({ data: {
    fournisseurId: fournisseurs.stir.id,
    dateAchat: dateAt(12),
    numFacture: 'AV-001',
    totalTTC: 2950,
    reste: 2950,
    valide: false,
    magasinId: magasin.id,
  } });

  for (let daysAgo = 1; daysAgo <= 3; daysAgo += 1) {
    const date = dateAt(daysAgo);
    await prisma.jaugeage.createMany({ data: [
      { date, cuveId: cuves.sp95.id, equipeId: equipes.matin.id, caisseId: caisses.principale.id, niveau: 18000 - daysAgo * 200, quantite: 18000 - daysAgo * 200 },
      { date, cuveId: cuves.gasoil.id, equipeId: equipes.matin.id, caisseId: caisses.principale.id, niveau: 35000 - daysAgo * 300, quantite: 35000 - daysAgo * 300 },
      { date, cuveId: cuves.super.id, equipeId: equipes.matin.id, caisseId: caisses.principale.id, niveau: 8000 - daysAgo * 100, quantite: 8000 - daysAgo * 100 },
      { date, cuveId: cuves.gpl.id, equipeId: equipes.matin.id, caisseId: caisses.principale.id, niveau: 9000 - daysAgo * 80, quantite: 9000 - daysAgo * 80 },
    ] });
  }

  console.table({
    User: await prisma.user.count(), Fournisseur: await prisma.fournisseur.count(), Client: await prisma.client.count(), Produit: await prisma.produit.count(),
    Cuve: await prisma.cuve.count(), Pompe: await prisma.pompe.count(), AchatEssence: await prisma.achatEssence.count(), DetailAchatEssence: await prisma.detailAchatEssence.count(),
    AchatProd: await prisma.achatProd.count(), DetailAchatProd: await prisma.detailAchatProd.count(), MobVCarCaisse: await prisma.mobVCarCaisse.count(), RecetteCaisse: await prisma.recetteCaisse.count(),
    CarProdSiege: await prisma.carProdSiege.count(), Bonliv: await prisma.bonliv.count(), Facture: await prisma.facture.count(), Entretien: await prisma.entretien.count(), Banque: await prisma.banque.count(),
    Cartes: await prisma.cartes.count(), BonsStation: await prisma.bonsStation.count(), CarWash: await prisma.carWash.count(), EntRas: await prisma.entRas.count(), DetRas: await prisma.detRas.count(),
    Vehicule: await prisma.vehicule.count(), Service: await prisma.service.count(), RetourCuve: await prisma.retourCuve.count(), InventaireCarburant: await prisma.inventaireCarburant.count(), EntAvoir: await prisma.entAvoir.count(), Jaugeage: await prisma.jaugeage.count(),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
