CREATE TABLE `MobVCarCaisseAudit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `readingId` INTEGER NOT NULL,
    `actorUserId` INTEGER NULL,
    `action` ENUM('initialization', 'correction', 'closing_correction') NOT NULL,
    `oldIndex` DECIMAL(15, 3) NULL,
    `newIndex` DECIMAL(15, 3) NOT NULL,
    `reason` VARCHAR(1000) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `MobVCarCaisseAudit_readingId_createdAt_idx`(`readingId`, `createdAt`),
    INDEX `MobVCarCaisseAudit_actorUserId_idx`(`actorUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MobVCarCaisseAudit`
    ADD CONSTRAINT `MobVCarCaisseAudit_readingId_fkey`
    FOREIGN KEY (`readingId`) REFERENCES `MobVCarCaisse`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `MobVCarCaisseAudit`
    ADD CONSTRAINT `MobVCarCaisseAudit_actorUserId_fkey`
    FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
