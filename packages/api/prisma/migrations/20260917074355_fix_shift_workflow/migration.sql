/*
  Warnings:

  - You are about to drop the column `vehiculeId` on the `DetailRecetteCaisse` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[date,cuveId,type]` on the table `Jaugeage` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Jaugeage_date_cuveId_key` ON `Jaugeage`;

-- DropIndex
DROP INDEX `RecetteCaisse_ecartCaisse_idx` ON `RecetteCaisse`;

-- AlterTable
ALTER TABLE `DetailCredit` ADD COLUMN `caisseId` INTEGER NULL,
    ADD COLUMN `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `equipeId` INTEGER NULL,
    ADD COLUMN `valide` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `vendeurId` INTEGER NULL;

-- AlterTable
ALTER TABLE `DetailDepenses` ADD COLUMN `caisseId` INTEGER NULL,
    ADD COLUMN `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `equipeId` INTEGER NULL,
    ADD COLUMN `valide` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `vendeurId` INTEGER NULL,
    ALTER COLUMN `montant` DROP DEFAULT;

-- AlterTable
ALTER TABLE `DetailRecetteCaisse` DROP COLUMN `vehiculeId`,
    ADD COLUMN `caisseId` INTEGER NULL,
    ADD COLUMN `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `equipeId` INTEGER NULL,
    ADD COLUMN `valide` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `vendeurId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Jaugeage` ADD COLUMN `ecart` DECIMAL(15, 3) NULL,
    ADD COLUMN `sessionId` INTEGER NULL,
    ADD COLUMN `type` VARCHAR(10) NOT NULL DEFAULT 'MANUEL';

-- AlterTable
ALTER TABLE `MobVCarCaisse` ADD COLUMN `cuveId` INTEGER NULL,
    ADD COLUMN `heureFermeture` DATETIME(3) NULL,
    ADD COLUMN `heureOuverture` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `statut` VARCHAR(10) NOT NULL DEFAULT 'OUVERT';

-- AlterTable
ALTER TABLE `RecetteCaisse` ADD COLUMN `depotBanque` DECIMAL(15, 3) NULL,
    ADD COLUMN `fondsCaisseFermeture` DECIMAL(15, 3) NULL,
    ADD COLUMN `fondsCaisseOuverture` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    ADD COLUMN `heureFermeture` DATETIME(3) NULL,
    ADD COLUMN `heureOuverture` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `statut` VARCHAR(10) NOT NULL DEFAULT 'OUVERT',
    ADD COLUMN `statutEcart` VARCHAR(20) NULL,
    ADD COLUMN `totalCarte` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    ADD COLUMN `totalCheques` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    ADD COLUMN `totalEspeces` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    ADD COLUMN `totalTheoriqueBoutique` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    ADD COLUMN `totalTheoriqueCarburant` DECIMAL(15, 3) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `SetParam` ADD COLUMN `fondsCaisseDefaut` DECIMAL(15, 3) NOT NULL DEFAULT 200.000,
    ADD COLUMN `seuilAlerteCuve` DECIMAL(5, 3) NOT NULL DEFAULT 0.200,
    ADD COLUMN `seuilEcartAutoApprove` DECIMAL(15, 3) NOT NULL DEFAULT 0.500,
    ADD COLUMN `seuilEcartBloque` DECIMAL(15, 3) NOT NULL DEFAULT 20.000,
    ADD COLUMN `seuilEcartGerantApprove` DECIMAL(15, 3) NOT NULL DEFAULT 5.000,
    ADD COLUMN `seuilJaugeageAlerte` DECIMAL(15, 3) NOT NULL DEFAULT 100.000;

-- AlterTable
ALTER TABLE `User` ALTER COLUMN `passwordHash` DROP DEFAULT,
    ALTER COLUMN `nom` DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX `Jaugeage_date_cuveId_type_key` ON `Jaugeage`(`date`, `cuveId`, `type`);

-- AddForeignKey
ALTER TABLE `MobVCarCaisse` ADD CONSTRAINT `MobVCarCaisse_cuveId_fkey` FOREIGN KEY (`cuveId`) REFERENCES `Cuve`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Jaugeage` ADD CONSTRAINT `Jaugeage_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `RecetteCaisse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
