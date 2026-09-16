-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(80) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `nom` VARCHAR(120) NOT NULL,
    `role` ENUM('gerant', 'caissier', 'vendeur') NOT NULL DEFAULT 'vendeur',
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    INDEX `User_role_actif_idx`(`role`, `actif`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Fournisseur` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `raisonSociale` VARCHAR(160) NOT NULL,
    `matriculeFiscal` VARCHAR(40) NULL,
    `telephone` VARCHAR(30) NULL,
    `adresse` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Fournisseur_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cuve` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `libelle` VARCHAR(100) NOT NULL,
    `carburant` VARCHAR(60) NOT NULL,
    `volumeTotal` DECIMAL(15, 3) NOT NULL,
    `stockInitial` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `seuilAlerte` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Cuve_code_key`(`code`),
    INDEX `Cuve_carburant_idx`(`carburant`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pompe` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `libelle` VARCHAR(100) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `prixVente` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `cuveId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Pompe_code_key`(`code`),
    INDEX `Pompe_cuveId_active_idx`(`cuveId`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Equipe` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `libelle` VARCHAR(100) NOT NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Equipe_code_key`(`code`),
    INDEX `Equipe_actif_idx`(`actif`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Caisse` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `libelle` VARCHAR(100) NOT NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Caisse_code_key`(`code`),
    INDEX `Caisse_actif_idx`(`actif`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vendeur` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `matricule` VARCHAR(30) NOT NULL,
    `nom` VARCHAR(120) NOT NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `userId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Vendeur_matricule_key`(`matricule`),
    UNIQUE INDEX `Vendeur_userId_key`(`userId`),
    INDEX `Vendeur_actif_idx`(`actif`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MobVCarCaisse` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `equipeId` INTEGER NOT NULL,
    `caisseId` INTEGER NOT NULL,
    `pompeId` INTEGER NOT NULL,
    `vendeurId` INTEGER NOT NULL,
    `indexOuverture` DECIMAL(15, 3) NOT NULL,
    `indexFermeture` DECIMAL(15, 3) NULL,
    `prixVente` DECIMAL(15, 3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MobVCarCaisse_date_equipeId_caisseId_idx`(`date`, `equipeId`, `caisseId`),
    INDEX `MobVCarCaisse_pompeId_indexFermeture_idx`(`pompeId`, `indexFermeture`),
    UNIQUE INDEX `MobVCarCaisse_date_equipeId_caisseId_pompeId_key`(`date`, `equipeId`, `caisseId`, `pompeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AchatEssence` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `fournisseurId` INTEGER NOT NULL,
    `type` ENUM('achat', 'retour') NOT NULL DEFAULT 'achat',
    `reference` VARCHAR(80) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AchatEssence_date_fournisseurId_idx`(`date`, `fournisseurId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetailAchatEssence` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `achatId` INTEGER NOT NULL,
    `cuveId` INTEGER NOT NULL,
    `quantite` DECIMAL(15, 3) NOT NULL,
    `prixUnitaire` DECIMAL(15, 3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DetailAchatEssence_cuveId_createdAt_idx`(`cuveId`, `createdAt`),
    INDEX `DetailAchatEssence_achatId_idx`(`achatId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Jaugeage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `cuveId` INTEGER NOT NULL,
    `equipeId` INTEGER NOT NULL,
    `caisseId` INTEGER NOT NULL,
    `niveau` DECIMAL(15, 3) NOT NULL,
    `temperature` DECIMAL(15, 3) NULL,
    `observation` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Jaugeage_date_equipeId_caisseId_idx`(`date`, `equipeId`, `caisseId`),
    INDEX `Jaugeage_cuveId_date_idx`(`cuveId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Pompe` ADD CONSTRAINT `Pompe_cuveId_fkey` FOREIGN KEY (`cuveId`) REFERENCES `Cuve`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vendeur` ADD CONSTRAINT `Vendeur_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MobVCarCaisse` ADD CONSTRAINT `MobVCarCaisse_equipeId_fkey` FOREIGN KEY (`equipeId`) REFERENCES `Equipe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MobVCarCaisse` ADD CONSTRAINT `MobVCarCaisse_caisseId_fkey` FOREIGN KEY (`caisseId`) REFERENCES `Caisse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MobVCarCaisse` ADD CONSTRAINT `MobVCarCaisse_pompeId_fkey` FOREIGN KEY (`pompeId`) REFERENCES `Pompe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MobVCarCaisse` ADD CONSTRAINT `MobVCarCaisse_vendeurId_fkey` FOREIGN KEY (`vendeurId`) REFERENCES `Vendeur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AchatEssence` ADD CONSTRAINT `AchatEssence_fournisseurId_fkey` FOREIGN KEY (`fournisseurId`) REFERENCES `Fournisseur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetailAchatEssence` ADD CONSTRAINT `DetailAchatEssence_achatId_fkey` FOREIGN KEY (`achatId`) REFERENCES `AchatEssence`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetailAchatEssence` ADD CONSTRAINT `DetailAchatEssence_cuveId_fkey` FOREIGN KEY (`cuveId`) REFERENCES `Cuve`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Jaugeage` ADD CONSTRAINT `Jaugeage_cuveId_fkey` FOREIGN KEY (`cuveId`) REFERENCES `Cuve`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Jaugeage` ADD CONSTRAINT `Jaugeage_equipeId_fkey` FOREIGN KEY (`equipeId`) REFERENCES `Equipe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Jaugeage` ADD CONSTRAINT `Jaugeage_caisseId_fkey` FOREIGN KEY (`caisseId`) REFERENCES `Caisse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
