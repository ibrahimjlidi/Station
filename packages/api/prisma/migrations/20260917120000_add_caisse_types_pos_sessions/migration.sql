ALTER TABLE `Caisse`
  ADD COLUMN `type` ENUM('POS', 'PISTE') NOT NULL DEFAULT 'PISTE';

ALTER TABLE `MobVCarCaisse`
  ADD COLUMN `recetteCaisseId` INTEGER NULL;

CREATE INDEX `MobVCarCaisse_recetteCaisseId_pompeId_idx` ON `MobVCarCaisse` (`recetteCaisseId`, `pompeId`);

ALTER TABLE `MobVCarCaisse`
  ADD CONSTRAINT `MobVCarCaisse_recetteCaisseId_fkey`
    FOREIGN KEY (`recetteCaisseId`) REFERENCES `RecetteCaisse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ModePayment`
  ADD COLUMN `famillePaymentId` INTEGER NULL;

CREATE INDEX `ModePayment_famillePaymentId_idx` ON `ModePayment` (`famillePaymentId`);

ALTER TABLE `ModePayment`
  ADD CONSTRAINT `ModePayment_famillePaymentId_fkey`
    FOREIGN KEY (`famillePaymentId`) REFERENCES `FamillePayment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `POSTicket` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `caisseId` INTEGER NOT NULL,
  `equipeId` INTEGER NOT NULL,
  `vendeurId` INTEGER NOT NULL,
  `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `totalHT` DECIMAL(15, 3) NOT NULL,
  `totalTTC` DECIMAL(15, 3) NOT NULL,
  `remise` DECIMAL(15, 3) NOT NULL DEFAULT 0,
  `statut` VARCHAR(20) NOT NULL DEFAULT 'VALIDE',
  INDEX `POSTicket_caisseId_date_idx` (`caisseId`, `date`),
  INDEX `POSTicket_equipeId_date_idx` (`equipeId`, `date`),
  PRIMARY KEY (`id`),
  CONSTRAINT `POSTicket_caisseId_fkey` FOREIGN KEY (`caisseId`) REFERENCES `Caisse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `POSTicket_equipeId_fkey` FOREIGN KEY (`equipeId`) REFERENCES `Equipe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `POSTicket_vendeurId_fkey` FOREIGN KEY (`vendeurId`) REFERENCES `Vendeur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `POSTicketLine` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `ticketId` INTEGER NOT NULL,
  `produitId` INTEGER NOT NULL,
  `quantite` DECIMAL(15, 3) NOT NULL,
  `prixUnitaire` DECIMAL(15, 3) NOT NULL,
  `remise` DECIMAL(15, 3) NOT NULL DEFAULT 0,
  `total` DECIMAL(15, 3) NOT NULL,
  INDEX `POSTicketLine_ticketId_idx` (`ticketId`),
  INDEX `POSTicketLine_produitId_idx` (`produitId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `POSTicketLine_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `POSTicket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `POSTicketLine_produitId_fkey` FOREIGN KEY (`produitId`) REFERENCES `Produit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `POSTicketPayment` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `ticketId` INTEGER NOT NULL,
  `modePaymentId` INTEGER NOT NULL,
  `montant` DECIMAL(15, 3) NOT NULL,
  INDEX `POSTicketPayment_ticketId_idx` (`ticketId`),
  INDEX `POSTicketPayment_modePaymentId_idx` (`modePaymentId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `POSTicketPayment_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `POSTicket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `POSTicketPayment_modePaymentId_fkey` FOREIGN KEY (`modePaymentId`) REFERENCES `ModePayment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Promotion` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `libelle` VARCHAR(160) NOT NULL,
  `dateDebut` DATE NOT NULL,
  `dateFin` DATE NOT NULL,
  `remise` DECIMAL(15, 3) NOT NULL DEFAULT 0,
  `actif` BOOLEAN NOT NULL DEFAULT true,
  INDEX `Promotion_dateDebut_dateFin_actif_idx` (`dateDebut`, `dateFin`, `actif`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PromotionProduit` (
  `promotionId` INTEGER NOT NULL,
  `produitId` INTEGER NOT NULL,
  INDEX `PromotionProduit_produitId_idx` (`produitId`),
  PRIMARY KEY (`promotionId`, `produitId`),
  CONSTRAINT `PromotionProduit_promotionId_fkey` FOREIGN KEY (`promotionId`) REFERENCES `Promotion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PromotionProduit_produitId_fkey` FOREIGN KEY (`produitId`) REFERENCES `Produit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RetourProduit` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `ticketId` INTEGER NOT NULL,
  `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `totalTTC` DECIMAL(15, 3) NOT NULL,
  `statut` VARCHAR(20) NOT NULL DEFAULT 'VALIDE',
  INDEX `RetourProduit_ticketId_date_idx` (`ticketId`, `date`),
  PRIMARY KEY (`id`),
  CONSTRAINT `RetourProduit_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `POSTicket`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RetourProduitLine` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `retourId` INTEGER NOT NULL,
  `ticketLineId` INTEGER NOT NULL,
  `quantite` DECIMAL(15, 3) NOT NULL,
  `montant` DECIMAL(15, 3) NOT NULL,
  INDEX `RetourProduitLine_retourId_idx` (`retourId`),
  INDEX `RetourProduitLine_ticketLineId_idx` (`ticketLineId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `RetourProduitLine_retourId_fkey` FOREIGN KEY (`retourId`) REFERENCES `RetourProduit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RetourProduitLine_ticketLineId_fkey` FOREIGN KEY (`ticketLineId`) REFERENCES `POSTicketLine`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;