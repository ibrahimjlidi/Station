ALTER TABLE `recettecaisse`
  ADD COLUMN `reserveDepart` DECIMAL(15, 3) NOT NULL DEFAULT 0,
  ADD COLUMN `recetteTheorique` DECIMAL(15, 3) NOT NULL DEFAULT 0,
  ADD COLUMN `ecartRecette` DECIMAL(15, 3) NOT NULL DEFAULT 0,
  ADD COLUMN `reserveFinTheorique` DECIMAL(15, 3) NOT NULL DEFAULT 0,
  ADD COLUMN `reserveFinAttendue` DECIMAL(15, 3) NOT NULL DEFAULT 0,
  ADD COLUMN `ecartCaisse` DECIMAL(15, 3) NOT NULL DEFAULT 0,
  ADD COLUMN `seuilTolerance` DECIMAL(15, 3) NOT NULL DEFAULT 0.500,
  ADD COLUMN `commentaireEcart` TEXT NULL,
  ADD COLUMN `validePar` INTEGER NULL;

CREATE INDEX `RecetteCaisse_ecartCaisse_idx` ON `recettecaisse`(`ecartCaisse`);
