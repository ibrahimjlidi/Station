/*
  Warnings:

  - You are about to drop the column `montant` on the `detaildepenses` table. All the data in the column will be lost.
  - You are about to drop the column `nom` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `passwordHash` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `telephone` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `achatessence` ADD COLUMN `magasinId` INTEGER NULL;

-- AlterTable
ALTER TABLE `achatprod` ADD COLUMN `magasinId` INTEGER NULL;

-- AlterTable
ALTER TABLE `bonliv` ADD COLUMN `magasinId` INTEGER NULL;

-- AlterTable
ALTER TABLE `creditcaisse` ADD COLUMN `magasinId` INTEGER NULL;

-- AlterTable
ALTER TABLE `depenses` ADD COLUMN `famDepenseId` INTEGER NULL;

-- AlterTable
ALTER TABLE `depensescaisse` ADD COLUMN `magasinId` INTEGER NULL;

-- AlterTable
ALTER TABLE `detaildepenses` DROP COLUMN `montant`;

-- AlterTable
ALTER TABLE `detailrecettecaisse` ADD COLUMN `vehiculeId` INTEGER NULL;

-- AlterTable
ALTER TABLE `detentretien` ADD COLUMN `serviceId` INTEGER NULL;

-- AlterTable
ALTER TABLE `detmvtbq` ADD COLUMN `magasinId` INTEGER NULL;

-- AlterTable
ALTER TABLE `entavoir` ADD COLUMN `magasinId` INTEGER NULL;

-- AlterTable
ALTER TABLE `entras` ADD COLUMN `magasinId` INTEGER NULL;

-- AlterTable
ALTER TABLE `entretien` ADD COLUMN `vehiculeId` INTEGER NULL;

-- AlterTable
ALTER TABLE `facture` ADD COLUMN `magasinId` INTEGER NULL;

-- AlterTable
ALTER TABLE `pompe` ADD COLUMN `caisseId` INTEGER NULL,
    ADD COLUMN `magasinId` INTEGER NULL;

-- AlterTable
ALTER TABLE `recettecaisse` ADD COLUMN `magasinId` INTEGER NULL;

-- AlterTable
ALTER TABLE `regfour` ADD COLUMN `magasinId` INTEGER NULL;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `nom`,
    DROP COLUMN `passwordHash`,
    DROP COLUMN `telephone`;

-- AlterTable
ALTER TABLE `vendeur` ADD COLUMN `equipeId` INTEGER NULL,
    ADD COLUMN `magasinId` INTEGER NULL;

-- CreateTable
CREATE TABLE `Vehicule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clientId` INTEGER NOT NULL,
    `matricule` VARCHAR(20) NOT NULL,
    `marque` VARCHAR(50) NULL,
    `modele` VARCHAR(50) NULL,
    `annee` INTEGER NULL,
    `carburantType` TINYINT NULL,
    `indexKmActuel` BIGINT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Vehicule_clientId_matricule_idx`(`clientId`, `matricule`),
    UNIQUE INDEX `Vehicule_clientId_matricule_key`(`clientId`, `matricule`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Service` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `libelle` VARCHAR(100) NOT NULL,
    `prixHT` DECIMAL(15, 3) NOT NULL,
    `tauxTVA` DECIMAL(5, 2) NOT NULL,
    `prixTTC` DECIMAL(15, 3) NOT NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RetourCuve` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `equipeId` INTEGER NOT NULL,
    `caisseId` INTEGER NOT NULL,
    `vendeurId` INTEGER NOT NULL,
    `magasinId` INTEGER NOT NULL,
    `totalVolume` DECIMAL(15, 3) NOT NULL,
    `totalValeur` DECIMAL(15, 3) NOT NULL,
    `valide` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RetourCuve_date_equipeId_caisseId_idx`(`date`, `equipeId`, `caisseId`),
    UNIQUE INDEX `RetourCuve_date_equipeId_caisseId_key`(`date`, `equipeId`, `caisseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetailRetour` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `retourCuveId` INTEGER NOT NULL,
    `pompeId` INTEGER NOT NULL,
    `cuveId` INTEGER NOT NULL,
    `volume` DECIMAL(15, 3) NOT NULL,
    `valeur` DECIMAL(15, 3) NOT NULL,
    `tauxTVA` DECIMAL(5, 2) NOT NULL,
    `valide` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventaireCarburant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `operateur` VARCHAR(100) NOT NULL,
    `cloture` BOOLEAN NOT NULL DEFAULT false,
    `valeurStock` DECIMAL(15, 3) NOT NULL,
    `magasinId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InventaireCarburant_date_magasinId_idx`(`date`, `magasinId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetailInventaireCarburant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventaireCarId` INTEGER NOT NULL,
    `cuveId` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `stockPhysique` DECIMAL(15, 3) NOT NULL,
    `stockComptable` DECIMAL(15, 3) NOT NULL,
    `prixUnitaire` DECIMAL(15, 3) NOT NULL,
    `valeur` DECIMAL(15, 3) NOT NULL,
    `ecart` DECIMAL(15, 3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DetailInventaireCarburant_date_cuveId_idx`(`date`, `cuveId`),
    UNIQUE INDEX `DetailInventaireCarburant_inventaireCarId_cuveId_key`(`inventaireCarId`, `cuveId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FAMDEPENSE` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `libelle` VARCHAR(100) NOT NULL,
    `cpt` VARCHAR(8) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TauxTVA` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `taux` DECIMAL(5, 2) NOT NULL,
    `libelle` VARCHAR(50) NOT NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `AchatEssence_magasinId_idx` ON `AchatEssence`(`magasinId`);

-- CreateIndex
CREATE INDEX `AchatProd_magasinId_idx` ON `AchatProd`(`magasinId`);

-- CreateIndex
CREATE INDEX `Bonliv_magasinId_idx` ON `Bonliv`(`magasinId`);

-- CreateIndex
CREATE INDEX `CreditCaisse_magasinId_idx` ON `CreditCaisse`(`magasinId`);

-- CreateIndex
CREATE INDEX `Depenses_famDepenseId_idx` ON `Depenses`(`famDepenseId`);

-- CreateIndex
CREATE INDEX `DepensesCaisse_magasinId_idx` ON `DepensesCaisse`(`magasinId`);

-- CreateIndex
CREATE INDEX `Detentretien_serviceId_idx` ON `Detentretien`(`serviceId`);

-- CreateIndex
CREATE INDEX `DetMvtBq_magasinId_idx` ON `DetMvtBq`(`magasinId`);

-- CreateIndex
CREATE INDEX `EntAvoir_magasinId_idx` ON `EntAvoir`(`magasinId`);

-- CreateIndex
CREATE INDEX `EntRas_magasinId_idx` ON `EntRas`(`magasinId`);

-- CreateIndex
CREATE INDEX `Facture_magasinId_idx` ON `Facture`(`magasinId`);

-- CreateIndex
CREATE INDEX `Pompe_magasinId_idx` ON `Pompe`(`magasinId`);

-- CreateIndex
CREATE INDEX `RegFour_magasinId_idx` ON `RegFour`(`magasinId`);

-- CreateIndex
CREATE INDEX `Vendeur_magasinId_idx` ON `Vendeur`(`magasinId`);

-- AddForeignKey
ALTER TABLE `Pompe` ADD CONSTRAINT `Pompe_magasinId_fkey` FOREIGN KEY (`magasinId`) REFERENCES `Magasin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pompe` ADD CONSTRAINT `Pompe_caisseId_fkey` FOREIGN KEY (`caisseId`) REFERENCES `Caisse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vendeur` ADD CONSTRAINT `Vendeur_magasinId_fkey` FOREIGN KEY (`magasinId`) REFERENCES `Magasin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vendeur` ADD CONSTRAINT `Vendeur_equipeId_fkey` FOREIGN KEY (`equipeId`) REFERENCES `Equipe`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AchatEssence` ADD CONSTRAINT `AchatEssence_magasinId_fkey` FOREIGN KEY (`magasinId`) REFERENCES `Magasin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vehicule` ADD CONSTRAINT `Vehicule_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RetourCuve` ADD CONSTRAINT `RetourCuve_equipeId_fkey` FOREIGN KEY (`equipeId`) REFERENCES `Equipe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RetourCuve` ADD CONSTRAINT `RetourCuve_caisseId_fkey` FOREIGN KEY (`caisseId`) REFERENCES `Caisse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RetourCuve` ADD CONSTRAINT `RetourCuve_vendeurId_fkey` FOREIGN KEY (`vendeurId`) REFERENCES `Vendeur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RetourCuve` ADD CONSTRAINT `RetourCuve_magasinId_fkey` FOREIGN KEY (`magasinId`) REFERENCES `Magasin`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetailRetour` ADD CONSTRAINT `DetailRetour_retourCuveId_fkey` FOREIGN KEY (`retourCuveId`) REFERENCES `RetourCuve`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetailRetour` ADD CONSTRAINT `DetailRetour_pompeId_fkey` FOREIGN KEY (`pompeId`) REFERENCES `Pompe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetailRetour` ADD CONSTRAINT `DetailRetour_cuveId_fkey` FOREIGN KEY (`cuveId`) REFERENCES `Cuve`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventaireCarburant` ADD CONSTRAINT `InventaireCarburant_magasinId_fkey` FOREIGN KEY (`magasinId`) REFERENCES `Magasin`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetailInventaireCarburant` ADD CONSTRAINT `DetailInventaireCarburant_inventaireCarId_fkey` FOREIGN KEY (`inventaireCarId`) REFERENCES `InventaireCarburant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetailInventaireCarburant` ADD CONSTRAINT `DetailInventaireCarburant_cuveId_fkey` FOREIGN KEY (`cuveId`) REFERENCES `Cuve`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecetteCaisse` ADD CONSTRAINT `RecetteCaisse_magasinId_fkey` FOREIGN KEY (`magasinId`) REFERENCES `Magasin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DepensesCaisse` ADD CONSTRAINT `DepensesCaisse_magasinId_fkey` FOREIGN KEY (`magasinId`) REFERENCES `Magasin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditCaisse` ADD CONSTRAINT `CreditCaisse_magasinId_fkey` FOREIGN KEY (`magasinId`) REFERENCES `Magasin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Depenses` ADD CONSTRAINT `Depenses_famDepenseId_fkey` FOREIGN KEY (`famDepenseId`) REFERENCES `FAMDEPENSE`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bonliv` ADD CONSTRAINT `Bonliv_magasinId_fkey` FOREIGN KEY (`magasinId`) REFERENCES `Magasin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Facture` ADD CONSTRAINT `Facture_magasinId_fkey` FOREIGN KEY (`magasinId`) REFERENCES `Magasin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegFour` ADD CONSTRAINT `RegFour_magasinId_fkey` FOREIGN KEY (`magasinId`) REFERENCES `Magasin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EntAvoir` ADD CONSTRAINT `EntAvoir_magasinId_fkey` FOREIGN KEY (`magasinId`) REFERENCES `Magasin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EntRas` ADD CONSTRAINT `EntRas_magasinId_fkey` FOREIGN KEY (`magasinId`) REFERENCES `Magasin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetMvtBq` ADD CONSTRAINT `DetMvtBq_magasinId_fkey` FOREIGN KEY (`magasinId`) REFERENCES `Magasin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AchatProd` ADD CONSTRAINT `AchatProd_magasinId_fkey` FOREIGN KEY (`magasinId`) REFERENCES `Magasin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Entretien` ADD CONSTRAINT `Entretien_vehiculeId_fkey` FOREIGN KEY (`vehiculeId`) REFERENCES `Vehicule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Detentretien` ADD CONSTRAINT `Detentretien_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RedefineIndex
CREATE INDEX `Caisse_magasinId_idx` ON `Caisse`(`magasinId`);
DROP INDEX `Caisse_magasinId_fkey` ON `caisse`;

-- RedefineIndex
CREATE INDEX `Cuve_magasinId_idx` ON `Cuve`(`magasinId`);
DROP INDEX `Cuve_magasinId_fkey` ON `cuve`;

-- RedefineIndex
CREATE INDEX `Equipe_magasinId_idx` ON `Equipe`(`magasinId`);
DROP INDEX `Equipe_magasinId_fkey` ON `equipe`;
