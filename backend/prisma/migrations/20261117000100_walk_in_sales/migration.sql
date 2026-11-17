-- AlterTable
ALTER TABLE `StockMovement` ADD COLUMN `walkInSaleItemId` INTEGER NULL,
    MODIFY `kind` ENUM('OPENING', 'ADJUSTMENT', 'RESTOCK', 'ORDER_CONFIRMED', 'WALK_IN_SALE') NOT NULL;

-- CreateTable
CREATE TABLE `WalkInSale` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestId` VARCHAR(36) NOT NULL,
    `requestHash` CHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `WalkInSale_requestId_key`(`requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WalkInSaleItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `saleId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `sku` VARCHAR(64) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `quantity` INTEGER NOT NULL,

    UNIQUE INDEX `WalkInSaleItem_saleId_productId_key`(`saleId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `StockMovement_walkInSaleItemId_key` ON `StockMovement`(`walkInSaleItemId`);

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_walkInSaleItemId_fkey` FOREIGN KEY (`walkInSaleItemId`) REFERENCES `WalkInSaleItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WalkInSaleItem` ADD CONSTRAINT `WalkInSaleItem_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `WalkInSale`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WalkInSaleItem` ADD CONSTRAINT `WalkInSaleItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
