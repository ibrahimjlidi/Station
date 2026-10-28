-- Demo reference data for a fresh Station database.
-- Reruns only update these DEMO-coded rows; no users or transactions are created.

INSERT INTO `Station` (`code`, `nom`, `active`, `createdAt`, `updatedAt`)
VALUES ('EL-AMAL-DEMO', 'Station El Amal (demo)', TRUE, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `nom` = VALUES(`nom`), `active` = TRUE, `updatedAt` = NOW(3);

SET @station_id = (SELECT `id` FROM `Station` WHERE `code` = 'EL-AMAL-DEMO');

INSERT INTO `Magasin` (`stationId`, `code`, `nom`, `active`, `createdAt`, `updatedAt`)
VALUES (@station_id, 'MAG-DEMO', 'Magasin principal (demo)', TRUE, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `nom` = VALUES(`nom`), `active` = TRUE, `updatedAt` = NOW(3);

SET @magasin_id = (SELECT `id` FROM `Magasin` WHERE `stationId` = @station_id);

INSERT INTO `SetParam`
  (`id`, `stationId`, `nomStation`, `adresse`, `tel`, `devise`, `tauxTVADefaut`, `timbre`, `createdAt`, `updatedAt`)
SELECT 1, @station_id, 'Station El Amal (demo)', 'Adresse de demonstration', NULL, 'TND', 19, 0.6, NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `SetParam` WHERE `id` = 1)
  AND NOT EXISTS (SELECT 1 FROM `SetParam` WHERE `stationId` = @station_id);

INSERT IGNORE INTO `Compteur` (`id`, `updatedAt`) VALUES (1, NOW(3));

INSERT INTO `Equipe` (`magasinId`, `code`, `libelle`, `actif`, `createdAt`, `updatedAt`)
VALUES
  (@magasin_id, 'DEMO-MATIN', 'Matin (demo)', TRUE, NOW(3), NOW(3)),
  (@magasin_id, 'DEMO-SOIR', 'Soir (demo)', TRUE, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `libelle` = VALUES(`libelle`), `magasinId` = VALUES(`magasinId`), `actif` = TRUE, `updatedAt` = NOW(3);

SET @equipe_id = (SELECT `id` FROM `Equipe` WHERE `code` = 'DEMO-MATIN');

INSERT INTO `Caisse` (`magasinId`, `code`, `libelle`, `actif`, `createdAt`, `updatedAt`)
VALUES (@magasin_id, 'DEMO-CAISSE', 'Caisse principale (demo)', TRUE, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `libelle` = VALUES(`libelle`), `magasinId` = VALUES(`magasinId`), `actif` = TRUE, `updatedAt` = NOW(3);

INSERT INTO `Vendeur` (`magasinId`, `equipeId`, `matricule`, `nom`, `actif`, `createdAt`, `updatedAt`)
VALUES (@magasin_id, @equipe_id, 'DEMO-VENDEUR', 'Vendeur exemple', TRUE, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `nom` = VALUES(`nom`), `magasinId` = VALUES(`magasinId`), `equipeId` = VALUES(`equipeId`), `actif` = TRUE, `updatedAt` = NOW(3);

INSERT INTO `Fournisseur` (`code`, `raisonSociale`, `matriculeFiscal`, `telephone`, `adresse`, `createdAt`, `updatedAt`)
VALUES ('DEMO-FOURN', 'Fournisseur exemple', NULL, NULL, 'Fournisseur de demonstration', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `raisonSociale` = VALUES(`raisonSociale`), `updatedAt` = NOW(3);

INSERT INTO `Cuve`
  (`magasinId`, `code`, `libelle`, `carburant`, `volumeTotal`, `stockInitial`, `stock`, `prixAchatHT`, `seuilAlerte`, `createdAt`, `updatedAt`)
VALUES
  (@magasin_id, 'DEMO-SP95', 'Cuve SP95 (demo)', 'Sans Plomb 95', 30000, 12000, 12000, 0, 3000, NOW(3), NOW(3)),
  (@magasin_id, 'DEMO-GASOIL', 'Cuve Gasoil (demo)', 'Gasoil', 50000, 20000, 20000, 0, 5000, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `libelle` = VALUES(`libelle`), `magasinId` = VALUES(`magasinId`), `updatedAt` = NOW(3);

SET @cuve_sp95_id = (SELECT `id` FROM `Cuve` WHERE `code` = 'DEMO-SP95');
SET @cuve_gasoil_id = (SELECT `id` FROM `Cuve` WHERE `code` = 'DEMO-GASOIL');
SET @caisse_id = (SELECT `id` FROM `Caisse` WHERE `code` = 'DEMO-CAISSE');

INSERT INTO `Pompe` (`magasinId`, `caisseId`, `code`, `libelle`, `active`, `prixVente`, `cuveId`, `createdAt`, `updatedAt`)
VALUES
  (@magasin_id, @caisse_id, 'DEMO-P1', 'Pompe SP95 (demo)', TRUE, 0, @cuve_sp95_id, NOW(3), NOW(3)),
  (@magasin_id, @caisse_id, 'DEMO-P2', 'Pompe Gasoil (demo)', TRUE, 0, @cuve_gasoil_id, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `libelle` = VALUES(`libelle`), `cuveId` = VALUES(`cuveId`), `magasinId` = VALUES(`magasinId`), `caisseId` = VALUES(`caisseId`), `updatedAt` = NOW(3);

INSERT INTO `FamillePayment` (`libFamille`, `compteCPT`, `createdAt`, `updatedAt`)
SELECT 'Demo - especes', '531000', NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `FamillePayment` WHERE `libFamille` = 'Demo - especes');

INSERT INTO `ModePayment` (`libelle`, `famille`, `compteCPT`, `createdAt`, `updatedAt`)
SELECT 'Especes (demo)', '1', '531000', NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `ModePayment` WHERE `libelle` = 'Especes (demo)');

INSERT INTO `FamilleProduit` (`libelle`, `typeProd`, `compteCPT`, `compteACH`, `createdAt`, `updatedAt`)
SELECT 'Demo - lubrifiants', 'Boutique', '707100', '607100', NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `FamilleProduit` WHERE `libelle` = 'Demo - lubrifiants');

SET @famille_produit_id = (SELECT `id` FROM `FamilleProduit` WHERE `libelle` = 'Demo - lubrifiants' ORDER BY `id` LIMIT 1);
SET @fournisseur_id = (SELECT `id` FROM `Fournisseur` WHERE `code` = 'DEMO-FOURN');

INSERT INTO `Produit`
  (`code`, `codeProduit`, `libelle`, `prixVenteHT`, `tva`, `actif`, `familleId`, `fournisseurId`, `prixAchatHT`, `stock`, `tauxTVA`, `createdAt`, `updatedAt`)
VALUES
  ('DEMO-HUILE', 'DEMO-HUILE', 'Huile moteur exemple', 20, 19, TRUE, @famille_produit_id, @fournisseur_id, 15, 10, 19, NOW(3), NOW(3)),
  ('DEMO-LIQUIDE', 'DEMO-LIQUIDE', 'Liquide lave-glace exemple', 8, 19, TRUE, @famille_produit_id, @fournisseur_id, 5, 15, 19, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `libelle` = VALUES(`libelle`),
  `familleId` = VALUES(`familleId`),
  `fournisseurId` = VALUES(`fournisseurId`),
  `updatedAt` = NOW(3);

INSERT INTO `Client` (`nomClient`, `adresse`, `telephone`, `MF`, `quota`, `soldeAnterieur`, `tva`, `createdAt`, `updatedAt`)
SELECT 'Client exemple (demo)', 'Adresse de demonstration', NULL, NULL, 0, 0, 19, NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `Client` WHERE `nomClient` = 'Client exemple (demo)');

INSERT INTO `TauxTVA` (`taux`, `libelle`, `actif`, `createdAt`, `updatedAt`)
SELECT 19, 'TVA 19% (demo)', TRUE, NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `TauxTVA` WHERE `libelle` = 'TVA 19% (demo)');
