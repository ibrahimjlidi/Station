-- CreateTable
CREATE TABLE `RecetteCaisse` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `equipeId` INTEGER NOT NULL,
    `caisseId` INTEGER NOT NULL,
    `vendeurId` INTEGER NOT NULL,
    `totalRecettes` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `fait` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RecetteCaisse_date_equipeId_caisseId_vendeurId_idx`(`date`, `equipeId`, `caisseId`, `vendeurId`),
    UNIQUE INDEX `RecetteCaisse_date_equipeId_caisseId_key`(`date`, `equipeId`, `caisseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetailRecetteCaisse` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numRecette` INTEGER NOT NULL,
    `modePaymentId` INTEGER NOT NULL,
    `montant` DECIMAL(15, 3) NOT NULL,
    `numero` VARCHAR(80) NULL,
    `idCuve` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DetailRecetteCaisse_numRecette_idx`(`numRecette`),
    INDEX `DetailRecetteCaisse_modePaymentId_idx`(`modePaymentId`),
    INDEX `DetailRecetteCaisse_idCuve_idx`(`idCuve`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DepensesCaisse` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `equipeId` INTEGER NOT NULL,
    `caisseId` INTEGER NOT NULL,
    `vendeurId` INTEGER NOT NULL,
    `totalDepenses` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `fait` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DepensesCaisse_date_equipeId_caisseId_vendeurId_idx`(`date`, `equipeId`, `caisseId`, `vendeurId`),
    UNIQUE INDEX `DepensesCaisse_date_equipeId_caisseId_key`(`date`, `equipeId`, `caisseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetailDepenses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numDepense` INTEGER NOT NULL,
    `codeDepense` INTEGER NOT NULL,
    `montant` DECIMAL(15, 3) NOT NULL,
    `libelle` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DetailDepenses_numDepense_idx`(`numDepense`),
    INDEX `DetailDepenses_codeDepense_idx`(`codeDepense`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreditCaisse` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `equipeId` INTEGER NOT NULL,
    `caisseId` INTEGER NOT NULL,
    `vendeurId` INTEGER NOT NULL,
    `totalCredits` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `fait` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CreditCaisse_date_equipeId_caisseId_vendeurId_idx`(`date`, `equipeId`, `caisseId`, `vendeurId`),
    UNIQUE INDEX `CreditCaisse_date_equipeId_caisseId_key`(`date`, `equipeId`, `caisseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetailCredit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numCredit` INTEGER NOT NULL,
    `clientId` INTEGER NOT NULL,
    `montant` DECIMAL(15, 3) NOT NULL,
    `libelle` VARCHAR(255) NULL,
    `modePayment` VARCHAR(80) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DetailCredit_numCredit_idx`(`numCredit`),
    INDEX `DetailCredit_clientId_idx`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JoursClotures` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dateJour` DATE NOT NULL,
    `equipeId` INTEGER NOT NULL,
    `fait` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `JoursClotures_dateJour_equipeId_fait_idx`(`dateJour`, `equipeId`, `fait`),
    UNIQUE INDEX `JoursClotures_dateJour_equipeId_key`(`dateJour`, `equipeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ModePayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `libelle` VARCHAR(100) NOT NULL,
    `famille` VARCHAR(80) NULL,
    `compteCPT` VARCHAR(40) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ModePayment_famille_idx`(`famille`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Depenses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `typeDepense` VARCHAR(100) NOT NULL,
    `numFamDep` VARCHAR(40) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Depenses_typeDepense_idx`(`typeDepense`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Client` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nomClient` VARCHAR(160) NOT NULL,
    `adresse` VARCHAR(255) NULL,
    `telephone` VARCHAR(30) NULL,
    `MF` VARCHAR(40) NULL,
    `quota` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `soldeAnterieur` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `tva` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Client_nomClient_idx`(`nomClient`),
    INDEX `Client_MF_idx`(`MF`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RecetteCaisse` ADD CONSTRAINT `RecetteCaisse_equipeId_fkey` FOREIGN KEY (`equipeId`) REFERENCES `Equipe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecetteCaisse` ADD CONSTRAINT `RecetteCaisse_caisseId_fkey` FOREIGN KEY (`caisseId`) REFERENCES `Caisse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecetteCaisse` ADD CONSTRAINT `RecetteCaisse_vendeurId_fkey` FOREIGN KEY (`vendeurId`) REFERENCES `Vendeur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetailRecetteCaisse` ADD CONSTRAINT `DetailRecetteCaisse_numRecette_fkey` FOREIGN KEY (`numRecette`) REFERENCES `RecetteCaisse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetailRecetteCaisse` ADD CONSTRAINT `DetailRecetteCaisse_modePaymentId_fkey` FOREIGN KEY (`modePaymentId`) REFERENCES `ModePayment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetailRecetteCaisse` ADD CONSTRAINT `DetailRecetteCaisse_idCuve_fkey` FOREIGN KEY (`idCuve`) REFERENCES `Cuve`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DepensesCaisse` ADD CONSTRAINT `DepensesCaisse_equipeId_fkey` FOREIGN KEY (`equipeId`) REFERENCES `Equipe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DepensesCaisse` ADD CONSTRAINT `DepensesCaisse_caisseId_fkey` FOREIGN KEY (`caisseId`) REFERENCES `Caisse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DepensesCaisse` ADD CONSTRAINT `DepensesCaisse_vendeurId_fkey` FOREIGN KEY (`vendeurId`) REFERENCES `Vendeur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetailDepenses` ADD CONSTRAINT `DetailDepenses_numDepense_fkey` FOREIGN KEY (`numDepense`) REFERENCES `DepensesCaisse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetailDepenses` ADD CONSTRAINT `DetailDepenses_codeDepense_fkey` FOREIGN KEY (`codeDepense`) REFERENCES `Depenses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditCaisse` ADD CONSTRAINT `CreditCaisse_equipeId_fkey` FOREIGN KEY (`equipeId`) REFERENCES `Equipe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditCaisse` ADD CONSTRAINT `CreditCaisse_caisseId_fkey` FOREIGN KEY (`caisseId`) REFERENCES `Caisse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditCaisse` ADD CONSTRAINT `CreditCaisse_vendeurId_fkey` FOREIGN KEY (`vendeurId`) REFERENCES `Vendeur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetailCredit` ADD CONSTRAINT `DetailCredit_numCredit_fkey` FOREIGN KEY (`numCredit`) REFERENCES `CreditCaisse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetailCredit` ADD CONSTRAINT `DetailCredit_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JoursClotures` ADD CONSTRAINT `JoursClotures_equipeId_fkey` FOREIGN KEY (`equipeId`) REFERENCES `Equipe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
