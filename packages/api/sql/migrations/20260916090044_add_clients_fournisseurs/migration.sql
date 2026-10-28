-- CreateTable
CREATE TABLE `Produit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(40) NOT NULL,
    `libelle` VARCHAR(160) NOT NULL,
    `prixVenteHT` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `tva` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Produit_code_key`(`code`),
    INDEX `Produit_libelle_actif_idx`(`libelle`, `actif`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bonliv` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `clientId` INTEGER NOT NULL,
    `totalHT` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `totalTTC` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `totTVA` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `numFact` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Bonliv_numFact_key`(`numFact`),
    INDEX `Bonliv_date_clientId_idx`(`date`, `clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Detbonliv` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numLigne` INTEGER NOT NULL,
    `bonlivId` INTEGER NOT NULL,
    `idProduit` INTEGER NOT NULL,
    `puHT` DECIMAL(15, 3) NOT NULL,
    `tva` DECIMAL(15, 3) NOT NULL,
    `qte` DECIMAL(15, 3) NOT NULL,
    `remise` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `ttc` DECIMAL(15, 3) NOT NULL,
    `date` DATE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Detbonliv_idProduit_date_idx`(`idProduit`, `date`),
    UNIQUE INDEX `Detbonliv_bonlivId_numLigne_key`(`bonlivId`, `numLigne`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Facture` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `clientId` INTEGER NOT NULL,
    `totalHT` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `totalTTC` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `totTVA` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `numBL` INTEGER NOT NULL,
    `mtTimbre` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Facture_numBL_key`(`numBL`),
    INDEX `Facture_date_clientId_idx`(`date`, `clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Detfact` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numLigne` INTEGER NOT NULL,
    `factureId` INTEGER NOT NULL,
    `idProduit` INTEGER NOT NULL,
    `puHT` DECIMAL(15, 3) NOT NULL,
    `qte` DECIMAL(15, 3) NOT NULL,
    `ttc` DECIMAL(15, 3) NOT NULL,
    `date` DATE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Detfact_idProduit_date_idx`(`idProduit`, `date`),
    UNIQUE INDEX `Detfact_factureId_numLigne_key`(`factureId`, `numLigne`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetailReglements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clientId` INTEGER NOT NULL,
    `equipeId` INTEGER NOT NULL,
    `caisseId` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `montant` DECIMAL(15, 3) NOT NULL,
    `modePayment` VARCHAR(80) NOT NULL,
    `echeance` DATE NULL,
    `impaye` BOOLEAN NOT NULL DEFAULT false,
    `valide` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DetailReglements_clientId_date_idx`(`clientId`, `date`),
    INDEX `DetailReglements_equipeId_caisseId_date_idx`(`equipeId`, `caisseId`, `date`),
    INDEX `DetailReglements_impaye_echeance_idx`(`impaye`, `echeance`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Impayes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numReg` INTEGER NOT NULL,
    `clientId` INTEGER NOT NULL,
    `dateReg` DATE NOT NULL,
    `montantLigne` DECIMAL(15, 3) NOT NULL,
    `echeance` DATE NULL,
    `numCheque` VARCHAR(80) NULL,
    `numRib` VARCHAR(80) NULL,
    `nomBanque` VARCHAR(120) NULL,
    `impaye` BOOLEAN NOT NULL DEFAULT true,
    `valide` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Impayes_numReg_key`(`numReg`),
    INDEX `Impayes_clientId_impaye_echeance_idx`(`clientId`, `impaye`, `echeance`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RegFour` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fournisseurId` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `montantTotal` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `valide` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RegFour_fournisseurId_date_idx`(`fournisseurId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetailRegFour` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `regFourId` INTEGER NOT NULL,
    `nLigne` INTEGER NOT NULL,
    `numAchats` INTEGER NULL,
    `proEss` VARCHAR(160) NULL,
    `montant` DECIMAL(15, 3) NOT NULL,
    `modePayment` VARCHAR(80) NOT NULL,
    `echeance` DATE NULL,
    `reste` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DetailRegFour_numAchats_idx`(`numAchats`),
    UNIQUE INDEX `DetailRegFour_regFourId_nLigne_key`(`regFourId`, `nLigne`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EntAvoir` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fournisseurId` INTEGER NOT NULL,
    `dateAchat` DATE NOT NULL,
    `numFacture` VARCHAR(80) NULL,
    `totalTTC` DECIMAL(15, 3) NOT NULL,
    `reste` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `numRegFour` INTEGER NULL,
    `valide` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EntAvoir_fournisseurId_dateAchat_idx`(`fournisseurId`, `dateAchat`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EntRas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dateRas` DATE NOT NULL,
    `fournisseurId` INTEGER NOT NULL,
    `totalBrut` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `totalRetenu` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `totalNet` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `valide` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EntRas_fournisseurId_dateRas_idx`(`fournisseurId`, `dateRas`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetRas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numRas` INTEGER NOT NULL,
    `numLigne` INTEGER NOT NULL,
    `codeRet` INTEGER NOT NULL,
    `mtBrut` DECIMAL(15, 3) NOT NULL,
    `tauxRetenu` DECIMAL(15, 3) NOT NULL,
    `mtRetenu` DECIMAL(15, 3) NOT NULL,
    `fournisseurId` INTEGER NOT NULL,
    `valide` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DetRas_fournisseurId_idx`(`fournisseurId`),
    UNIQUE INDEX `DetRas_numRas_numLigne_key`(`numRas`, `numLigne`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LibRas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `libelle` VARCHAR(160) NOT NULL,
    `tauxRetenu` DECIMAL(15, 3) NOT NULL,
    `compteCPT` VARCHAR(40) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LibRas_libelle_idx`(`libelle`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Bonliv` ADD CONSTRAINT `Bonliv_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Detbonliv` ADD CONSTRAINT `Detbonliv_bonlivId_fkey` FOREIGN KEY (`bonlivId`) REFERENCES `Bonliv`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Detbonliv` ADD CONSTRAINT `Detbonliv_idProduit_fkey` FOREIGN KEY (`idProduit`) REFERENCES `Produit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Facture` ADD CONSTRAINT `Facture_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Facture` ADD CONSTRAINT `Facture_numBL_fkey` FOREIGN KEY (`numBL`) REFERENCES `Bonliv`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Detfact` ADD CONSTRAINT `Detfact_factureId_fkey` FOREIGN KEY (`factureId`) REFERENCES `Facture`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Detfact` ADD CONSTRAINT `Detfact_idProduit_fkey` FOREIGN KEY (`idProduit`) REFERENCES `Produit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetailReglements` ADD CONSTRAINT `DetailReglements_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetailReglements` ADD CONSTRAINT `DetailReglements_equipeId_fkey` FOREIGN KEY (`equipeId`) REFERENCES `Equipe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetailReglements` ADD CONSTRAINT `DetailReglements_caisseId_fkey` FOREIGN KEY (`caisseId`) REFERENCES `Caisse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Impayes` ADD CONSTRAINT `Impayes_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Impayes` ADD CONSTRAINT `Impayes_numReg_fkey` FOREIGN KEY (`numReg`) REFERENCES `DetailReglements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegFour` ADD CONSTRAINT `RegFour_fournisseurId_fkey` FOREIGN KEY (`fournisseurId`) REFERENCES `Fournisseur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetailRegFour` ADD CONSTRAINT `DetailRegFour_regFourId_fkey` FOREIGN KEY (`regFourId`) REFERENCES `RegFour`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetailRegFour` ADD CONSTRAINT `DetailRegFour_numAchats_fkey` FOREIGN KEY (`numAchats`) REFERENCES `AchatEssence`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EntAvoir` ADD CONSTRAINT `EntAvoir_fournisseurId_fkey` FOREIGN KEY (`fournisseurId`) REFERENCES `Fournisseur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EntAvoir` ADD CONSTRAINT `EntAvoir_numRegFour_fkey` FOREIGN KEY (`numRegFour`) REFERENCES `RegFour`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EntRas` ADD CONSTRAINT `EntRas_fournisseurId_fkey` FOREIGN KEY (`fournisseurId`) REFERENCES `Fournisseur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetRas` ADD CONSTRAINT `DetRas_numRas_fkey` FOREIGN KEY (`numRas`) REFERENCES `EntRas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetRas` ADD CONSTRAINT `DetRas_codeRet_fkey` FOREIGN KEY (`codeRet`) REFERENCES `LibRas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetRas` ADD CONSTRAINT `DetRas_fournisseurId_fkey` FOREIGN KEY (`fournisseurId`) REFERENCES `Fournisseur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
