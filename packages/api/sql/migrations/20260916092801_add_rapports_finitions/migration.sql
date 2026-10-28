-- CreateTable
CREATE TABLE `Cartes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numTicket` VARCHAR(80) NULL,
    `numCession` VARCHAR(80) NULL,
    `date` DATE NOT NULL,
    `montant` DECIMAL(15, 3) NOT NULL,
    `numFacture` VARCHAR(80) NULL,
    `typeCarte` VARCHAR(40) NOT NULL,
    `fait` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Cartes_date_typeCarte_idx`(`date`, `typeCarte`),
    INDEX `Cartes_fait_idx`(`fait`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BonsStation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numBord` VARCHAR(80) NULL,
    `bonStationId` VARCHAR(80) NULL,
    `date` DATE NOT NULL,
    `montant` DECIMAL(15, 3) NOT NULL,
    `numFacture` VARCHAR(80) NULL,
    `fait` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BonsStation_date_fait_idx`(`date`, `fait`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExtractCN` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `terminal` VARCHAR(80) NULL,
    `shift` VARCHAR(80) NULL,
    `date` DATE NULL,
    `receipt` VARCHAR(120) NOT NULL,
    `card` VARCHAR(80) NULL,
    `product` VARCHAR(120) NULL,
    `customerName` VARCHAR(160) NULL,
    `transactionType` VARCHAR(80) NULL,
    `quantity` DECIMAL(15, 3) NULL,
    `amount` DECIMAL(15, 3) NULL,
    `numCN` VARCHAR(80) NULL,
    `dateAvoir` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ExtractCN_receipt_key`(`receipt`),
    INDEX `ExtractCN_date_numCN_idx`(`date`, `numCN`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Entretien` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dateEnt` DATE NOT NULL,
    `matricule` VARCHAR(40) NOT NULL,
    `clientId` INTEGER NOT NULL,
    `totEntTTC` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `indexKm` DECIMAL(15, 3) NOT NULL,
    `prochainIndex` DECIMAL(15, 3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Entretien_dateEnt_clientId_idx`(`dateEnt`, `clientId`),
    INDEX `Entretien_matricule_idx`(`matricule`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Detentretien` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `entretienId` INTEGER NOT NULL,
    `idService` INTEGER NOT NULL,
    `prixHT` DECIMAL(15, 3) NOT NULL,
    `prixTTC` DECIMAL(15, 3) NOT NULL,
    `numLigne` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Detentretien_idService_idx`(`idService`),
    UNIQUE INDEX `Detentretien_entretienId_numLigne_key`(`entretienId`, `numLigne`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CarWash` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `indexOuverture` DECIMAL(15, 3) NOT NULL,
    `indexFermeture` DECIMAL(15, 3) NOT NULL,
    `nombreLavage` DECIMAL(15, 3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CarWash_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SetParam` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `nomStation` VARCHAR(160) NOT NULL,
    `adresse` VARCHAR(255) NULL,
    `tel` VARCHAR(30) NULL,
    `mf` VARCHAR(40) NULL,
    `rc` VARCHAR(40) NULL,
    `logoUrl` TEXT NULL,
    `timbre` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `tauxTVADefaut` DECIMAL(15, 3) NOT NULL DEFAULT 19,
    `devise` VARCHAR(10) NOT NULL DEFAULT 'TND',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Compteur` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `lastNumBL` INTEGER NOT NULL DEFAULT 0,
    `lastNumFact` INTEGER NOT NULL DEFAULT 0,
    `lastNumAchatEss` INTEGER NOT NULL DEFAULT 0,
    `lastNumAchatProd` INTEGER NOT NULL DEFAULT 0,
    `lastNumDepense` INTEGER NOT NULL DEFAULT 0,
    `lastNumRecette` INTEGER NOT NULL DEFAULT 0,
    `lastNumCredit` INTEGER NOT NULL DEFAULT 0,
    `lastNumReg` INTEGER NOT NULL DEFAULT 0,
    `lastNumRegFour` INTEGER NOT NULL DEFAULT 0,
    `lastNumInvent` INTEGER NOT NULL DEFAULT 0,
    `lastNumInvCar` INTEGER NOT NULL DEFAULT 0,
    `lastNumTransfert` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Entretien` ADD CONSTRAINT `Entretien_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Detentretien` ADD CONSTRAINT `Detentretien_entretienId_fkey` FOREIGN KEY (`entretienId`) REFERENCES `Entretien`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Detentretien` ADD CONSTRAINT `Detentretien_idService_fkey` FOREIGN KEY (`idService`) REFERENCES `Produit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
