-- AlterTable
ALTER TABLE `caisse` ADD COLUMN `magasinId` INTEGER NULL;

-- AlterTable
ALTER TABLE `cuve` ADD COLUMN `magasinId` INTEGER NULL;

-- AlterTable
ALTER TABLE `equipe` ADD COLUMN `magasinId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Cuve` ADD CONSTRAINT `Cuve_magasinId_fkey` FOREIGN KEY (`magasinId`) REFERENCES `Magasin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Equipe` ADD CONSTRAINT `Equipe_magasinId_fkey` FOREIGN KEY (`magasinId`) REFERENCES `Magasin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Caisse` ADD CONSTRAINT `Caisse_magasinId_fkey` FOREIGN KEY (`magasinId`) REFERENCES `Magasin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
