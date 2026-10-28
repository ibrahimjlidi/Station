/*
  Warnings:

  - A unique constraint covering the columns `[stationId]` on the table `SetParam` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `setparam` ADD COLUMN `stationId` INTEGER NULL;

-- CreateTable
CREATE TABLE `Station` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `nom` VARCHAR(160) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Station_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Magasin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stationId` INTEGER NOT NULL,
    `code` VARCHAR(30) NOT NULL,
    `nom` VARCHAR(160) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Magasin_stationId_key`(`stationId`),
    UNIQUE INDEX `Magasin_stationId_code_key`(`stationId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `SetParam_stationId_key` ON `SetParam`(`stationId`);

-- AddForeignKey
ALTER TABLE `Magasin` ADD CONSTRAINT `Magasin_stationId_fkey` FOREIGN KEY (`stationId`) REFERENCES `Station`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SetParam` ADD CONSTRAINT `SetParam_stationId_fkey` FOREIGN KEY (`stationId`) REFERENCES `Station`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
