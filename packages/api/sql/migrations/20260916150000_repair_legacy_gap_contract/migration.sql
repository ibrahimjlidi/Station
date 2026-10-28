-- Repair the partially applied gap migration without removing existing data.
ALTER TABLE `User`
  ADD COLUMN `magasinId` INTEGER NULL,
  ADD COLUMN `passwordHash` VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN `nom` VARCHAR(120) NOT NULL DEFAULT '',
  ADD COLUMN `telephone` VARCHAR(30) NULL;

ALTER TABLE `Cuve`
  ADD COLUMN `stock` DECIMAL(15, 3) NOT NULL DEFAULT 0,
  ADD COLUMN `prixAchatHT` DECIMAL(15, 3) NOT NULL DEFAULT 0;

ALTER TABLE `Jaugeage`
  ADD COLUMN `quantite` DECIMAL(15, 3) NOT NULL DEFAULT 0;

ALTER TABLE `DetailDepenses`
  ADD COLUMN `montant` DECIMAL(15, 3) NOT NULL DEFAULT 0;

ALTER TABLE `Detentretien` MODIFY COLUMN `idService` INTEGER NULL;

CREATE INDEX `User_magasinId_idx` ON `User`(`magasinId`);
CREATE UNIQUE INDEX `Jaugeage_date_cuveId_key` ON `Jaugeage`(`date`, `cuveId`);

ALTER TABLE `User`
  ADD CONSTRAINT `User_magasinId_fkey` FOREIGN KEY (`magasinId`) REFERENCES `Magasin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;