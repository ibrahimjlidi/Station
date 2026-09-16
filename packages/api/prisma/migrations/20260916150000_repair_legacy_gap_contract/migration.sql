-- Repair the partially applied gap migration without removing existing data.
ALTER TABLE `user`
  ADD COLUMN IF NOT EXISTS `magasinId` INTEGER NULL,
  ADD COLUMN IF NOT EXISTS `passwordHash` VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS `nom` VARCHAR(120) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS `telephone` VARCHAR(30) NULL;

ALTER TABLE `cuve`
  ADD COLUMN IF NOT EXISTS `stock` DECIMAL(15, 3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `prixAchatHT` DECIMAL(15, 3) NOT NULL DEFAULT 0;

ALTER TABLE `jaugeage`
  ADD COLUMN IF NOT EXISTS `quantite` DECIMAL(15, 3) NOT NULL DEFAULT 0;

ALTER TABLE `detaildepenses`
  ADD COLUMN IF NOT EXISTS `montant` DECIMAL(15, 3) NOT NULL DEFAULT 0;

ALTER TABLE `detentretien` MODIFY COLUMN `idService` INTEGER NULL;

CREATE INDEX `User_magasinId_idx` ON `user`(`magasinId`);
CREATE UNIQUE INDEX `Jaugeage_date_cuveId_key` ON `jaugeage`(`date`, `cuveId`);

ALTER TABLE `user`
  ADD CONSTRAINT `User_magasinId_fkey` FOREIGN KEY (`magasinId`) REFERENCES `Magasin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;