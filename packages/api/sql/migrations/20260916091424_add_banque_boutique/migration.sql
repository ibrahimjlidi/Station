/*
  Warnings:

  - A unique constraint covering the columns `[codeProduit]` on the table `Produit` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `produit` ADD COLUMN `codeProduit` VARCHAR(40) NULL,
    ADD COLUMN `familleId` INTEGER NULL,
    ADD COLUMN `fournisseurId` INTEGER NULL,
    ADD COLUMN `prixAchatHT` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    ADD COLUMN `stock` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    ADD COLUMN `tauxTVA` DECIMAL(15, 3) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `Banque` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `libelle` VARCHAR(120) NOT NULL,
    `tel` VARCHAR(30) NULL,
    `rib` VARCHAR(80) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Banque_libelle_idx`(`libelle`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetMvtBq` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numMvtBq` INTEGER NULL,
    `numLigne` INTEGER NOT NULL DEFAULT 1,
    `modePaymentId` INTEGER NOT NULL,
    `dateEcheance` DATE NULL,
    `montant` DECIMAL(15, 3) NOT NULL,
    `date` DATE NOT NULL,
    `banqueId` INTEGER NOT NULL,
    `rapproche` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DetMvtBq_banqueId_date_idx`(`banqueId`, `date`),
    INDEX `DetMvtBq_modePaymentId_date_idx`(`modePaymentId`, `date`),
    INDEX `DetMvtBq_rapproche_date_idx`(`rapproche`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AgeoCompteMode` (
    `banqueId` INTEGER NOT NULL,
    `modePaymentId` INTEGER NOT NULL,
    `tauxCommission` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `nbrJoursCompensation` INTEGER NOT NULL DEFAULT 0,
    `tvaCom` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AgeoCompteMode_modePaymentId_idx`(`modePaymentId`),
    PRIMARY KEY (`banqueId`, `modePaymentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FamillePayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `libFamille` VARCHAR(100) NOT NULL,
    `compteCPT` VARCHAR(40) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FamillePayment_libFamille_idx`(`libFamille`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FamilleProduit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `libelle` VARCHAR(120) NOT NULL,
    `cumulOuiNon` BOOLEAN NOT NULL DEFAULT false,
    `typeProd` VARCHAR(60) NULL,
    `compteCPT` VARCHAR(40) NULL,
    `compteACH` VARCHAR(40) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FamilleProduit_libelle_idx`(`libelle`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AchatProd` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fournisseurId` INTEGER NOT NULL,
    `dateAchat` DATE NOT NULL,
    `numFacture` VARCHAR(80) NULL,
    `dateFacture` DATE NULL,
    `totalTTC` DECIMAL(15, 3) NOT NULL,
    `totHT` DECIMAL(15, 3) NOT NULL,
    `reste` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `numRegFour` INTEGER NULL,
    `valide` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AchatProd_fournisseurId_dateAchat_idx`(`fournisseurId`, `dateAchat`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetailAchatProd` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `achatProdId` INTEGER NOT NULL,
    `produitId` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `quantite` DECIMAL(15, 3) NOT NULL,
    `prixAchat` DECIMAL(15, 3) NOT NULL,
    `tauxTVA` DECIMAL(15, 3) NOT NULL,
    `valide` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DetailAchatProd_achatProdId_idx`(`achatProdId`),
    INDEX `DetailAchatProd_produitId_date_idx`(`produitId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CarProdSiege` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `produitId` INTEGER NOT NULL,
    `fournisseurId` INTEGER NULL,
    `date` DATE NOT NULL,
    `equipeId` INTEGER NOT NULL,
    `caisseId` INTEGER NOT NULL,
    `vendeurId` INTEGER NOT NULL,
    `numVente` INTEGER NOT NULL,
    `prixAchatHT` DECIMAL(15, 3) NOT NULL,
    `prixVenteHT` DECIMAL(15, 3) NOT NULL,
    `prixVenteTTC` DECIMAL(15, 3) NOT NULL,
    `prixAchatTTC` DECIMAL(15, 3) NOT NULL,
    `quantite` DECIMAL(15, 3) NOT NULL,
    `tva` DECIMAL(15, 3) NOT NULL,
    `marge` DECIMAL(15, 3) NOT NULL,
    `codeFamille` VARCHAR(40) NULL,
    `typeCarburant` VARCHAR(60) NULL,
    `pompeId` INTEGER NULL,
    `numLigne` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CarProdSiege_date_equipeId_caisseId_idx`(`date`, `equipeId`, `caisseId`),
    INDEX `CarProdSiege_produitId_date_idx`(`produitId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `operateur` INTEGER NOT NULL,
    `cloture` BOOLEAN NOT NULL DEFAULT false,
    `valeurStock` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Invent_date_operateur_idx`(`date`, `operateur`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetInvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventId` INTEGER NOT NULL,
    `produitId` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `stockTheorique` DECIMAL(15, 3) NOT NULL,
    `stockInventaire` DECIMAL(15, 3) NOT NULL,
    `valeurTheorique` DECIMAL(15, 3) NOT NULL,
    `ecartStock` DECIMAL(15, 3) NOT NULL,
    `familleId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DetInvent_produitId_date_idx`(`produitId`, `date`),
    UNIQUE INDEX `DetInvent_inventId_produitId_key`(`inventId`, `produitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TransEtranger` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fournisseurId` INTEGER NOT NULL,
    `dateTransfert` DATE NOT NULL,
    `op` INTEGER NOT NULL,
    `valide` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TransEtranger_fournisseurId_dateTransfert_idx`(`fournisseurId`, `dateTransfert`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetTransEtranger` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transfertId` INTEGER NOT NULL,
    `produitId` INTEGER NOT NULL,
    `quantite` DECIMAL(15, 3) NOT NULL,
    `prixUnitaire` DECIMAL(15, 3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DetTransEtranger_transfertId_idx`(`transfertId`),
    INDEX `DetTransEtranger_produitId_idx`(`produitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Produit_codeProduit_key` ON `Produit`(`codeProduit`);

-- CreateIndex
CREATE INDEX `Produit_familleId_actif_idx` ON `Produit`(`familleId`, `actif`);

-- CreateIndex
CREATE INDEX `Produit_fournisseurId_idx` ON `Produit`(`fournisseurId`);

-- AddForeignKey
ALTER TABLE `Produit` ADD CONSTRAINT `Produit_familleId_fkey` FOREIGN KEY (`familleId`) REFERENCES `FamilleProduit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Produit` ADD CONSTRAINT `Produit_fournisseurId_fkey` FOREIGN KEY (`fournisseurId`) REFERENCES `Fournisseur`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetMvtBq` ADD CONSTRAINT `DetMvtBq_banqueId_fkey` FOREIGN KEY (`banqueId`) REFERENCES `Banque`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetMvtBq` ADD CONSTRAINT `DetMvtBq_modePaymentId_fkey` FOREIGN KEY (`modePaymentId`) REFERENCES `ModePayment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgeoCompteMode` ADD CONSTRAINT `AgeoCompteMode_banqueId_fkey` FOREIGN KEY (`banqueId`) REFERENCES `Banque`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgeoCompteMode` ADD CONSTRAINT `AgeoCompteMode_modePaymentId_fkey` FOREIGN KEY (`modePaymentId`) REFERENCES `ModePayment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AchatProd` ADD CONSTRAINT `AchatProd_fournisseurId_fkey` FOREIGN KEY (`fournisseurId`) REFERENCES `Fournisseur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetailAchatProd` ADD CONSTRAINT `DetailAchatProd_achatProdId_fkey` FOREIGN KEY (`achatProdId`) REFERENCES `AchatProd`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetailAchatProd` ADD CONSTRAINT `DetailAchatProd_produitId_fkey` FOREIGN KEY (`produitId`) REFERENCES `Produit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CarProdSiege` ADD CONSTRAINT `CarProdSiege_produitId_fkey` FOREIGN KEY (`produitId`) REFERENCES `Produit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CarProdSiege` ADD CONSTRAINT `CarProdSiege_fournisseurId_fkey` FOREIGN KEY (`fournisseurId`) REFERENCES `Fournisseur`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CarProdSiege` ADD CONSTRAINT `CarProdSiege_equipeId_fkey` FOREIGN KEY (`equipeId`) REFERENCES `Equipe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CarProdSiege` ADD CONSTRAINT `CarProdSiege_caisseId_fkey` FOREIGN KEY (`caisseId`) REFERENCES `Caisse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CarProdSiege` ADD CONSTRAINT `CarProdSiege_vendeurId_fkey` FOREIGN KEY (`vendeurId`) REFERENCES `Vendeur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CarProdSiege` ADD CONSTRAINT `CarProdSiege_pompeId_fkey` FOREIGN KEY (`pompeId`) REFERENCES `Pompe`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invent` ADD CONSTRAINT `Invent_operateur_fkey` FOREIGN KEY (`operateur`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetInvent` ADD CONSTRAINT `DetInvent_inventId_fkey` FOREIGN KEY (`inventId`) REFERENCES `Invent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetInvent` ADD CONSTRAINT `DetInvent_produitId_fkey` FOREIGN KEY (`produitId`) REFERENCES `Produit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetInvent` ADD CONSTRAINT `DetInvent_familleId_fkey` FOREIGN KEY (`familleId`) REFERENCES `FamilleProduit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransEtranger` ADD CONSTRAINT `TransEtranger_fournisseurId_fkey` FOREIGN KEY (`fournisseurId`) REFERENCES `Fournisseur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransEtranger` ADD CONSTRAINT `TransEtranger_op_fkey` FOREIGN KEY (`op`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetTransEtranger` ADD CONSTRAINT `DetTransEtranger_transfertId_fkey` FOREIGN KEY (`transfertId`) REFERENCES `TransEtranger`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetTransEtranger` ADD CONSTRAINT `DetTransEtranger_produitId_fkey` FOREIGN KEY (`produitId`) REFERENCES `Produit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
