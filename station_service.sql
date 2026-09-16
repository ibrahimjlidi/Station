-- Script généré par WINDEV le 24/06/2026 19:34:56
-- Tables de l'analyse station_service.wda
-- pour MySQL

-- Création de la table Achat_essence
CREATE TABLE `Achat_essence` (
    `date_achat` DATE NOT NULL,
    `id_fournisseur` INTEGER NOT NULL DEFAULT 0,
    `num_facture` INTEGER NOT NULL DEFAULT 0,
    `total_ttc` DOUBLE NOT NULL DEFAULT 0,
    `date_facture` DATE NOT NULL,
    `IDAchat_essence` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `reste` DOUBLE NOT NULL DEFAULT 0.000000,
    `totht` DOUBLE NOT NULL DEFAULT 0,
    `tottva` DOUBLE NOT NULL DEFAULT 0,
    `numregfour` INTEGER NOT NULL DEFAULT 0,
    `VALIDE` TINYINT NOT NULL DEFAULT 0,
    `cONF` TINYINT NOT NULL DEFAULT 0,
    `TTCRETOUR` DOUBLE NOT NULL DEFAULT 0,
    `THTRETOUR` DOUBLE NOT NULL DEFAULT 0,
    `TVRETOUR` DOUBLE NOT NULL DEFAULT 0,
    `PRELEVE` TINYINT NOT NULL DEFAULT 0,
    `TOTHTRECU` DOUBLE NOT NULL DEFAULT 0,
    `TOTTTCRECU` DOUBLE NOT NULL DEFAULT 0,
    `TOTTVARECU` DOUBLE NOT NULL DEFAULT 0,
    `AVECRETOUR` TINYINT NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Achat_essence_date_achat` ON `Achat_essence` (`date_achat`);
CREATE INDEX `WDIDX_Achat_essence_id_fournisseur` ON `Achat_essence` (`id_fournisseur`);
CREATE INDEX `WDIDX_Achat_essence_num_facture` ON `Achat_essence` (`num_facture`);
CREATE INDEX `WDIDX_Achat_essence_date_facture` ON `Achat_essence` (`date_facture`);
CREATE INDEX `WDIDX_Achat_essence_reste` ON `Achat_essence` (`reste`);
CREATE INDEX `WDIDX_Achat_essence_numregfour` ON `Achat_essence` (`numregfour`);
CREATE INDEX `WDIDX_Achat_essence_VALIDE` ON `Achat_essence` (`VALIDE`);
CREATE INDEX `WDIDX_Achat_essence_PRELEVE` ON `Achat_essence` (`PRELEVE`);

-- Création de la table Achat_prod
CREATE TABLE `Achat_prod` (
    `id_fournisseur` INTEGER NOT NULL DEFAULT 0,
    `date_achat` DATE NOT NULL,
    `num_facture` INTEGER NOT NULL DEFAULT 0,
    `total_ttc` DOUBLE NOT NULL DEFAULT 0,
    `date_facture` DATE NOT NULL,
    `IDAchat_prod` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `op` SMALLINT NOT NULL DEFAULT 0,
    `reste` DOUBLE NOT NULL DEFAULT 0.000000,
    `totht` DOUBLE NOT NULL DEFAULT 0,
    `Timtva` DOUBLE NOT NULL DEFAULT 0,
    `numregfour` INTEGER NOT NULL DEFAULT 0,
    `VALIDE` TINYINT NOT NULL DEFAULT 0,
    `cONF` TINYINT NOT NULL DEFAULT 0,
    `PRELEVE` TINYINT NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Achat_prod_id_fournisseur` ON `Achat_prod` (`id_fournisseur`);
CREATE INDEX `WDIDX_Achat_prod_date_achat` ON `Achat_prod` (`date_achat`);
CREATE INDEX `WDIDX_Achat_prod_num_facture` ON `Achat_prod` (`num_facture`);
CREATE INDEX `WDIDX_Achat_prod_date_facture` ON `Achat_prod` (`date_facture`);
CREATE INDEX `WDIDX_Achat_prod_op` ON `Achat_prod` (`op`);
CREATE INDEX `WDIDX_Achat_prod_reste` ON `Achat_prod` (`reste`);
CREATE INDEX `WDIDX_Achat_prod_numregfour` ON `Achat_prod` (`numregfour`);
CREATE INDEX `WDIDX_Achat_prod_VALIDE` ON `Achat_prod` (`VALIDE`);
CREATE INDEX `WDIDX_Achat_prod_PRELEVE` ON `Achat_prod` (`PRELEVE`);

-- Création de la table ageocomptemode
CREATE TABLE `ageocomptemode` (
    `IDBanque` SMALLINT DEFAULT 0,
    `IDMode` SMALLINT DEFAULT 0,
    `TvaCom` REAL DEFAULT 0,
    `NbrJourCompens` SMALLINT DEFAULT 0,
    `NLIG` SMALLINT DEFAULT 0,
    `commission` REAL DEFAULT 0);
CREATE INDEX `WDIDX_ageocomptemode_IDBanque` ON `ageocomptemode` (`IDBanque`);
CREATE INDEX `WDIDX_ageocomptemode_IDMode` ON `ageocomptemode` (`IDMode`);
CREATE INDEX `WDIDX_ageocomptemode_NLIG` ON `ageocomptemode` (`NLIG`);

-- Création de la table Banque
CREATE TABLE `Banque` (
    `IDBanque` SMALLINT NOT NULL UNIQUE DEFAULT 0,
    `libelle_banque` VARCHAR(50) NOT NULL,
    `tel` VARCHAR(50) NOT NULL DEFAULT '0',
    `num_fax` VARCHAR(50) NOT NULL DEFAULT '0',
    `Rib` VARCHAR(50) NOT NULL DEFAULT '0');
CREATE INDEX `WDIDX_Banque_libelle_banque` ON `Banque` (`libelle_banque`);

-- Création de la table Bonliv
CREATE TABLE `Bonliv` (
    `NUMBL` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `DATE` DATE NOT NULL,
    `IDClient` INTEGER NOT NULL DEFAULT 0,
    `TOTALHT` DOUBLE NOT NULL DEFAULT 0,
    `Totalttc` DOUBLE NOT NULL DEFAULT 0,
    `tottva` DOUBLE NOT NULL DEFAULT 0,
    `totremise` DOUBLE NOT NULL DEFAULT 0,
    `Observation` LONGTEXT NOT NULL,
    `NUMFACT` INTEGER NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Bonliv_DATE` ON `Bonliv` (`DATE`);
CREATE INDEX `WDIDX_Bonliv_IDClient` ON `Bonliv` (`IDClient`);
CREATE INDEX `WDIDX_Bonliv_NUMFACT` ON `Bonliv` (`NUMFACT`);

-- Création de la table Bons_station
CREATE TABLE `Bons_station` (
    `IDBons_station` INTEGER NOT NULL DEFAULT 0,
    `num_bord` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `date` DATE NOT NULL,
    `montant` DOUBLE NOT NULL DEFAULT 0,
    `num_facture` INTEGER NOT NULL DEFAULT 0,
    `date_renvoi` DATE NOT NULL,
    `fait` TINYINT NOT NULL DEFAULT 0,
    `Montantavoir` DOUBLE NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Bons_station_IDBons_station` ON `Bons_station` (`IDBons_station`);
CREATE INDEX `WDIDX_Bons_station_date` ON `Bons_station` (`date`);
CREATE INDEX `WDIDX_Bons_station_num_facture` ON `Bons_station` (`num_facture`);
CREATE INDEX `WDIDX_Bons_station_date_renvoi` ON `Bons_station` (`date_renvoi`);
CREATE INDEX `WDIDX_Bons_station_fait` ON `Bons_station` (`fait`);

-- Création de la table Caisse
CREATE TABLE `Caisse` (
    `IDCaisse` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `Libelllé` VARCHAR(50) NOT NULL);

-- Création de la table car_prod_siege
CREATE TABLE `car_prod_siege` (
    `id_produit` VARCHAR(13) NOT NULL DEFAULT '0',
    `id_fournisseur` INTEGER NOT NULL DEFAULT 0,
    `prix_achat_ht` DOUBLE NOT NULL DEFAULT 0.000000,
    `prix_vente_ht` DOUBLE NOT NULL DEFAULT 0.000000,
    `quantite` INTEGER NOT NULL DEFAULT 0.000000,
    `tva` SMALLINT NOT NULL DEFAULT 0,
    `ttc_achat_prod` DOUBLE NOT NULL DEFAULT 0.000000,
    `ttc_vente_prod` DOUBLE NOT NULL DEFAULT 0.000000,
    `lib_produit` VARCHAR(50) NOT NULL,
    `marge` DOUBLE NOT NULL DEFAULT 0.000000,
    `PXV_TTC` DOUBLE NOT NULL DEFAULT 0.000000,
    `code_famille` TINYINT NOT NULL DEFAULT 0,
    `PXA_TTC` DOUBLE NOT NULL DEFAULT 0,
    `date` DATE NOT NULL,
    `id_equipe` TINYINT NOT NULL DEFAULT 0,
    `id_caisse` TINYINT NOT NULL DEFAULT 0,
    `numvente` BIGINT NOT NULL DEFAULT 0,
    `NUMSTAT` SMALLINT NOT NULL DEFAULT 0,
    `op` TINYINT NOT NULL DEFAULT 0,
    `type_carburant` TINYINT NOT NULL DEFAULT 0,
    `IDPompe` INTEGER NOT NULL DEFAULT 0,
    `idligne` INTEGER NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_car_prod_siege_id_produit` ON `car_prod_siege` (`id_produit`);
CREATE INDEX `WDIDX_car_prod_siege_id_fournisseur` ON `car_prod_siege` (`id_fournisseur`);
CREATE INDEX `WDIDX_car_prod_siege_code_famille` ON `car_prod_siege` (`code_famille`);
CREATE INDEX `WDIDX_car_prod_siege_date` ON `car_prod_siege` (`date`);
CREATE INDEX `WDIDX_car_prod_siege_id_equipe` ON `car_prod_siege` (`id_equipe`);
CREATE INDEX `WDIDX_car_prod_siege_id_caisse` ON `car_prod_siege` (`id_caisse`);
CREATE INDEX `WDIDX_car_prod_siege_numvente` ON `car_prod_siege` (`numvente`);
CREATE INDEX `WDIDX_car_prod_siege_NUMSTAT` ON `car_prod_siege` (`NUMSTAT`);
CREATE INDEX `WDIDX_car_prod_siege_op` ON `car_prod_siege` (`op`);
CREATE INDEX `WDIDX_car_prod_siege_type_carburant` ON `car_prod_siege` (`type_carburant`);
CREATE INDEX `WDIDX_car_prod_siege_IDPompe` ON `car_prod_siege` (`IDPompe`);
CREATE INDEX `WDIDX_car_prod_siege_Idvente` ON `car_prod_siege` (`date`,`id_equipe`,`id_caisse`);
CREATE INDEX `WDIDX_car_prod_siege_id_vente_produit` ON `car_prod_siege` (`date`,`id_equipe`,`id_caisse`,`id_produit`);

-- Création de la table CARTES
CREATE TABLE `CARTES` (
    `NumTicket` VARCHAR(50) NOT NULL DEFAULT '0',
    `NumCession` INTEGER NOT NULL DEFAULT 0,
    `date` DATE NOT NULL,
    `montant` DOUBLE NOT NULL DEFAULT 0,
    `num_facture` VARCHAR(50) NOT NULL DEFAULT '0',
    `date_renvoi` DATE NOT NULL,
    `fait` TINYINT NOT NULL DEFAULT 0,
    `Montantavoir` DOUBLE NOT NULL DEFAULT 0,
    `typeCarte` TINYINT NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_CARTES_NumTicket` ON `CARTES` (`NumTicket`);
CREATE INDEX `WDIDX_CARTES_NumCession` ON `CARTES` (`NumCession`);
CREATE INDEX `WDIDX_CARTES_date` ON `CARTES` (`date`);
CREATE INDEX `WDIDX_CARTES_num_facture` ON `CARTES` (`num_facture`);
CREATE INDEX `WDIDX_CARTES_date_renvoi` ON `CARTES` (`date_renvoi`);
CREATE INDEX `WDIDX_CARTES_fait` ON `CARTES` (`fait`);
CREATE INDEX `WDIDX_CARTES_typeCarte` ON `CARTES` (`typeCarte`);

-- Création de la table CARWASH
CREATE TABLE `CARWASH` (
    `date` DATE NOT NULL,
    `indexouverture` INTEGER NOT NULL DEFAULT 0,
    `index_fermeture` INTEGER NOT NULL DEFAULT 0,
    `Nombrelavage` INTEGER NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_CARWASH_date` ON `CARWASH` (`date`);

-- Création de la table Client
CREATE TABLE `Client` (
    `IDClient` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `nom_client` VARCHAR(50) NOT NULL,
    `adresse` VARCHAR(100) NOT NULL,
    `ville` VARCHAR(50) NOT NULL,
    `code_postal` VARCHAR(50) NOT NULL DEFAULT '0',
    `telephone_1` VARCHAR(50) NOT NULL DEFAULT '0',
    `telephone_2` VARCHAR(50) NOT NULL DEFAULT '0',
    `num_fax` VARCHAR(50) NOT NULL DEFAULT '0',
    `e_mail` VARCHAR(50) NOT NULL,
    `timbre` VARCHAR(3) NOT NULL DEFAULT '0,00',
    `tva` SMALLINT NOT NULL DEFAULT 0,
    `MF` VARCHAR(20) NOT NULL,
    `QUOTA` DOUBLE NOT NULL DEFAULT 0.000000,
    `SoldeAnterieur` DOUBLE NOT NULL DEFAULT 0,
    `CPT` VARCHAR(8) NOT NULL);
CREATE INDEX `WDIDX_Client_nom_client` ON `Client` (`nom_client`);
CREATE INDEX `WDIDX_Client_CPT` ON `Client` (`CPT`);

-- Création de la table COMPTE
CREATE TABLE `COMPTE` (
    `COCLEUNIK` INTEGER PRIMARY KEY NOT NULL AUTO_INCREMENT,
    `Login` VARCHAR(50) NOT NULL,
    `Password` VARCHAR(50) NOT NULL,
    `AdrSrvPop` VARCHAR(50) NOT NULL,
    `AdrSrvSmtp` VARCHAR(50) NOT NULL,
    `AdrMail` VARCHAR(150) NOT NULL UNIQUE,
    `ConserveServeur` TINYINT NOT NULL DEFAULT 0,
    `destinataire` VARCHAR(50) NOT NULL);

-- Création de la table Compteur
CREATE TABLE `Compteur` (
    `IDCompteur` INTEGER PRIMARY KEY NOT NULL AUTO_INCREMENT,
    `id_achat_produits` INTEGER NOT NULL DEFAULT 0,
    `id_achat_ess` INTEGER NOT NULL DEFAULT 0,
    `IDretour_cuve` INTEGER NOT NULL DEFAULT 0,
    `numdepense` INTEGER NOT NULL DEFAULT 0,
    `numvente` BIGINT NOT NULL DEFAULT 0,
    `numrecette` INTEGER NOT NULL DEFAULT 0,
    `numcredit` INTEGER NOT NULL DEFAULT 0,
    `numreg` INTEGER NOT NULL DEFAULT 0,
    `numregfour` INTEGER NOT NULL DEFAULT 0,
    `NUMMVTBQ` INTEGER NOT NULL DEFAULT 0,
    `NUMBL` INTEGER NOT NULL DEFAULT 0,
    `NUMFACT` INTEGER NOT NULL DEFAULT 0,
    `IDtransfert` INTEGER NOT NULL DEFAULT 0,
    `idinvent` INTEGER NOT NULL DEFAULT 0,
    `dateinv` DATE NOT NULL,
    `dateinvcar` DATE NOT NULL,
    `idinvcar` INTEGER NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Compteur_id_achat_produits` ON `Compteur` (`id_achat_produits`);
CREATE INDEX `WDIDX_Compteur_id_achat_ess` ON `Compteur` (`id_achat_ess`);
CREATE INDEX `WDIDX_Compteur_IDretour_cuve` ON `Compteur` (`IDretour_cuve`);
CREATE INDEX `WDIDX_Compteur_numdepense` ON `Compteur` (`numdepense`);
CREATE INDEX `WDIDX_Compteur_numvente` ON `Compteur` (`numvente`);
CREATE INDEX `WDIDX_Compteur_numrecette` ON `Compteur` (`numrecette`);
CREATE INDEX `WDIDX_Compteur_numcredit` ON `Compteur` (`numcredit`);
CREATE INDEX `WDIDX_Compteur_numreg` ON `Compteur` (`numreg`);
CREATE INDEX `WDIDX_Compteur_numregfour` ON `Compteur` (`numregfour`);
CREATE INDEX `WDIDX_Compteur_NUMMVTBQ` ON `Compteur` (`NUMMVTBQ`);
CREATE INDEX `WDIDX_Compteur_NUMBL` ON `Compteur` (`NUMBL`);
CREATE INDEX `WDIDX_Compteur_NUMFACT` ON `Compteur` (`NUMFACT`);
CREATE INDEX `WDIDX_Compteur_IDtransfert` ON `Compteur` (`IDtransfert`);
CREATE INDEX `WDIDX_Compteur_idinvent` ON `Compteur` (`idinvent`);
CREATE INDEX `WDIDX_Compteur_dateinv` ON `Compteur` (`dateinv`);
CREATE INDEX `WDIDX_Compteur_dateinvcar` ON `Compteur` (`dateinvcar`);
CREATE INDEX `WDIDX_Compteur_idinvcar` ON `Compteur` (`idinvcar`);

-- Création de la table Credit_caisse
CREATE TABLE `Credit_caisse` (
    `date` DATE NOT NULL,
    `id_equipe` TINYINT NOT NULL DEFAULT 0,
    `id_caisse` TINYINT NOT NULL DEFAULT 0,
    `id_vendeur` INTEGER NOT NULL DEFAULT 0,
    `total_credits` DOUBLE NOT NULL DEFAULT 0.000000,
    `fait` TINYINT NOT NULL DEFAULT 0,
    `numcredit` INTEGER NOT NULL UNIQUE DEFAULT 0);
CREATE INDEX `WDIDX_Credit_caisse_date` ON `Credit_caisse` (`date`);
CREATE INDEX `WDIDX_Credit_caisse_id_equipe` ON `Credit_caisse` (`id_equipe`);
CREATE INDEX `WDIDX_Credit_caisse_id_caisse` ON `Credit_caisse` (`id_caisse`);
CREATE INDEX `WDIDX_Credit_caisse_id_vendeur` ON `Credit_caisse` (`id_vendeur`);
CREATE INDEX `WDIDX_Credit_caisse_fait` ON `Credit_caisse` (`fait`);
CREATE UNIQUE INDEX `WDIDX_Credit_caisse_ID_credit_caisse` ON `Credit_caisse` (`date`,`id_equipe`,`id_caisse`);

-- Création de la table Cuve
CREATE TABLE `Cuve` (
    `IDCuve` SMALLINT NOT NULL UNIQUE DEFAULT 0,
    `lib_cuve` VARCHAR(50) NOT NULL,
    `volume_cuve` DOUBLE NOT NULL DEFAULT 0,
    `prix_achat_ht` DOUBLE NOT NULL DEFAULT 0.000000,
    `prix_vente_ht` DOUBLE NOT NULL DEFAULT 0.000000,
    `tva_cuve` SMALLINT NOT NULL DEFAULT 0.000000,
    `entrre_cuve` DOUBLE NOT NULL DEFAULT 0.000000,
    `retour_cuve` DOUBLE NOT NULL DEFAULT 0.000000,
    `marge_cuve` DOUBLE NOT NULL DEFAULT 0.000000,
    `pvttc` NUMERIC(24,6) NOT NULL DEFAULT 0,
    `vente_cuve` DOUBLE NOT NULL DEFAULT 0,
    `type_carburant` TINYINT NOT NULL DEFAULT 0,
    `stock` DOUBLE NOT NULL DEFAULT 0.000000,
    `CUVECOTAM` VARCHAR(2) NOT NULL,
    `COMPTECPT` VARCHAR(8) NOT NULL,
    `cOMPTEACH` VARCHAR(8) NOT NULL);
CREATE INDEX `WDIDX_Cuve_type_carburant` ON `Cuve` (`type_carburant`);
CREATE INDEX `WDIDX_Cuve_COMPTECPT` ON `Cuve` (`COMPTECPT`);

-- Création de la table Depenses
CREATE TABLE `Depenses` (
    `code_depenses` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `type_depence` VARCHAR(50) NOT NULL,
    `NUMFAMDEP` INTEGER NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Depenses_type_depence` ON `Depenses` (`type_depence`);
CREATE INDEX `WDIDX_Depenses_NUMFAMDEP` ON `Depenses` (`NUMFAMDEP`);

-- Création de la table Depenses_caisse
CREATE TABLE `Depenses_caisse` (
    `date` DATE NOT NULL,
    `id_equipe` TINYINT NOT NULL DEFAULT 0,
    `id_caisse` TINYINT NOT NULL DEFAULT 0,
    `id_vendeur` INTEGER NOT NULL DEFAULT 0,
    `total_depenses` DOUBLE NOT NULL DEFAULT 0.000000,
    `fait` TINYINT NOT NULL DEFAULT 0,
    `numdepense` INTEGER NOT NULL UNIQUE DEFAULT 0);
CREATE INDEX `WDIDX_Depenses_caisse_date` ON `Depenses_caisse` (`date`);
CREATE INDEX `WDIDX_Depenses_caisse_id_equipe` ON `Depenses_caisse` (`id_equipe`);
CREATE INDEX `WDIDX_Depenses_caisse_id_caisse` ON `Depenses_caisse` (`id_caisse`);
CREATE INDEX `WDIDX_Depenses_caisse_id_vendeur` ON `Depenses_caisse` (`id_vendeur`);
CREATE INDEX `WDIDX_Depenses_caisse_fait` ON `Depenses_caisse` (`fait`);
CREATE UNIQUE INDEX `WDIDX_Depenses_caisse_ID_depenses_caisse` ON `Depenses_caisse` (`date`,`id_equipe`,`id_caisse`);

-- Création de la table Detail_achat_essence
CREATE TABLE `Detail_achat_essence` (
    `IDDetail_achat_essence` INTEGER NOT NULL DEFAULT 0,
    `quantite` INTEGER NOT NULL DEFAULT 0,
    `prix_achat_ht` DOUBLE NOT NULL DEFAULT 0.000000,
    `taux_tva` REAL NOT NULL DEFAULT 0,
    `id_cuve` INTEGER NOT NULL DEFAULT 0,
    `total_ttc` DOUBLE NOT NULL DEFAULT 0.000000,
    `id_achat_ess` INTEGER NOT NULL DEFAULT 0,
    `date` DATE NOT NULL,
    `VALIDE` TINYINT NOT NULL DEFAULT 0,
    `QTETOT` INTEGER NOT NULL DEFAULT 0,
    `QTERETOUR` INTEGER NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Detail_achat_essence_IDDetail_achat_essence` ON `Detail_achat_essence` (`IDDetail_achat_essence`);
CREATE INDEX `WDIDX_Detail_achat_essence_id_cuve` ON `Detail_achat_essence` (`id_cuve`);
CREATE INDEX `WDIDX_Detail_achat_essence_id_achat_ess` ON `Detail_achat_essence` (`id_achat_ess`);
CREATE INDEX `WDIDX_Detail_achat_essence_date` ON `Detail_achat_essence` (`date`);
CREATE INDEX `WDIDX_Detail_achat_essence_VALIDE` ON `Detail_achat_essence` (`VALIDE`);
CREATE UNIQUE INDEX `WDIDX_Detail_achat_essence_IDDetail_achat_essenceid_achat_ess` ON `Detail_achat_essence` (`IDDetail_achat_essence`,`id_achat_ess`);

-- Création de la table Detail_achat_prod
CREATE TABLE `Detail_achat_prod` (
    `IDDetail_achat_prod` INTEGER NOT NULL DEFAULT 0,
    `id_produit` VARCHAR(13) NOT NULL DEFAULT '0',
    `quantite` INTEGER NOT NULL DEFAULT 0,
    `prix_achat` DOUBLE NOT NULL DEFAULT 0,
    `taux_tva` REAL NOT NULL DEFAULT 0,
    `total_ttc` DOUBLE NOT NULL DEFAULT 0,
    `ID_Achat_produits` INTEGER NOT NULL DEFAULT 0,
    `date` DATE NOT NULL,
    `op` TINYINT NOT NULL DEFAULT 0,
    `VALIDE` TINYINT NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Detail_achat_prod_IDDetail_achat_prod` ON `Detail_achat_prod` (`IDDetail_achat_prod`);
CREATE INDEX `WDIDX_Detail_achat_prod_id_produit` ON `Detail_achat_prod` (`id_produit`);
CREATE INDEX `WDIDX_Detail_achat_prod_ID_Achat_produits` ON `Detail_achat_prod` (`ID_Achat_produits`);
CREATE INDEX `WDIDX_Detail_achat_prod_date` ON `Detail_achat_prod` (`date`);
CREATE INDEX `WDIDX_Detail_achat_prod_VALIDE` ON `Detail_achat_prod` (`VALIDE`);
CREATE UNIQUE INDEX `WDIDX_Detail_achat_prod_IDDetail_achat_prodID_Achat_produits` ON `Detail_achat_prod` (`IDDetail_achat_prod`,`ID_Achat_produits`);

-- Création de la table Detail_credit
CREATE TABLE `Detail_credit` (
    `id_client` INTEGER NOT NULL DEFAULT 0,
    `montant` DOUBLE NOT NULL DEFAULT 0.000000,
    `numero` VARCHAR(50) NOT NULL DEFAULT '0',
    `libelle` VARCHAR(50) NOT NULL,
    `mode_payment` TINYINT NOT NULL DEFAULT 0,
    `date` DATE NOT NULL,
    `id_equipe` TINYINT NOT NULL DEFAULT 0,
    `id_caisse` TINYINT NOT NULL DEFAULT 0,
    `numcredit` INTEGER NOT NULL DEFAULT 0,
    `NUMLIG` INTEGER NOT NULL DEFAULT 0,
    `prix` DOUBLE NOT NULL DEFAULT 0,
    `qte` DOUBLE NOT NULL DEFAULT 0,
    `id_vendeur` INTEGER NOT NULL DEFAULT 0,
    `VALIDE` TINYINT NOT NULL DEFAULT 0,
    `réglé` INTEGER NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Detail_credit_id_client` ON `Detail_credit` (`id_client`);
CREATE INDEX `WDIDX_Detail_credit_numero` ON `Detail_credit` (`numero`);
CREATE INDEX `WDIDX_Detail_credit_mode_payment` ON `Detail_credit` (`mode_payment`);
CREATE INDEX `WDIDX_Detail_credit_date` ON `Detail_credit` (`date`);
CREATE INDEX `WDIDX_Detail_credit_id_equipe` ON `Detail_credit` (`id_equipe`);
CREATE INDEX `WDIDX_Detail_credit_id_caisse` ON `Detail_credit` (`id_caisse`);
CREATE INDEX `WDIDX_Detail_credit_numcredit` ON `Detail_credit` (`numcredit`);
CREATE INDEX `WDIDX_Detail_credit_NUMLIG` ON `Detail_credit` (`NUMLIG`);
CREATE INDEX `WDIDX_Detail_credit_id_vendeur` ON `Detail_credit` (`id_vendeur`);
CREATE INDEX `WDIDX_Detail_credit_VALIDE` ON `Detail_credit` (`VALIDE`);
CREATE INDEX `WDIDX_Detail_credit_réglé` ON `Detail_credit` (`réglé`);
CREATE INDEX `WDIDX_Detail_credit_ID_credit_caisse` ON `Detail_credit` (`date`,`id_equipe`,`id_caisse`);
CREATE INDEX `WDIDX_Detail_credit_IDDetail_credit_caisse` ON `Detail_credit` (`date`,`id_equipe`,`id_caisse`,`id_client`,`NUMLIG`);
CREATE INDEX `WDIDX_Detail_credit_numcreditNUMLIG` ON `Detail_credit` (`numcredit`,`NUMLIG`);

-- Création de la table Detail_depenses
CREATE TABLE `Detail_depenses` (
    `id_code_depense` SMALLINT NOT NULL DEFAULT 0,
    `montant` DOUBLE NOT NULL DEFAULT 0.000000,
    `libelle` VARCHAR(50) NOT NULL,
    `numero` VARCHAR(50) NOT NULL DEFAULT '0',
    `date` DATE NOT NULL,
    `id_equipe` TINYINT NOT NULL DEFAULT 0,
    `id_caisse` TINYINT NOT NULL DEFAULT 0,
    `numdepense` INTEGER NOT NULL DEFAULT 0,
    `id_vendeur` INTEGER NOT NULL DEFAULT 0,
    `VALIDE` TINYINT NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Detail_depenses_id_code_depense` ON `Detail_depenses` (`id_code_depense`);
CREATE INDEX `WDIDX_Detail_depenses_numero` ON `Detail_depenses` (`numero`);
CREATE INDEX `WDIDX_Detail_depenses_date` ON `Detail_depenses` (`date`);
CREATE INDEX `WDIDX_Detail_depenses_id_equipe` ON `Detail_depenses` (`id_equipe`);
CREATE INDEX `WDIDX_Detail_depenses_id_caisse` ON `Detail_depenses` (`id_caisse`);
CREATE INDEX `WDIDX_Detail_depenses_numdepense` ON `Detail_depenses` (`numdepense`);
CREATE INDEX `WDIDX_Detail_depenses_id_vendeur` ON `Detail_depenses` (`id_vendeur`);
CREATE INDEX `WDIDX_Detail_depenses_VALIDE` ON `Detail_depenses` (`VALIDE`);
CREATE INDEX `WDIDX_Detail_depenses_ID_depenses_caisse` ON `Detail_depenses` (`date`,`id_equipe`,`id_caisse`);
CREATE INDEX `WDIDX_Detail_depenses_IDDetail_depenses_caisse` ON `Detail_depenses` (`date`,`id_equipe`,`id_caisse`,`id_code_depense`);

-- Création de la table Detail_recette_caisse
CREATE TABLE `Detail_recette_caisse` (
    `id_mode_payment` TINYINT NOT NULL DEFAULT 0,
    `montant` DOUBLE NOT NULL DEFAULT 0.000000,
    `banque` VARCHAR(50) NOT NULL,
    `numero` VARCHAR(50) NOT NULL DEFAULT '0',
    `date` DATE NOT NULL,
    `id_equipe` TINYINT NOT NULL DEFAULT 0,
    `id_caisse` TINYINT NOT NULL DEFAULT 0,
    `numrecette` INTEGER NOT NULL DEFAULT 0,
    `id_vendeur` INTEGER NOT NULL DEFAULT 0,
    `famillemodepay` INTEGER NOT NULL DEFAULT 0,
    `IMP` TINYINT NOT NULL DEFAULT 0,
    `impaye` TINYINT NOT NULL DEFAULT 0,
    `VALIDE` TINYINT NOT NULL DEFAULT 0,
    `QTEMODE` INTEGER NOT NULL DEFAULT 0,
    `IDCuve` SMALLINT NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Detail_recette_caisse_id_mode_payment` ON `Detail_recette_caisse` (`id_mode_payment`);
CREATE INDEX `WDIDX_Detail_recette_caisse_numero` ON `Detail_recette_caisse` (`numero`);
CREATE INDEX `WDIDX_Detail_recette_caisse_date` ON `Detail_recette_caisse` (`date`);
CREATE INDEX `WDIDX_Detail_recette_caisse_id_equipe` ON `Detail_recette_caisse` (`id_equipe`);
CREATE INDEX `WDIDX_Detail_recette_caisse_id_caisse` ON `Detail_recette_caisse` (`id_caisse`);
CREATE INDEX `WDIDX_Detail_recette_caisse_numrecette` ON `Detail_recette_caisse` (`numrecette`);
CREATE INDEX `WDIDX_Detail_recette_caisse_id_vendeur` ON `Detail_recette_caisse` (`id_vendeur`);
CREATE INDEX `WDIDX_Detail_recette_caisse_famillemodepay` ON `Detail_recette_caisse` (`famillemodepay`);
CREATE INDEX `WDIDX_Detail_recette_caisse_VALIDE` ON `Detail_recette_caisse` (`VALIDE`);
CREATE INDEX `WDIDX_Detail_recette_caisse_IDCuve` ON `Detail_recette_caisse` (`IDCuve`);
CREATE INDEX `WDIDX_Detail_recette_caisse_ID_recette_caisse` ON `Detail_recette_caisse` (`date`,`id_equipe`,`id_caisse`);
CREATE INDEX `WDIDX_Detail_recette_caisse_IDDetail_recette_caisse` ON `Detail_recette_caisse` (`date`,`id_equipe`,`id_caisse`,`id_mode_payment`);

-- Création de la table Detail_reglements
CREATE TABLE `Detail_reglements` (
    `id_client` INTEGER NOT NULL DEFAULT 0,
    `montant` DOUBLE NOT NULL DEFAULT 0.000000,
    `libelle` VARCHAR(50) NOT NULL,
    `mode_payment` TINYINT NOT NULL DEFAULT 0,
    `date` DATE NOT NULL,
    `id_equipe` TINYINT NOT NULL DEFAULT 0,
    `id_caisse` TINYINT NOT NULL DEFAULT 0,
    `numreg` INTEGER NOT NULL DEFAULT 0,
    `echeance` DATE NOT NULL,
    `impaye` INTEGER NOT NULL DEFAULT 0,
    `id_vendeur` INTEGER NOT NULL DEFAULT 0,
    `VALIDE` TINYINT NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Detail_reglements_id_client` ON `Detail_reglements` (`id_client`);
CREATE INDEX `WDIDX_Detail_reglements_mode_payment` ON `Detail_reglements` (`mode_payment`);
CREATE INDEX `WDIDX_Detail_reglements_date` ON `Detail_reglements` (`date`);
CREATE INDEX `WDIDX_Detail_reglements_id_equipe` ON `Detail_reglements` (`id_equipe`);
CREATE INDEX `WDIDX_Detail_reglements_id_caisse` ON `Detail_reglements` (`id_caisse`);
CREATE INDEX `WDIDX_Detail_reglements_numreg` ON `Detail_reglements` (`numreg`);
CREATE INDEX `WDIDX_Detail_reglements_echeance` ON `Detail_reglements` (`echeance`);
CREATE INDEX `WDIDX_Detail_reglements_impaye` ON `Detail_reglements` (`impaye`);
CREATE INDEX `WDIDX_Detail_reglements_id_vendeur` ON `Detail_reglements` (`id_vendeur`);
CREATE INDEX `WDIDX_Detail_reglements_VALIDE` ON `Detail_reglements` (`VALIDE`);
CREATE INDEX `WDIDX_Detail_reglements_ID_reglement_caisse` ON `Detail_reglements` (`date`,`id_equipe`,`id_caisse`);
CREATE INDEX `WDIDX_Detail_reglements_IDDetail_reglement_caisse` ON `Detail_reglements` (`date`,`id_equipe`,`id_caisse`,`id_client`,`mode_payment`);

-- Création de la table Detail_retour
CREATE TABLE `Detail_retour` (
    `id_caisse` INTEGER NOT NULL DEFAULT 0,
    `id_vendeur` INTEGER NOT NULL DEFAULT 0,
    `id_pompe` SMALLINT NOT NULL DEFAULT 0,
    `id_equipe` INTEGER NOT NULL DEFAULT 0,
    `date` DATE NOT NULL,
    `volume` DOUBLE NOT NULL DEFAULT 0.000000,
    `valeur` DOUBLE NOT NULL DEFAULT 0.000000,
    `id_cuve` TINYINT NOT NULL DEFAULT 0,
    `taux_tva` REAL NOT NULL DEFAULT 0,
    `prix_unitaire_ttc` DOUBLE NOT NULL DEFAULT 0,
    `numretour` INTEGER NOT NULL DEFAULT 0,
    `VALIDE` TINYINT NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Detail_retour_id_caisse` ON `Detail_retour` (`id_caisse`);
CREATE INDEX `WDIDX_Detail_retour_id_vendeur` ON `Detail_retour` (`id_vendeur`);
CREATE INDEX `WDIDX_Detail_retour_id_pompe` ON `Detail_retour` (`id_pompe`);
CREATE INDEX `WDIDX_Detail_retour_id_equipe` ON `Detail_retour` (`id_equipe`);
CREATE INDEX `WDIDX_Detail_retour_date` ON `Detail_retour` (`date`);
CREATE INDEX `WDIDX_Detail_retour_id_cuve` ON `Detail_retour` (`id_cuve`);
CREATE INDEX `WDIDX_Detail_retour_numretour` ON `Detail_retour` (`numretour`);
CREATE INDEX `WDIDX_Detail_retour_VALIDE` ON `Detail_retour` (`VALIDE`);
CREATE INDEX `WDIDX_Detail_retour_id_retour_caisse` ON `Detail_retour` (`date`,`id_equipe`,`id_caisse`);
CREATE UNIQUE INDEX `WDIDX_Detail_retour_id_detail_retour` ON `Detail_retour` (`date`,`id_equipe`,`id_caisse`,`id_cuve`,`id_pompe`);

-- Création de la table Detaille_reg_four
CREATE TABLE `Detaille_reg_four` (
    `nligne` INTEGER NOT NULL DEFAULT 0,
    `numregfour` INTEGER NOT NULL DEFAULT 0,
    `numfacture` INTEGER NOT NULL DEFAULT 0,
    `numachats` INTEGER NOT NULL DEFAULT 0,
    `montant` DOUBLE NOT NULL DEFAULT 0.000000,
    `mode_payment` INTEGER NOT NULL DEFAULT 0,
    `Libelle` VARCHAR(100) NOT NULL,
    `Cheque` VARCHAR(10) NOT NULL DEFAULT '0',
    `Banq` INTEGER NOT NULL DEFAULT 0,
    `date` DATE NOT NULL,
    `pro_ess` VARCHAR(1) NOT NULL,
    `reste` DOUBLE NOT NULL DEFAULT 0,
    `ttcfacture` DOUBLE NOT NULL DEFAULT 0,
    `echeance` DATE NOT NULL,
    `idfour` INTEGER NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Detaille_reg_four_nligne` ON `Detaille_reg_four` (`nligne`);
CREATE INDEX `WDIDX_Detaille_reg_four_numregfour` ON `Detaille_reg_four` (`numregfour`);
CREATE INDEX `WDIDX_Detaille_reg_four_numfacture` ON `Detaille_reg_four` (`numfacture`);
CREATE INDEX `WDIDX_Detaille_reg_four_numachats` ON `Detaille_reg_four` (`numachats`);
CREATE INDEX `WDIDX_Detaille_reg_four_mode_payment` ON `Detaille_reg_four` (`mode_payment`);
CREATE INDEX `WDIDX_Detaille_reg_four_date` ON `Detaille_reg_four` (`date`);
CREATE INDEX `WDIDX_Detaille_reg_four_pro_ess` ON `Detaille_reg_four` (`pro_ess`);
CREATE INDEX `WDIDX_Detaille_reg_four_echeance` ON `Detaille_reg_four` (`echeance`);
CREATE INDEX `WDIDX_Detaille_reg_four_idfour` ON `Detaille_reg_four` (`idfour`);
CREATE UNIQUE INDEX `WDIDX_Detaille_reg_four_nlignenumreg` ON `Detaille_reg_four` (`nligne`,`numregfour`);
CREATE INDEX `WDIDX_Detaille_reg_four_numachatspro_ess` ON `Detaille_reg_four` (`numachats`,`pro_ess`);

-- Création de la table Detbonliv
CREATE TABLE `Detbonliv` (
    `NUMLIG` INTEGER NOT NULL DEFAULT 0,
    `NUMBL` INTEGER NOT NULL DEFAULT 0,
    `IDProduit` VARCHAR(13) NOT NULL DEFAULT '0',
    `puht` DOUBLE NOT NULL DEFAULT 0,
    `tva` SMALLINT NOT NULL DEFAULT 0,
    `qte` DOUBLE NOT NULL DEFAULT 0,
    `remise` INTEGER NOT NULL DEFAULT 0,
    `ttc` DOUBLE NOT NULL DEFAULT 0,
    `tottva` DOUBLE NOT NULL DEFAULT 0.000000,
    `totremise` DOUBLE NOT NULL DEFAULT 0.000000,
    `tht` DOUBLE NOT NULL DEFAULT 0,
    `date` DATE NOT NULL,
    `NUMFACT` INTEGER NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Detbonliv_NUMLIG` ON `Detbonliv` (`NUMLIG`);
CREATE INDEX `WDIDX_Detbonliv_NUMBL` ON `Detbonliv` (`NUMBL`);
CREATE INDEX `WDIDX_Detbonliv_IDProduit` ON `Detbonliv` (`IDProduit`);
CREATE INDEX `WDIDX_Detbonliv_date` ON `Detbonliv` (`date`);
CREATE INDEX `WDIDX_Detbonliv_NUMFACT` ON `Detbonliv` (`NUMFACT`);
CREATE UNIQUE INDEX `WDIDX_Detbonliv_NUMBLNUMLIG` ON `Detbonliv` (`NUMBL`,`NUMLIG`);

-- Création de la table Detentretien
CREATE TABLE `Detentretien` (
    `Nument` INTEGER NOT NULL DEFAULT 0,
    `dateent` INTEGER NOT NULL DEFAULT 0,
    `IDService` INTEGER NOT NULL DEFAULT 0,
    `prixht` DOUBLE NOT NULL DEFAULT 0.000000,
    `prixttc` DOUBLE NOT NULL DEFAULT 0.000000,
    `IDTVA` INTEGER NOT NULL DEFAULT 0,
    `MNTTVA` DOUBLE NOT NULL DEFAULT 0.000000,
    `NUMLIGNE` INTEGER NOT NULL DEFAULT 0,
    `TAUXTVA` DOUBLE NOT NULL DEFAULT 0.000000,
    `QTE` INTEGER NOT NULL DEFAULT 0,
    `LIBSERVICE` VARCHAR(50) NOT NULL);
CREATE INDEX `WDIDX_Detentretien_Nument` ON `Detentretien` (`Nument`);
CREATE INDEX `WDIDX_Detentretien_dateent` ON `Detentretien` (`dateent`);
CREATE INDEX `WDIDX_Detentretien_IDService` ON `Detentretien` (`IDService`);
CREATE INDEX `WDIDX_Detentretien_NUMLIGNE` ON `Detentretien` (`NUMLIGNE`);

-- Création de la table detfact
CREATE TABLE `detfact` (
    `NUMLIG` INTEGER NOT NULL DEFAULT 0,
    `NUMFACT` INTEGER NOT NULL DEFAULT 0,
    `IDProduit` VARCHAR(13) NOT NULL DEFAULT '0',
    `puht` DOUBLE NOT NULL DEFAULT 0,
    `tva` SMALLINT NOT NULL DEFAULT 0,
    `qte` DOUBLE NOT NULL DEFAULT 0,
    `remise` INTEGER NOT NULL DEFAULT 0,
    `ttc` DOUBLE NOT NULL DEFAULT 0,
    `tottva` DOUBLE NOT NULL DEFAULT 0.000000,
    `totremise` DOUBLE NOT NULL DEFAULT 0.000000,
    `tht` DOUBLE NOT NULL DEFAULT 0,
    `date` DATE NOT NULL);
CREATE INDEX `WDIDX_detfact_NUMLIG` ON `detfact` (`NUMLIG`);
CREATE INDEX `WDIDX_detfact_NUMFACT` ON `detfact` (`NUMFACT`);
CREATE INDEX `WDIDX_detfact_IDProduit` ON `detfact` (`IDProduit`);
CREATE INDEX `WDIDX_detfact_date` ON `detfact` (`date`);
CREATE UNIQUE INDEX `WDIDX_detfact_NUMBLNUMLIG` ON `detfact` (`NUMFACT`,`NUMLIG`);

-- Création de la table DETINVENT
CREATE TABLE `DETINVENT` (
    `IDINVENT` INTEGER NOT NULL DEFAULT 0,
    `date` DATE NOT NULL,
    `IDPRODUIT` VARCHAR(13) NOT NULL DEFAULT '0',
    `STOCKTHEPRIQUE` DOUBLE NOT NULL DEFAULT 0.000000,
    `STOCKINVENTAIRE` DOUBLE NOT NULL DEFAULT 0.000000,
    `prix` DOUBLE NOT NULL DEFAULT 0,
    `VALEURTHEORIQUE` DOUBLE NOT NULL DEFAULT 0.000000,
    `IDFAMILLE` INTEGER NOT NULL DEFAULT 0,
    `VALEURINVENTAIR` VARCHAR(50) NOT NULL,
    `ECARTSTOCK` DOUBLE NOT NULL DEFAULT 0,
    `ECARTVALEUR` DOUBLE NOT NULL DEFAULT 0.000000);
CREATE INDEX `WDIDX_DETINVENT_IDINVENT` ON `DETINVENT` (`IDINVENT`);
CREATE INDEX `WDIDX_DETINVENT_date` ON `DETINVENT` (`date`);
CREATE INDEX `WDIDX_DETINVENT_IDPRODUIT` ON `DETINVENT` (`IDPRODUIT`);
CREATE INDEX `WDIDX_DETINVENT_IDFAMILLE` ON `DETINVENT` (`IDFAMILLE`);
CREATE UNIQUE INDEX `WDIDX_DETINVENT_IDINVENTIDPRODUIT` ON `DETINVENT` (`IDINVENT`,`IDPRODUIT`);

-- Création de la table DETINVENTCAR
CREATE TABLE `DETINVENTCAR` (
    `IDINVENT` INTEGER NOT NULL DEFAULT 0,
    `date` DATE NOT NULL,
    `IDCUVE` SMALLINT NOT NULL UNIQUE DEFAULT 0,
    `STOCKPHY` DOUBLE NOT NULL DEFAULT 0.000000,
    `prix` DOUBLE NOT NULL DEFAULT 0,
    `valeur` DOUBLE NOT NULL DEFAULT 0.000000,
    `STOCKCPT` DOUBLE NOT NULL DEFAULT 0.000000);
CREATE INDEX `WDIDX_DETINVENTCAR_IDINVENT` ON `DETINVENTCAR` (`IDINVENT`);
CREATE INDEX `WDIDX_DETINVENTCAR_date` ON `DETINVENTCAR` (`date`);
CREATE UNIQUE INDEX `WDIDX_DETINVENTCAR_IDINVENTIDCUVE` ON `DETINVENTCAR` (`IDINVENT`,`IDCUVE`);

-- Création de la table DETMVTBQ
CREATE TABLE `DETMVTBQ` (
    `NUMLIG` INTEGER NOT NULL DEFAULT 0,
    `NUMMVTBQ` INTEGER NOT NULL DEFAULT 0,
    `IDMode_payment` SMALLINT NOT NULL DEFAULT 0,
    `DATEech` DATE NOT NULL,
    `NUMCHQ` INTEGER NOT NULL DEFAULT 0,
    `MONTANT` DOUBLE NOT NULL DEFAULT 0.000000,
    `date` DATE NOT NULL,
    `libelle` VARCHAR(100) NOT NULL,
    `NUMREC` INTEGER NOT NULL DEFAULT 0,
    `id_vendeur` INTEGER NOT NULL DEFAULT 0,
    `Rap` TINYINT NOT NULL DEFAULT 0,
    `IDBANQUE` INTEGER NOT NULL DEFAULT 0,
    `IDOperation_bancaire` INTEGER NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_DETMVTBQ_NUMLIG` ON `DETMVTBQ` (`NUMLIG`);
CREATE INDEX `WDIDX_DETMVTBQ_NUMMVTBQ` ON `DETMVTBQ` (`NUMMVTBQ`);
CREATE INDEX `WDIDX_DETMVTBQ_IDMode_payment` ON `DETMVTBQ` (`IDMode_payment`);
CREATE INDEX `WDIDX_DETMVTBQ_DATEech` ON `DETMVTBQ` (`DATEech`);
CREATE INDEX `WDIDX_DETMVTBQ_date` ON `DETMVTBQ` (`date`);
CREATE INDEX `WDIDX_DETMVTBQ_NUMREC` ON `DETMVTBQ` (`NUMREC`);
CREATE INDEX `WDIDX_DETMVTBQ_id_vendeur` ON `DETMVTBQ` (`id_vendeur`);
CREATE INDEX `WDIDX_DETMVTBQ_Rap` ON `DETMVTBQ` (`Rap`);
CREATE INDEX `WDIDX_DETMVTBQ_IDBANQUE` ON `DETMVTBQ` (`IDBANQUE`);
CREATE INDEX `WDIDX_DETMVTBQ_IDOperation_bancaire` ON `DETMVTBQ` (`IDOperation_bancaire`);
CREATE UNIQUE INDEX `WDIDX_DETMVTBQ_NUMMVTBQNUMLIG` ON `DETMVTBQ` (`NUMMVTBQ`,`NUMLIG`);

-- Création de la table DETRAS
CREATE TABLE `DETRAS` (
    `NUMRAS` INTEGER DEFAULT 0,
    `NUMLIGNE` SMALLINT DEFAULT 0,
    `CODERET` INTEGER DEFAULT 0,
    `MTBRUT` DOUBLE DEFAULT 0,
    `TAUXRETENU` REAL DEFAULT 0,
    `MTRETENU` DOUBLE DEFAULT 0,
    `MTNET` DOUBLE DEFAULT 0,
    `CFOUR` INTEGER DEFAULT 0,
    `DATERAS` DATE ,
    `VALIDE` TINYINT DEFAULT 0,
    `INTEGRE` TINYINT DEFAULT 0);
CREATE INDEX `WDIDX_DETRAS_NUMRAS` ON `DETRAS` (`NUMRAS`);
CREATE INDEX `WDIDX_DETRAS_NUMLIGNE` ON `DETRAS` (`NUMLIGNE`);
CREATE INDEX `WDIDX_DETRAS_CODERET` ON `DETRAS` (`CODERET`);
CREATE INDEX `WDIDX_DETRAS_CFOUR` ON `DETRAS` (`CFOUR`);
CREATE INDEX `WDIDX_DETRAS_DATERAS` ON `DETRAS` (`DATERAS`);
CREATE INDEX `WDIDX_DETRAS_VALIDE` ON `DETRAS` (`VALIDE`);
CREATE INDEX `WDIDX_DETRAS_INTEGRE` ON `DETRAS` (`INTEGRE`);

-- Création de la table Dettrans_etranger
CREATE TABLE `Dettrans_etranger` (
    `IDDettransfert` INTEGER NOT NULL DEFAULT 0,
    `id_produit` VARCHAR(13) NOT NULL DEFAULT '0',
    `quantite` INTEGER NOT NULL DEFAULT 0,
    `prix_achat` DOUBLE NOT NULL DEFAULT 0,
    `taux_tva` REAL NOT NULL DEFAULT 0,
    `total_ttc` DOUBLE NOT NULL DEFAULT 0.000000,
    `IDtransfert` INTEGER NOT NULL DEFAULT 0,
    `date` DATE NOT NULL,
    `op` TINYINT NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Dettrans_etranger_IDDettransfert` ON `Dettrans_etranger` (`IDDettransfert`);
CREATE INDEX `WDIDX_Dettrans_etranger_id_produit` ON `Dettrans_etranger` (`id_produit`);
CREATE INDEX `WDIDX_Dettrans_etranger_IDtransfert` ON `Dettrans_etranger` (`IDtransfert`);
CREATE INDEX `WDIDX_Dettrans_etranger_date` ON `Dettrans_etranger` (`date`);
CREATE INDEX `WDIDX_Dettrans_etranger_IDDetail_achat_prodID_Achat_produits` ON `Dettrans_etranger` (`IDtransfert`,`IDDettransfert`);

-- Création de la table ENTAVOIR
CREATE TABLE `ENTAVOIR` (
    `date_achat` DATE NOT NULL,
    `id_fournisseur` INTEGER NOT NULL DEFAULT 0,
    `num_facture` INTEGER NOT NULL DEFAULT 0,
    `total_ttc` DOUBLE NOT NULL DEFAULT 0,
    `date_facture` DATE NOT NULL,
    `IDAchat_essence` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `reste` DOUBLE NOT NULL DEFAULT 0.000000,
    `totht` DOUBLE NOT NULL DEFAULT 0,
    `tottva` DOUBLE NOT NULL DEFAULT 0,
    `numregfour` INTEGER NOT NULL DEFAULT 0,
    `VALIDE` TINYINT NOT NULL DEFAULT 0,
    `cONF` TINYINT NOT NULL DEFAULT 0,
    `TTCRETOUR` DOUBLE NOT NULL DEFAULT 0,
    `THTRETOUR` DOUBLE NOT NULL DEFAULT 0,
    `TVRETOUR` DOUBLE NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_ENTAVOIR_date_achat` ON `ENTAVOIR` (`date_achat`);
CREATE INDEX `WDIDX_ENTAVOIR_id_fournisseur` ON `ENTAVOIR` (`id_fournisseur`);
CREATE INDEX `WDIDX_ENTAVOIR_num_facture` ON `ENTAVOIR` (`num_facture`);
CREATE INDEX `WDIDX_ENTAVOIR_date_facture` ON `ENTAVOIR` (`date_facture`);
CREATE INDEX `WDIDX_ENTAVOIR_reste` ON `ENTAVOIR` (`reste`);
CREATE INDEX `WDIDX_ENTAVOIR_numregfour` ON `ENTAVOIR` (`numregfour`);
CREATE INDEX `WDIDX_ENTAVOIR_VALIDE` ON `ENTAVOIR` (`VALIDE`);

-- Création de la table ENTRAS
CREATE TABLE `ENTRAS` (
    `NUMRAS` INTEGER UNIQUE DEFAULT 0,
    `DATERAS` DATE ,
    `CFOUR` INTEGER DEFAULT 0,
    `TOTALBRUT` DOUBLE DEFAULT 0,
    `TOTALRETENU` DOUBLE DEFAULT 0,
    `TOTALNET` DOUBLE DEFAULT 0,
    `OBJETMARCHE` VARCHAR(500) ,
    `totTIMBRE` REAL DEFAULT 0,
    `VALIDE` TINYINT DEFAULT 0,
    `INTEGRE` TINYINT DEFAULT 0);
CREATE INDEX `WDIDX_ENTRAS_DATERAS` ON `ENTRAS` (`DATERAS`);
CREATE INDEX `WDIDX_ENTRAS_CFOUR` ON `ENTRAS` (`CFOUR`);
CREATE INDEX `WDIDX_ENTRAS_VALIDE` ON `ENTRAS` (`VALIDE`);
CREATE INDEX `WDIDX_ENTRAS_INTEGRE` ON `ENTRAS` (`INTEGRE`);

-- Création de la table Entretien
CREATE TABLE `Entretien` (
    `Nument` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `dateent` DATE NOT NULL,
    `matricule` VARCHAR(50) NOT NULL,
    `IDClient` INTEGER NOT NULL DEFAULT 0,
    `totentttc` DOUBLE NOT NULL DEFAULT 0.000000,
    `totentht` DOUBLE NOT NULL DEFAULT 0.000000,
    `mnttva` DOUBLE NOT NULL DEFAULT 0.000000,
    `NOMCLT` VARCHAR(100) NOT NULL DEFAULT '0',
    `indexkm` BIGINT NOT NULL DEFAULT 0,
    `prochainindex` BIGINT NOT NULL DEFAULT 0,
    `nbrkm` INTEGER NOT NULL DEFAULT 0,
    `dateprochain` DATE NOT NULL,
    `Moyenkm` INTEGER NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Entretien_dateent` ON `Entretien` (`dateent`);
CREATE INDEX `WDIDX_Entretien_matricule` ON `Entretien` (`matricule`);
CREATE INDEX `WDIDX_Entretien_IDClient` ON `Entretien` (`IDClient`);
CREATE INDEX `WDIDX_Entretien_NOMCLT` ON `Entretien` (`NOMCLT`);

-- Création de la table Equipe
CREATE TABLE `Equipe` (
    `IDEquipe` SMALLINT NOT NULL UNIQUE DEFAULT 0,
    `libel_eq` VARCHAR(50) NOT NULL,
    `horaire` VARCHAR(50) NOT NULL);
CREATE INDEX `WDIDX_Equipe_libel_eq` ON `Equipe` (`libel_eq`);

-- Création de la table EXTRAIT_CN
CREATE TABLE `EXTRAIT_CN` (
    `Terminal` VARCHAR(50) ,
    `Shift` VARCHAR(50) ,
    `Date` DATE ,
    `Ref_facture` VARCHAR(50) ,
    `Receipt` VARCHAR(50) ,
    `Product` VARCHAR(50) ,
    `Customer_name` VARCHAR(50) ,
    `Card` VARCHAR(50) ,
    `Transaction_Type` VARCHAR(50) ,
    `Quantity` REAL DEFAULT 0,
    `Terminal_price` DOUBLE DEFAULT 0,
    `Amount` DOUBLE DEFAULT 0,
    `NUMCN` VARCHAR(50) ,
    `DateAvoir` DATE );
CREATE INDEX `WDIDX_EXTRAIT_CN_Shift` ON `EXTRAIT_CN` (`Shift`);
CREATE INDEX `WDIDX_EXTRAIT_CN_Date` ON `EXTRAIT_CN` (`Date`);
CREATE INDEX `WDIDX_EXTRAIT_CN_Ref_facture` ON `EXTRAIT_CN` (`Ref_facture`);
CREATE INDEX `WDIDX_EXTRAIT_CN_Receipt` ON `EXTRAIT_CN` (`Receipt`);
CREATE INDEX `WDIDX_EXTRAIT_CN_Product` ON `EXTRAIT_CN` (`Product`);
CREATE INDEX `WDIDX_EXTRAIT_CN_Card` ON `EXTRAIT_CN` (`Card`);
CREATE INDEX `WDIDX_EXTRAIT_CN_NUMCN` ON `EXTRAIT_CN` (`NUMCN`);
CREATE INDEX `WDIDX_EXTRAIT_CN_DateAvoir` ON `EXTRAIT_CN` (`DateAvoir`);
CREATE INDEX `WDIDX_EXTRAIT_CN_ReceiptCardDate` ON `EXTRAIT_CN` (`Receipt`,`Card`,`Date`,`Amount`);

-- Création de la table facture
CREATE TABLE `facture` (
    `NUMFACT` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `DATE` DATE NOT NULL,
    `IDClient` INTEGER NOT NULL DEFAULT 0,
    `TOTALHT` DOUBLE NOT NULL DEFAULT 0,
    `Totalttc` DOUBLE NOT NULL DEFAULT 0,
    `tottva` DOUBLE NOT NULL DEFAULT 0,
    `totremise` DOUBLE NOT NULL DEFAULT 0,
    `NUMBL` INTEGER NOT NULL DEFAULT 0,
    `MTTIMBRE` REAL NOT NULL DEFAULT 0,
    `libClient` VARCHAR(500) NOT NULL);
CREATE INDEX `WDIDX_facture_DATE` ON `facture` (`DATE`);
CREATE INDEX `WDIDX_facture_IDClient` ON `facture` (`IDClient`);
CREATE INDEX `WDIDX_facture_NUMBL` ON `facture` (`NUMBL`);

-- Création de la table FAMDEPENSE
CREATE TABLE `FAMDEPENSE` (
    `NUMFAMDEP` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `LIBELLE` VARCHAR(50) NOT NULL,
    `CPT` VARCHAR(8) NOT NULL);
CREATE INDEX `WDIDX_FAMDEPENSE_CPT` ON `FAMDEPENSE` (`CPT`);

-- Création de la table Famille_payment
CREATE TABLE `Famille_payment` (
    `lib_famille` VARCHAR(50) NOT NULL,
    `code_famille` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `COMPTECPT` VARCHAR(8) NOT NULL);
CREATE INDEX `WDIDX_Famille_payment_COMPTECPT` ON `Famille_payment` (`COMPTECPT`);

-- Création de la table Famille_produit
CREATE TABLE `Famille_produit` (
    `IDfamille_produit` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `libelle_famille_prod` VARCHAR(50) NOT NULL,
    `description` VARCHAR(50) NOT NULL,
    `CUMULOUINON` TINYINT NOT NULL DEFAULT 0,
    `typeprod` TINYINT NOT NULL DEFAULT 0,
    `COMPTECPT` VARCHAR(8) NOT NULL,
    `cOMPTEACH` VARCHAR(8) NOT NULL);
CREATE INDEX `WDIDX_Famille_produit_libelle_famille_prod` ON `Famille_produit` (`libelle_famille_prod`);
CREATE INDEX `WDIDX_Famille_produit_COMPTECPT` ON `Famille_produit` (`COMPTECPT`);

-- Création de la table Fournisseur
CREATE TABLE `Fournisseur` (
    `nom_fournisseur` VARCHAR(50) NOT NULL,
    `adresse` VARCHAR(50) NOT NULL,
    `ville` VARCHAR(50) NOT NULL,
    `code_postal` VARCHAR(50) NOT NULL,
    `tel1` VARCHAR(50) NOT NULL,
    `tel2` VARCHAR(50) NOT NULL,
    `e_mail` VARCHAR(50) NOT NULL,
    `num_fax` VARCHAR(50) NOT NULL,
    `domaine_activite` VARCHAR(50) NOT NULL,
    `IDFournisseur` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `numSHOP` INTEGER NOT NULL DEFAULT 0,
    `COMPTECPT` VARCHAR(8) NOT NULL,
    `CODEFISC` VARCHAR(13) NOT NULL);
CREATE INDEX `WDIDX_Fournisseur_nom_fournisseur` ON `Fournisseur` (`nom_fournisseur`);
CREATE INDEX `WDIDX_Fournisseur_COMPTECPT` ON `Fournisseur` (`COMPTECPT`);

-- Création de la table Impayes
CREATE TABLE `Impayes` (
    `NUMREG` VARCHAR(50) NOT NULL,
    `NUMFAC` VARCHAR(50) NOT NULL,
    `DATEREG` DATE NOT NULL,
    `NLIG` SMALLINT NOT NULL,
    `TYPLETR` INTEGER NOT NULL,
    `CPAYE` SMALLINT NOT NULL,
    `MNTREGLIG` DOUBLE NOT NULL,
    `ECHLIG` DATE NOT NULL,
    `LIBCHEQ` VARCHAR(30) NOT NULL,
    `NUMCHEQ` VARCHAR(20) NOT NULL,
    `NUMRIB` VARCHAR(20) NOT NULL,
    `NUMTRAITE` INTEGER NOT NULL,
    `TYPTRAITE` VARCHAR(1) NOT NULL,
    `DOMICIL` VARCHAR(20) NOT NULL,
    `NOMBANQ` VARCHAR(40) NOT NULL,
    `NUMAV` INTEGER NOT NULL,
    `TYPEREG` VARCHAR(1) NOT NULL,
    `CODECLI` INTEGER NOT NULL,
    `NBONL` VARCHAR(50) NOT NULL DEFAULT '0',
    `DATEBL` DATE NOT NULL,
    `VALIDE` TINYINT NOT NULL DEFAULT 0,
    `impaye` TINYINT NOT NULL DEFAULT 0,
    `CODSDATR` CHAR(12) NOT NULL,
    `id_equipe` INTEGER NOT NULL DEFAULT 0,
    `id_caisse` INTEGER NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Impayes_NUMREG` ON `Impayes` (`NUMREG`);
CREATE INDEX `WDIDX_Impayes_NUMFAC` ON `Impayes` (`NUMFAC`);
CREATE INDEX `WDIDX_Impayes_DATEREG` ON `Impayes` (`DATEREG`);
CREATE INDEX `WDIDX_Impayes_NLIG` ON `Impayes` (`NLIG`);
CREATE INDEX `WDIDX_Impayes_TYPLETR` ON `Impayes` (`TYPLETR`);
CREATE INDEX `WDIDX_Impayes_CPAYE` ON `Impayes` (`CPAYE`);
CREATE INDEX `WDIDX_Impayes_ECHLIG` ON `Impayes` (`ECHLIG`);
CREATE INDEX `WDIDX_Impayes_NUMCHEQ` ON `Impayes` (`NUMCHEQ`);
CREATE INDEX `WDIDX_Impayes_NUMRIB` ON `Impayes` (`NUMRIB`);
CREATE INDEX `WDIDX_Impayes_NUMTRAITE` ON `Impayes` (`NUMTRAITE`);
CREATE INDEX `WDIDX_Impayes_TYPTRAITE` ON `Impayes` (`TYPTRAITE`);
CREATE INDEX `WDIDX_Impayes_NUMAV` ON `Impayes` (`NUMAV`);
CREATE INDEX `WDIDX_Impayes_TYPEREG` ON `Impayes` (`TYPEREG`);
CREATE INDEX `WDIDX_Impayes_CODECLI` ON `Impayes` (`CODECLI`);
CREATE INDEX `WDIDX_Impayes_NBONL` ON `Impayes` (`NBONL`);
CREATE INDEX `WDIDX_Impayes_DATEBL` ON `Impayes` (`DATEBL`);
CREATE INDEX `WDIDX_Impayes_VALIDE` ON `Impayes` (`VALIDE`);
CREATE INDEX `WDIDX_Impayes_CODSDATR` ON `Impayes` (`CODSDATR`);
CREATE UNIQUE INDEX `WDIDX_Impayes_REGLIG` ON `Impayes` (`NUMREG`,`NLIG`);
CREATE INDEX `WDIDX_Impayes_OptimCleComp_1` ON `Impayes` (`NUMREG`,`DATEBL`,`ECHLIG`);
CREATE INDEX `WDIDX_Impayes_OptimCleComp_2` ON `Impayes` (`DATEBL`,`DATEREG`);

-- Création de la table Intermed_det_mvts_cuve
CREATE TABLE `Intermed_det_mvts_cuve` (
    `date` DATE NOT NULL,
    `mouvements` VARCHAR(50) NOT NULL,
    `id_pomp` SMALLINT NOT NULL DEFAULT 0,
    `pompe` VARCHAR(50) NOT NULL,
    `equipe` TINYINT NOT NULL DEFAULT 0,
    `caisse` TINYINT NOT NULL DEFAULT 0,
    `vendeur` SMALLINT NOT NULL DEFAULT 0,
    `num_facture` INTEGER NOT NULL,
    `date_facture` DATE NOT NULL,
    `quantite` DOUBLE NOT NULL DEFAULT 0,
    `solde` DOUBLE NOT NULL DEFAULT 0,
    `total` DOUBLE NOT NULL DEFAULT 0,
    `identifiant_detail` INTEGER NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Intermed_det_mvts_cuve_identifiant_detail` ON `Intermed_det_mvts_cuve` (`identifiant_detail`);

-- Création de la table Intermed_det_mvts_prod
CREATE TABLE `Intermed_det_mvts_prod` (
    `date` DATE NOT NULL,
    `mouvements` VARCHAR(50) NOT NULL,
    `equipe` TINYINT NOT NULL DEFAULT 0,
    `caisse` TINYINT NOT NULL DEFAULT 0,
    `vendeur` SMALLINT NOT NULL DEFAULT 0,
    `num_facture` INTEGER NOT NULL,
    `date_facture` DATE NOT NULL,
    `quantite` INTEGER NOT NULL DEFAULT 0.000000,
    `solde` INTEGER NOT NULL DEFAULT 0.000000,
    `total` DOUBLE NOT NULL DEFAULT 0,
    `identifiant_detail` INTEGER NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Intermed_det_mvts_prod_identifiant_detail` ON `Intermed_det_mvts_prod` (`identifiant_detail`);

-- Création de la table Intermed_mvts_cuves
CREATE TABLE `Intermed_mvts_cuves` (
    `date_debut` DATE NOT NULL,
    `date_fin` DATE NOT NULL,
    `solde_depart` DOUBLE NOT NULL DEFAULT 0,
    `total_volumes` DOUBLE NOT NULL DEFAULT 0,
    `valeur_mvts` DOUBLE NOT NULL DEFAULT 0,
    `identifiant` INTEGER NOT NULL DEFAULT 0,
    `id_cuv` TINYINT NOT NULL DEFAULT 0,
    `cuve` VARCHAR(50) NOT NULL);
CREATE INDEX `WDIDX_Intermed_mvts_cuves_identifiant` ON `Intermed_mvts_cuves` (`identifiant`);

-- Création de la table Intermed_mvts_prod
CREATE TABLE `Intermed_mvts_prod` (
    `date_debut` DATE NOT NULL,
    `date_fin` DATE NOT NULL,
    `solde_depart` INTEGER NOT NULL DEFAULT 0.000000,
    `total_quantite` INTEGER NOT NULL DEFAULT 0.000000,
    `valeur_mvts` DOUBLE NOT NULL DEFAULT 0,
    `identifiant` INTEGER NOT NULL DEFAULT 0,
    `id_pro` VARCHAR(50) NOT NULL DEFAULT '0',
    `produit` VARCHAR(50) NOT NULL,
    `id_four` SMALLINT NOT NULL DEFAULT 0,
    `fournisseur` VARCHAR(50) NOT NULL);
CREATE INDEX `WDIDX_Intermed_mvts_prod_identifiant` ON `Intermed_mvts_prod` (`identifiant`);

-- Création de la table INVENT
CREATE TABLE `INVENT` (
    `IDINVENT` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `DATE` DATE NOT NULL,
    `OPERATEUR` VARCHAR(100) NOT NULL,
    `CLOTURE` SMALLINT NOT NULL DEFAULT 0,
    `valeur_stock` DOUBLE NOT NULL DEFAULT 0,
    `DATECLOTURE` DATE NOT NULL);
CREATE INDEX `WDIDX_INVENT_DATE` ON `INVENT` (`DATE`);
CREATE INDEX `WDIDX_INVENT_CLOTURE` ON `INVENT` (`CLOTURE`);
CREATE INDEX `WDIDX_INVENT_DATECLOTURE` ON `INVENT` (`DATECLOTURE`);

-- Création de la table INVENTCAR
CREATE TABLE `INVENTCAR` (
    `IDINVENT` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `DATE` DATE NOT NULL,
    `OPERATEUR` VARCHAR(100) NOT NULL,
    `CLOTURE` SMALLINT NOT NULL DEFAULT 0,
    `valeur_stock` DOUBLE NOT NULL DEFAULT 0,
    `DATECLOTURE` DATE NOT NULL);
CREATE INDEX `WDIDX_INVENTCAR_DATE` ON `INVENTCAR` (`DATE`);
CREATE INDEX `WDIDX_INVENTCAR_CLOTURE` ON `INVENTCAR` (`CLOTURE`);
CREATE INDEX `WDIDX_INVENTCAR_DATECLOTURE` ON `INVENTCAR` (`DATECLOTURE`);

-- Création de la table Jaugeage
CREATE TABLE `Jaugeage` (
    `date` DATE NOT NULL,
    `IDCuve` INTEGER NOT NULL DEFAULT 0,
    `quantite` DOUBLE NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Jaugeage_date` ON `Jaugeage` (`date`);
CREATE INDEX `WDIDX_Jaugeage_IDCuve` ON `Jaugeage` (`IDCuve`);
CREATE UNIQUE INDEX `WDIDX_Jaugeage_dateIDCuve` ON `Jaugeage` (`date`,`IDCuve`);

-- Création de la table Jours_clotures
CREATE TABLE `Jours_clotures` (
    `date_jour` DATE NOT NULL,
    `fait` TINYINT NOT NULL DEFAULT 0,
    `IDEquipe` TINYINT NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Jours_clotures_date_jour` ON `Jours_clotures` (`date_jour`);
CREATE INDEX `WDIDX_Jours_clotures_IDEquipe` ON `Jours_clotures` (`IDEquipe`);
CREATE UNIQUE INDEX `WDIDX_Jours_clotures_date_jourIDEquipe` ON `Jours_clotures` (`date_jour`,`IDEquipe`);

-- Création de la table LIBRAS
CREATE TABLE `LIBRAS` (
    `CODERET` INTEGER UNIQUE DEFAULT 0,
    `LIBELLERET` VARCHAR(100) ,
    `TAUXRETENU` REAL DEFAULT 0,
    `COMPTECPT` VARCHAR(8) );

-- Création de la table MobVCar_caisse
CREATE TABLE `MobVCar_caisse` (
    `id_pompe` INTEGER NOT NULL DEFAULT 0,
    `id_caisse` INTEGER NOT NULL DEFAULT 0,
    `index_ouverture` DOUBLE NOT NULL DEFAULT 0,
    `id_vendeur` INTEGER NOT NULL DEFAULT 0,
    `index_fermeture` DOUBLE NOT NULL DEFAULT 0,
    `id_equipe` INTEGER NOT NULL DEFAULT 0,
    `date` DATE NOT NULL,
    `prix_vente` DOUBLE NOT NULL DEFAULT 0,
    `numvente` BIGINT NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_MobVCar_caisse_id_pompe` ON `MobVCar_caisse` (`id_pompe`);
CREATE INDEX `WDIDX_MobVCar_caisse_id_caisse` ON `MobVCar_caisse` (`id_caisse`);
CREATE INDEX `WDIDX_MobVCar_caisse_id_equipe` ON `MobVCar_caisse` (`id_equipe`);
CREATE INDEX `WDIDX_MobVCar_caisse_date` ON `MobVCar_caisse` (`date`);
CREATE INDEX `WDIDX_MobVCar_caisse_numvente` ON `MobVCar_caisse` (`numvente`);
CREATE INDEX `WDIDX_MobVCar_caisse_id_equipeid_caissedate` ON `MobVCar_caisse` (`id_equipe`,`id_caisse`,`date`);
CREATE INDEX `WDIDX_MobVCar_caisse_id_equipedate` ON `MobVCar_caisse` (`id_equipe`,`date`);

-- Création de la table Mode_payment
CREATE TABLE `Mode_payment` (
    `IDMode_payment` SMALLINT NOT NULL UNIQUE DEFAULT 0,
    `libelle_mode_payment` VARCHAR(50) NOT NULL,
    `code_famille` INTEGER NOT NULL DEFAULT 0,
    `AffichageAuto` TINYINT NOT NULL DEFAULT 0,
    `valeur` DOUBLE NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Mode_payment_code_famille` ON `Mode_payment` (`code_famille`);
CREATE INDEX `WDIDX_Mode_payment_AffichageAuto` ON `Mode_payment` (`AffichageAuto`);

-- Création de la table MVTBANQ
CREATE TABLE `MVTBANQ` (
    `NUMMVTBQ` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `DATE` DATE NOT NULL,
    `IDBanque` SMALLINT NOT NULL DEFAULT 0,
    `IDOperation_bancaire` INTEGER NOT NULL DEFAULT 0,
    `total` DOUBLE NOT NULL DEFAULT 0.000000,
    `IDMode` SMALLINT NOT NULL DEFAULT 0,
    `obj` VARCHAR(150) NOT NULL,
    `NUMCHEQ` VARCHAR(10) NOT NULL,
    `DateDebut` DATE NOT NULL,
    `DateFin` DATE NOT NULL);
CREATE INDEX `WDIDX_MVTBANQ_DATE` ON `MVTBANQ` (`DATE`);
CREATE INDEX `WDIDX_MVTBANQ_IDBanque` ON `MVTBANQ` (`IDBanque`);
CREATE INDEX `WDIDX_MVTBANQ_IDOperation_bancaire` ON `MVTBANQ` (`IDOperation_bancaire`);
CREATE INDEX `WDIDX_MVTBANQ_IDMode` ON `MVTBANQ` (`IDMode`);
CREATE INDEX `WDIDX_MVTBANQ_NUMCHEQ` ON `MVTBANQ` (`NUMCHEQ`);

-- Création de la table Operation_bancaire
CREATE TABLE `Operation_bancaire` (
    `IDOperation_bancaire` INTEGER NOT NULL DEFAULT 0,
    `libelle_op` VARCHAR(50) NOT NULL,
    `sens` TINYINT NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Operation_bancaire_IDOperation_bancaire` ON `Operation_bancaire` (`IDOperation_bancaire`);
CREATE INDEX `WDIDX_Operation_bancaire_sens` ON `Operation_bancaire` (`sens`);

-- Création de la table PAPENTETE
CREATE TABLE `PAPENTETE` (
    `ENTETEPAP` LONGTEXT NOT NULL,
    `BASPAP` LONGTEXT NOT NULL);

-- Création de la table Param
CREATE TABLE `Param` (
    `PACLEUNIK` INTEGER PRIMARY KEY NOT NULL AUTO_INCREMENT,
    `timbreFIS` REAL NOT NULL DEFAULT 0,
    `STATION` VARCHAR(25) NOT NULL,
    `CLOTURE` TINYINT NOT NULL DEFAULT 0,
    `NUMSTAT` SMALLINT NOT NULL DEFAULT 0,
    `REP_SHOP` VARCHAR(150) NOT NULL,
    `NONACTIF` TINYINT NOT NULL DEFAULT 0,
    `INDEXELOCTRONIC` TINYINT NOT NULL DEFAULT 0,
    `REPCOTAM` VARCHAR(150) NOT NULL,
    `NBRCUVECOMTAM` TINYINT NOT NULL DEFAULT 0,
    `SECTIONINDEX` VARCHAR(50) NOT NULL,
    `SECTIONJAUGE` VARCHAR(50) NOT NULL,
    `CODECHARGGAZ` VARCHAR(13) NOT NULL DEFAULT '0',
    `CODECONSIGAZ` VARCHAR(13) NOT NULL,
    `DERJOURNE` DATE NOT NULL,
    `DEREQUIPE` SMALLINT NOT NULL DEFAULT 0,
    `COMAVOIR` DOUBLE NOT NULL DEFAULT 0,
    `PWINDEX` VARCHAR(10) NOT NULL,
    `PWJOUR` VARCHAR(10) NOT NULL,
    `PCARWASH` TINYINT NOT NULL DEFAULT 0,
    `COMPTECPT` VARCHAR(8) NOT NULL,
    `rePCPT` VARCHAR(150) NOT NULL,
    `NUMJVENT` VARCHAR(150) NOT NULL,
    `NUMJACH` VARCHAR(150) NOT NULL,
    `COMPTIMBRE` VARCHAR(8) NOT NULL,
    `TVA1` REAL NOT NULL DEFAULT 0,
    `TVA2` REAL NOT NULL DEFAULT 0,
    `TVA3` REAL NOT NULL DEFAULT 0,
    `TVA4` REAL NOT NULL DEFAULT 0,
    `SAIVOL` TINYINT NOT NULL DEFAULT 0,
    `comptaHF` TINYINT NOT NULL DEFAULT 0,
    `srvcpt` VARCHAR(50) NOT NULL,
    `loginsrvcpt` VARCHAR(50) NOT NULL,
    `pwsrvcpt` VARCHAR(50) NOT NULL,
    `pwfilecpt` VARCHAR(50) NOT NULL,
    `NBRJOURPRELVEMENT` SMALLINT NOT NULL DEFAULT 0,
    `comService` REAL NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Param_CLOTURE` ON `Param` (`CLOTURE`);

-- Création de la table Pompe
CREATE TABLE `Pompe` (
    `IDPompe` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `lib_pompe` VARCHAR(50) NOT NULL,
    `sortie_pompe` DOUBLE NOT NULL DEFAULT 0.000000,
    `tva_pompe` REAL NOT NULL DEFAULT 0.000000,
    `marge_pompe` DOUBLE NOT NULL DEFAULT 0.000000,
    `ilot_pompe` VARCHAR(30) NOT NULL DEFAULT '0',
    `ordre_pompe` TINYINT NOT NULL DEFAULT 0,
    `prix_achat_ht` DOUBLE NOT NULL DEFAULT 0.000000,
    `prix_vente_ht` DOUBLE NOT NULL DEFAULT 0.000000,
    `melange` TINYINT NOT NULL DEFAULT 0,
    `id_caisse` INTEGER NOT NULL DEFAULT 0,
    `pv_ttc` DOUBLE NOT NULL DEFAULT 0,
    `pa_ttc` DOUBLE NOT NULL DEFAULT 0,
    `id_cuve` SMALLINT NOT NULL DEFAULT 0,
    `index_pompe` DOUBLE NOT NULL DEFAULT 0,
    `POMPCOTAM` VARCHAR(2) NOT NULL,
    `PISTOLECOTAM` VARCHAR(2) NOT NULL,
    `CAISSEGROUP` INTEGER NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Pompe_ilot_pompe` ON `Pompe` (`ilot_pompe`);
CREATE INDEX `WDIDX_Pompe_ordre_pompe` ON `Pompe` (`ordre_pompe`);
CREATE INDEX `WDIDX_Pompe_melange` ON `Pompe` (`melange`);
CREATE INDEX `WDIDX_Pompe_id_caisse` ON `Pompe` (`id_caisse`);
CREATE INDEX `WDIDX_Pompe_id_cuve` ON `Pompe` (`id_cuve`);
CREATE INDEX `WDIDX_Pompe_CAISSEGROUP` ON `Pompe` (`CAISSEGROUP`);

-- Création de la table Produit
CREATE TABLE `Produit` (
    `IDProduit` VARCHAR(13) NOT NULL UNIQUE DEFAULT '0',
    `lib_produit` VARCHAR(50) NOT NULL,
    `prixachat_ht` DOUBLE NOT NULL DEFAULT 0.000000,
    `prixavente_ht` DOUBLE NOT NULL DEFAULT 0.000000,
    `tva` SMALLINT NOT NULL DEFAULT 0.000000,
    `marge` DOUBLE NOT NULL DEFAULT 0.000000,
    `entree` INTEGER NOT NULL DEFAULT 0,
    `sortie` INTEGER NOT NULL DEFAULT 0,
    `retourne` INTEGER NOT NULL DEFAULT 0,
    `casse` INTEGER NOT NULL DEFAULT 0,
    `code_famille` TINYINT NOT NULL DEFAULT 0,
    `pv_ttc` DOUBLE NOT NULL DEFAULT 0.000000,
    `pa_ttc` DOUBLE NOT NULL DEFAULT 0.000000,
    `id_fournisseur` INTEGER NOT NULL DEFAULT 0,
    `entrre_mag` INTEGER NOT NULL DEFAULT 0,
    `sortie_mag` INTEGER NOT NULL DEFAULT 0,
    `retour_mag` INTEGER NOT NULL DEFAULT 0,
    `casse_mag` INTEGER NOT NULL DEFAULT 0,
    `emb` VARCHAR(20) NOT NULL,
    `stock` DOUBLE NOT NULL DEFAULT 0,
    `COMPTECPT` VARCHAR(8) NOT NULL);
CREATE INDEX `WDIDX_Produit_lib_produit` ON `Produit` (`lib_produit`);
CREATE INDEX `WDIDX_Produit_code_famille` ON `Produit` (`code_famille`);
CREATE INDEX `WDIDX_Produit_id_fournisseur` ON `Produit` (`id_fournisseur`);
CREATE INDEX `WDIDX_Produit_COMPTECPT` ON `Produit` (`COMPTECPT`);

-- Création de la table PROJET
CREATE TABLE `PROJET` (
    `IDPROJET` BIGINT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    `Nom` VARCHAR(40) NOT NULL UNIQUE,
    `RepSource` VARCHAR(1024) NOT NULL,
    `RepDest` VARCHAR(1024) NOT NULL,
    `MAJInverse` TINYINT NOT NULL,
    `SousRep` TINYINT NOT NULL,
    `CopieId` TINYINT NOT NULL,
    `FichiersException` VARCHAR(1024) NOT NULL,
    `RépertoiresException` VARCHAR(1024) NOT NULL);

-- Création de la table RapportMail
CREATE TABLE `RapportMail` (
    `IDRapportMail` BIGINT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    `date` DATE ,
    `NatureRapport` TINYINT DEFAULT 0,
    `Resultaenvoie` TINYINT DEFAULT 0);
CREATE INDEX `WDIDX_RapportMail_date` ON `RapportMail` (`date`);

-- Création de la table Recettes_caisse
CREATE TABLE `Recettes_caisse` (
    `date` DATE NOT NULL,
    `id_equipe` TINYINT NOT NULL DEFAULT 0,
    `id_caisse` TINYINT NOT NULL DEFAULT 0,
    `id_vendeur` INTEGER NOT NULL DEFAULT 0,
    `total_recettes` DOUBLE NOT NULL DEFAULT 0,
    `fait` TINYINT NOT NULL DEFAULT 0,
    `numrecette` INTEGER NOT NULL UNIQUE DEFAULT 0);
CREATE INDEX `WDIDX_Recettes_caisse_date` ON `Recettes_caisse` (`date`);
CREATE INDEX `WDIDX_Recettes_caisse_id_equipe` ON `Recettes_caisse` (`id_equipe`);
CREATE INDEX `WDIDX_Recettes_caisse_id_caisse` ON `Recettes_caisse` (`id_caisse`);
CREATE INDEX `WDIDX_Recettes_caisse_id_vendeur` ON `Recettes_caisse` (`id_vendeur`);
CREATE INDEX `WDIDX_Recettes_caisse_fait` ON `Recettes_caisse` (`fait`);
CREATE INDEX `WDIDX_Recettes_caisse_ID_recettes_caisse` ON `Recettes_caisse` (`date`,`id_equipe`,`id_caisse`);

-- Création de la table Reglement_caisse
CREATE TABLE `Reglement_caisse` (
    `date` DATE NOT NULL,
    `id_equipe` TINYINT NOT NULL DEFAULT 0,
    `id_caisse` TINYINT NOT NULL DEFAULT 0,
    `id_vendeur` INTEGER NOT NULL DEFAULT 0,
    `total_credits` DOUBLE NOT NULL DEFAULT 0.000000,
    `fait` TINYINT NOT NULL DEFAULT 0,
    `numreg` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `VALIDE` TINYINT NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Reglement_caisse_date` ON `Reglement_caisse` (`date`);
CREATE INDEX `WDIDX_Reglement_caisse_id_equipe` ON `Reglement_caisse` (`id_equipe`);
CREATE INDEX `WDIDX_Reglement_caisse_id_caisse` ON `Reglement_caisse` (`id_caisse`);
CREATE INDEX `WDIDX_Reglement_caisse_id_vendeur` ON `Reglement_caisse` (`id_vendeur`);
CREATE INDEX `WDIDX_Reglement_caisse_fait` ON `Reglement_caisse` (`fait`);
CREATE INDEX `WDIDX_Reglement_caisse_VALIDE` ON `Reglement_caisse` (`VALIDE`);
CREATE INDEX `WDIDX_Reglement_caisse_IDreglement_caisse` ON `Reglement_caisse` (`date`,`id_equipe`,`id_caisse`);

-- Création de la table Réglement_four
CREATE TABLE `Réglement_four` (
    `numregfour` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `idfour` INTEGER NOT NULL DEFAULT 0,
    `date` DATE NOT NULL,
    `montanttc` DOUBLE NOT NULL DEFAULT 0,
    `réglé` DOUBLE NOT NULL DEFAULT 0,
    `reste` DOUBLE NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Réglement_four_idfour` ON `Réglement_four` (`idfour`);
CREATE INDEX `WDIDX_Réglement_four_date` ON `Réglement_four` (`date`);

-- Création de la table Retour_cuve
CREATE TABLE `Retour_cuve` (
    `id_caisse` INTEGER NOT NULL DEFAULT 0,
    `date` DATE NOT NULL,
    `id_equipe` INTEGER NOT NULL DEFAULT 0,
    `id_vendeur` INTEGER NOT NULL DEFAULT 0,
    `valeur_totale` DOUBLE NOT NULL DEFAULT 0.000000,
    `numretour` INTEGER NOT NULL UNIQUE DEFAULT 0);
CREATE INDEX `WDIDX_Retour_cuve_id_caisse` ON `Retour_cuve` (`id_caisse`);
CREATE INDEX `WDIDX_Retour_cuve_date` ON `Retour_cuve` (`date`);
CREATE INDEX `WDIDX_Retour_cuve_id_equipe` ON `Retour_cuve` (`id_equipe`);
CREATE INDEX `WDIDX_Retour_cuve_id_vendeur` ON `Retour_cuve` (`id_vendeur`);
CREATE INDEX `WDIDX_Retour_cuve_IDretour_caisse` ON `Retour_cuve` (`date`,`id_equipe`,`id_caisse`);

-- Création de la table Service
CREATE TABLE `Service` (
    `IDService` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `lib_service` VARCHAR(50) NOT NULL,
    `vente` INTEGER NOT NULL DEFAULT 0.000000,
    `tva` SMALLINT NOT NULL DEFAULT 0,
    `prix_vente_ht` DOUBLE NOT NULL DEFAULT 0.000000,
    `pvttc` DOUBLE NOT NULL DEFAULT 0,
    `TCARWASH` TINYINT NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Service_TCARWASH` ON `Service` (`TCARWASH`);

-- Création de la table SOCIETE
CREATE TABLE `SOCIETE` (
    `CSOC` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `SOCIETE` VARCHAR(60) NOT NULL,
    `LIB1` VARCHAR(60) NOT NULL,
    `LIB2` VARCHAR(60) NOT NULL,
    `LIB3` VARCHAR(60) NOT NULL,
    `ADRESSE` VARCHAR(180) NOT NULL,
    `PAYS` VARCHAR(40) NOT NULL,
    `NOMCONTACT` VARCHAR(60) NOT NULL,
    `TEL` VARCHAR(20) NOT NULL,
    `FAX` VARCHAR(20) NOT NULL,
    `EMAIL` VARCHAR(60) NOT NULL,
    `VILLE` VARCHAR(30) NOT NULL,
    `CODEPOSTAL` VARCHAR(5) NOT NULL,
    `TELEX` VARCHAR(20) NOT NULL,
    `CODECNSS` VARCHAR(30) NOT NULL,
    `CODEFISC` VARCHAR(30) NOT NULL,
    `DOMBANQ` VARCHAR(50) NOT NULL,
    `REGCOMNUM` VARCHAR(50) NOT NULL,
    `CDOUANE` VARCHAR(50) NOT NULL,
    `TEL2` VARCHAR(20) NOT NULL,
    `CODEMAG` VARCHAR(50) NOT NULL,
    `ACTIVITE` VARCHAR(250) NOT NULL);
CREATE INDEX `WDIDX_SOCIETE_SOCIETE` ON `SOCIETE` (`SOCIETE`);
CREATE INDEX `WDIDX_SOCIETE_PAYS` ON `SOCIETE` (`PAYS`);
CREATE INDEX `WDIDX_SOCIETE_NOMCONTACT` ON `SOCIETE` (`NOMCONTACT`);
CREATE INDEX `WDIDX_SOCIETE_TEL` ON `SOCIETE` (`TEL`);
CREATE INDEX `WDIDX_SOCIETE_FAX` ON `SOCIETE` (`FAX`);
CREATE INDEX `WDIDX_SOCIETE_EMAIL` ON `SOCIETE` (`EMAIL`);
CREATE INDEX `WDIDX_SOCIETE_VILLE` ON `SOCIETE` (`VILLE`);
CREATE INDEX `WDIDX_SOCIETE_CODEPOSTAL` ON `SOCIETE` (`CODEPOSTAL`);
CREATE INDEX `WDIDX_SOCIETE_TELEX` ON `SOCIETE` (`TELEX`);
CREATE INDEX `WDIDX_SOCIETE_CODECNSS` ON `SOCIETE` (`CODECNSS`);
CREATE INDEX `WDIDX_SOCIETE_CODEFISC` ON `SOCIETE` (`CODEFISC`);
CREATE INDEX `WDIDX_SOCIETE_DOMBANQ` ON `SOCIETE` (`DOMBANQ`);
CREATE INDEX `WDIDX_SOCIETE_REGCOMNUM` ON `SOCIETE` (`REGCOMNUM`);
CREATE INDEX `WDIDX_SOCIETE_CODEMAG` ON `SOCIETE` (`CODEMAG`);

-- Création de la table Taux_tva
CREATE TABLE `Taux_tva` (
    `code_tva` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `taux_tva` REAL NOT NULL DEFAULT 0.000000,
    `COMPTECPT` VARCHAR(8) NOT NULL);
CREATE INDEX `WDIDX_Taux_tva_taux_tva` ON `Taux_tva` (`taux_tva`);
CREATE INDEX `WDIDX_Taux_tva_COMPTECPT` ON `Taux_tva` (`COMPTECPT`);

-- Création de la table TPE
CREATE TABLE `TPE` (
    `IDBons_station` INTEGER NOT NULL DEFAULT 0,
    `num_bord` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `date` DATE NOT NULL,
    `montant` DOUBLE NOT NULL DEFAULT 0,
    `num_facture` INTEGER NOT NULL DEFAULT 0,
    `date_renvoi` DATE NOT NULL,
    `fait` TINYINT NOT NULL DEFAULT 0,
    `Montantavoir` DOUBLE NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_TPE_IDBons_station` ON `TPE` (`IDBons_station`);
CREATE INDEX `WDIDX_TPE_date` ON `TPE` (`date`);
CREATE INDEX `WDIDX_TPE_num_facture` ON `TPE` (`num_facture`);
CREATE INDEX `WDIDX_TPE_date_renvoi` ON `TPE` (`date_renvoi`);
CREATE INDEX `WDIDX_TPE_fait` ON `TPE` (`fait`);

-- Création de la table transfert_etranger
CREATE TABLE `transfert_etranger` (
    `id_fournisseur` INTEGER NOT NULL DEFAULT 0,
    `date_achat` DATE NOT NULL,
    `num_piece` INTEGER NOT NULL DEFAULT 0,
    `total_ttc` DOUBLE NOT NULL DEFAULT 0.000000,
    `date_piece` DATE NOT NULL,
    `IDtransfert` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `op` TINYINT NOT NULL DEFAULT 0,
    `numtransfert` INTEGER NOT NULL DEFAULT 0,
    `cONF` TINYINT NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_transfert_etranger_id_fournisseur` ON `transfert_etranger` (`id_fournisseur`);
CREATE INDEX `WDIDX_transfert_etranger_date_achat` ON `transfert_etranger` (`date_achat`);
CREATE INDEX `WDIDX_transfert_etranger_num_piece` ON `transfert_etranger` (`num_piece`);
CREATE INDEX `WDIDX_transfert_etranger_date_piece` ON `transfert_etranger` (`date_piece`);
CREATE INDEX `WDIDX_transfert_etranger_op` ON `transfert_etranger` (`op`);
CREATE INDEX `WDIDX_transfert_etranger_numtransfert` ON `transfert_etranger` (`numtransfert`);

-- Création de la table Vehicule
CREATE TABLE `Vehicule` (
    `matricule` VARCHAR(50) NOT NULL UNIQUE,
    `IDClient` INTEGER NOT NULL DEFAULT 0,
    `Datecirculation` DATE NOT NULL,
    `Datederniervisite` DATE NOT NULL,
    `dateprochienvisite` DATE NOT NULL,
    `indexkm` BIGINT NOT NULL DEFAULT 0,
    `moykmjour` INTEGER NOT NULL DEFAULT 0,
    `KM_Vidange` INTEGER NOT NULL DEFAULT 0,
    `IDEXKMPROCHIN` BIGINT NOT NULL DEFAULT 0,
    `Numdernent` INTEGER NOT NULL DEFAULT 0,
    `MArque` VARCHAR(50) NOT NULL,
    `fait` TINYINT NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Vehicule_IDClient` ON `Vehicule` (`IDClient`);
CREATE INDEX `WDIDX_Vehicule_Datecirculation` ON `Vehicule` (`Datecirculation`);
CREATE INDEX `WDIDX_Vehicule_Datederniervisite` ON `Vehicule` (`Datederniervisite`);
CREATE INDEX `WDIDX_Vehicule_dateprochienvisite` ON `Vehicule` (`dateprochienvisite`);
CREATE INDEX `WDIDX_Vehicule_KM_Vidange` ON `Vehicule` (`KM_Vidange`);
CREATE INDEX `WDIDX_Vehicule_Numdernent` ON `Vehicule` (`Numdernent`);
CREATE INDEX `WDIDX_Vehicule_fait` ON `Vehicule` (`fait`);

-- Création de la table Vendeur
CREATE TABLE `Vendeur` (
    `IDVendeur` INTEGER NOT NULL UNIQUE DEFAULT 0,
    `nom_vendeur` VARCHAR(50) NOT NULL,
    `autres_infos` VARCHAR(100) NOT NULL,
    `matricule` VARCHAR(50) NOT NULL,
    `telephone` BIGINT NOT NULL DEFAULT 0,
    `adresse` VARCHAR(50) NOT NULL,
    `ville` VARCHAR(50) NOT NULL,
    `code_postal` VARCHAR(20) NOT NULL,
    `IDEquipe` SMALLINT NOT NULL,
    `MotDePasse` VARCHAR(50) NOT NULL);
CREATE INDEX `WDIDX_Vendeur_nom_vendeur` ON `Vendeur` (`nom_vendeur`);
CREATE INDEX `WDIDX_Vendeur_matricule` ON `Vendeur` (`matricule`);
CREATE INDEX `WDIDX_Vendeur_IDEquipe` ON `Vendeur` (`IDEquipe`);

-- Création de la table Vente_car_caisse
CREATE TABLE `Vente_car_caisse` (
    `id_pompe` INTEGER NOT NULL DEFAULT 0,
    `id_caisse` INTEGER NOT NULL DEFAULT 0,
    `id_cuve` INTEGER NOT NULL DEFAULT 0,
    `index_ouverture` DOUBLE NOT NULL DEFAULT 0,
    `id_vendeur` INTEGER NOT NULL DEFAULT 0,
    `index_fermeture` DOUBLE NOT NULL DEFAULT 0,
    `prix_achat` DOUBLE NOT NULL DEFAULT 0,
    `id_equipe` INTEGER NOT NULL DEFAULT 0,
    `date` DATE NOT NULL,
    `prix_vente` DOUBLE NOT NULL DEFAULT 0,
    `volume_entree` DOUBLE NOT NULL DEFAULT 0,
    `volume_sortie` DOUBLE NOT NULL DEFAULT 0,
    `tva` SMALLINT NOT NULL DEFAULT 0,
    `ttc_achat_pompe` DOUBLE NOT NULL DEFAULT 0.000000,
    `PX_vente_TTC` DOUBLE NOT NULL DEFAULT 0.000000,
    `TOTTTC_pompe` DOUBLE NOT NULL DEFAULT 0.000000,
    `numvente` BIGINT NOT NULL DEFAULT 0,
    `VALIDE` TINYINT NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Vente_car_caisse_id_pompe` ON `Vente_car_caisse` (`id_pompe`);
CREATE INDEX `WDIDX_Vente_car_caisse_id_caisse` ON `Vente_car_caisse` (`id_caisse`);
CREATE INDEX `WDIDX_Vente_car_caisse_id_cuve` ON `Vente_car_caisse` (`id_cuve`);
CREATE INDEX `WDIDX_Vente_car_caisse_id_vendeur` ON `Vente_car_caisse` (`id_vendeur`);
CREATE INDEX `WDIDX_Vente_car_caisse_id_equipe` ON `Vente_car_caisse` (`id_equipe`);
CREATE INDEX `WDIDX_Vente_car_caisse_date` ON `Vente_car_caisse` (`date`);
CREATE INDEX `WDIDX_Vente_car_caisse_numvente` ON `Vente_car_caisse` (`numvente`);
CREATE INDEX `WDIDX_Vente_car_caisse_VALIDE` ON `Vente_car_caisse` (`VALIDE`);
CREATE INDEX `WDIDX_Vente_car_caisse_id_vente_carburant` ON `Vente_car_caisse` (`date`,`id_equipe`,`id_caisse`,`id_pompe`);
CREATE INDEX `WDIDX_Vente_car_caisse_idvente` ON `Vente_car_caisse` (`date`,`id_equipe`,`id_caisse`);

-- Création de la table Vente_car_prod_ser
CREATE TABLE `Vente_car_prod_ser` (
    `id_caisse` INTEGER NOT NULL DEFAULT 0,
    `date` DATE NOT NULL,
    `fait` TINYINT NOT NULL DEFAULT 0,
    `id_equipe` INTEGER NOT NULL DEFAULT 0,
    `id_vendeur` INTEGER NOT NULL DEFAULT 0,
    `type_mouvement` TINYINT NOT NULL DEFAULT 0,
    `total_vente_caisse` DOUBLE NOT NULL DEFAULT 0.000000,
    `total_achat_caisse` DOUBLE NOT NULL DEFAULT 0.000000,
    `operation` TINYINT NOT NULL DEFAULT 0,
    `numvente` BIGINT NOT NULL UNIQUE DEFAULT 0);
CREATE INDEX `WDIDX_Vente_car_prod_ser_id_caisse` ON `Vente_car_prod_ser` (`id_caisse`);
CREATE INDEX `WDIDX_Vente_car_prod_ser_date` ON `Vente_car_prod_ser` (`date`);
CREATE INDEX `WDIDX_Vente_car_prod_ser_fait` ON `Vente_car_prod_ser` (`fait`);
CREATE INDEX `WDIDX_Vente_car_prod_ser_id_equipe` ON `Vente_car_prod_ser` (`id_equipe`);
CREATE INDEX `WDIDX_Vente_car_prod_ser_id_vendeur` ON `Vente_car_prod_ser` (`id_vendeur`);
CREATE INDEX `WDIDX_Vente_car_prod_ser_type_mouvement` ON `Vente_car_prod_ser` (`type_mouvement`);
CREATE INDEX `WDIDX_Vente_car_prod_ser_operation` ON `Vente_car_prod_ser` (`operation`);
CREATE UNIQUE INDEX `WDIDX_Vente_car_prod_ser_idvente` ON `Vente_car_prod_ser` (`date`,`id_equipe`,`id_caisse`,`operation`);

-- Création de la table Vente_prod_caisse
CREATE TABLE `Vente_prod_caisse` (
    `id_produit` VARCHAR(13) NOT NULL DEFAULT '0',
    `id_fournisseur` INTEGER NOT NULL DEFAULT 0,
    `prix_achat_ht` DOUBLE NOT NULL DEFAULT 0.000000,
    `prix_vente_ht` DOUBLE NOT NULL DEFAULT 0.000000,
    `quantite` INTEGER NOT NULL DEFAULT 0.000000,
    `tva` SMALLINT NOT NULL DEFAULT 0,
    `ttc_achat_prod` DOUBLE NOT NULL DEFAULT 0.000000,
    `ttc_vente_prod` DOUBLE NOT NULL DEFAULT 0.000000,
    `lib_produit` VARCHAR(50) NOT NULL,
    `marge` DOUBLE NOT NULL DEFAULT 0.000000,
    `PXV_TTC` DOUBLE NOT NULL DEFAULT 0.000000,
    `code_famille` TINYINT NOT NULL DEFAULT 0,
    `PXA_TTC` DOUBLE NOT NULL DEFAULT 0,
    `date` DATE NOT NULL,
    `id_equipe` TINYINT NOT NULL DEFAULT 0,
    `id_caisse` TINYINT NOT NULL DEFAULT 0,
    `numvente` BIGINT NOT NULL DEFAULT 0,
    `VALIDE` TINYINT NOT NULL DEFAULT 0,
    `id_vendeur` INTEGER NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Vente_prod_caisse_id_produit` ON `Vente_prod_caisse` (`id_produit`);
CREATE INDEX `WDIDX_Vente_prod_caisse_id_fournisseur` ON `Vente_prod_caisse` (`id_fournisseur`);
CREATE INDEX `WDIDX_Vente_prod_caisse_code_famille` ON `Vente_prod_caisse` (`code_famille`);
CREATE INDEX `WDIDX_Vente_prod_caisse_date` ON `Vente_prod_caisse` (`date`);
CREATE INDEX `WDIDX_Vente_prod_caisse_id_equipe` ON `Vente_prod_caisse` (`id_equipe`);
CREATE INDEX `WDIDX_Vente_prod_caisse_id_caisse` ON `Vente_prod_caisse` (`id_caisse`);
CREATE INDEX `WDIDX_Vente_prod_caisse_numvente` ON `Vente_prod_caisse` (`numvente`);
CREATE INDEX `WDIDX_Vente_prod_caisse_VALIDE` ON `Vente_prod_caisse` (`VALIDE`);
CREATE INDEX `WDIDX_Vente_prod_caisse_id_vendeur` ON `Vente_prod_caisse` (`id_vendeur`);
CREATE INDEX `WDIDX_Vente_prod_caisse_Idvente` ON `Vente_prod_caisse` (`date`,`id_equipe`,`id_caisse`);
CREATE INDEX `WDIDX_Vente_prod_caisse_id_vente_produit` ON `Vente_prod_caisse` (`date`,`id_equipe`,`id_caisse`,`id_produit`);

-- Création de la table Vente_ser_caisse
CREATE TABLE `Vente_ser_caisse` (
    `id_service` INTEGER NOT NULL DEFAULT 0,
    `prix_vente_ht` DOUBLE NOT NULL DEFAULT 0.000000,
    `quantite` INTEGER NOT NULL DEFAULT 0.000000,
    `tva` SMALLINT NOT NULL DEFAULT 0,
    `ttc_vente_prod` DOUBLE NOT NULL DEFAULT 0.000000,
    `lib_service` VARCHAR(50) NOT NULL,
    `PXV_TTC` DOUBLE NOT NULL DEFAULT 0.000000,
    `date` DATE NOT NULL,
    `id_equipe` TINYINT NOT NULL DEFAULT 0,
    `id_caisse` TINYINT NOT NULL DEFAULT 0,
    `numvente` BIGINT NOT NULL DEFAULT 0,
    `VALIDE` TINYINT NOT NULL DEFAULT 0,
    `IDVendeur` INTEGER NOT NULL DEFAULT 0);
CREATE INDEX `WDIDX_Vente_ser_caisse_id_service` ON `Vente_ser_caisse` (`id_service`);
CREATE INDEX `WDIDX_Vente_ser_caisse_date` ON `Vente_ser_caisse` (`date`);
CREATE INDEX `WDIDX_Vente_ser_caisse_id_equipe` ON `Vente_ser_caisse` (`id_equipe`);
CREATE INDEX `WDIDX_Vente_ser_caisse_id_caisse` ON `Vente_ser_caisse` (`id_caisse`);
CREATE INDEX `WDIDX_Vente_ser_caisse_numvente` ON `Vente_ser_caisse` (`numvente`);
CREATE INDEX `WDIDX_Vente_ser_caisse_VALIDE` ON `Vente_ser_caisse` (`VALIDE`);
CREATE INDEX `WDIDX_Vente_ser_caisse_IDVendeur` ON `Vente_ser_caisse` (`IDVendeur`);
CREATE INDEX `WDIDX_Vente_ser_caisse_idvente` ON `Vente_ser_caisse` (`date`,`id_equipe`,`id_caisse`);
CREATE INDEX `WDIDX_Vente_ser_caisse_id_vente_service` ON `Vente_ser_caisse` (`date`,`id_equipe`,`id_caisse`,`id_service`);
-- Contraintes d'intégrité
ALTER TABLE `Detail_achat_essence` ADD FOREIGN KEY (`id_achat_ess`) REFERENCES `Achat_essence` (`IDAchat_essence`);
ALTER TABLE `Detail_achat_prod` ADD FOREIGN KEY (`ID_Achat_produits`) REFERENCES `Achat_prod` (`IDAchat_prod`);
ALTER TABLE `Mode_payment` ADD FOREIGN KEY (`code_famille`) REFERENCES `Famille_payment` (`code_famille`);
ALTER TABLE `Produit` ADD FOREIGN KEY (`id_fournisseur`) REFERENCES `Fournisseur` (`IDFournisseur`);
ALTER TABLE `Pompe` ADD FOREIGN KEY (`id_cuve`) REFERENCES `Cuve` (`IDCuve`);
ALTER TABLE `Vendeur` ADD FOREIGN KEY (`IDEquipe`) REFERENCES `Equipe` (`IDEquipe`);
ALTER TABLE `Detail_recette_caisse` ADD FOREIGN KEY (`numrecette`) REFERENCES `Recettes_caisse` (`numrecette`);
ALTER TABLE `Detail_credit` ADD FOREIGN KEY (`numcredit`) REFERENCES `Credit_caisse` (`numcredit`);
ALTER TABLE `Detail_reglements` ADD FOREIGN KEY (`numreg`) REFERENCES `Reglement_caisse` (`numreg`);
ALTER TABLE `Detail_depenses` ADD FOREIGN KEY (`numdepense`) REFERENCES `Depenses_caisse` (`numdepense`);
ALTER TABLE `Detail_retour` ADD FOREIGN KEY (`numretour`) REFERENCES `Retour_cuve` (`numretour`) ON DELETE CASCADE;
ALTER TABLE `Detaille_reg_four` ADD FOREIGN KEY (`numregfour`) REFERENCES `Réglement_four` (`numregfour`);
ALTER TABLE `DETMVTBQ` ADD FOREIGN KEY (`NUMMVTBQ`) REFERENCES `MVTBANQ` (`NUMMVTBQ`) ON DELETE CASCADE;
ALTER TABLE `Detbonliv` ADD FOREIGN KEY (`NUMBL`) REFERENCES `Bonliv` (`NUMBL`) ON DELETE CASCADE;
ALTER TABLE `detfact` ADD FOREIGN KEY (`NUMFACT`) REFERENCES `facture` (`NUMFACT`) ON DELETE CASCADE;
ALTER TABLE `Dettrans_etranger` ADD FOREIGN KEY (`IDtransfert`) REFERENCES `transfert_etranger` (`IDtransfert`);
ALTER TABLE `DETINVENT` ADD FOREIGN KEY (`IDINVENT`) REFERENCES `INVENT` (`IDINVENT`) ON DELETE CASCADE;
ALTER TABLE `DETINVENTCAR` ADD FOREIGN KEY (`IDINVENT`) REFERENCES `INVENTCAR` (`IDINVENT`) ON DELETE CASCADE;
ALTER TABLE `Detentretien` ADD FOREIGN KEY (`Nument`) REFERENCES `Entretien` (`Nument`) ON DELETE CASCADE;
