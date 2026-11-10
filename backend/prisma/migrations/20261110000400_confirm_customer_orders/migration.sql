-- AlterTable
ALTER TABLE `CustomerOrderRequest` ADD COLUMN `completedAt` DATETIME(3) NULL,
    ADD COLUMN `confirmedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `StockMovement` ADD COLUMN `customerOrderItemId` INTEGER NULL,
    MODIFY `kind` ENUM('OPENING', 'ADJUSTMENT', 'RESTOCK', 'ORDER_CONFIRMED') NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `StockMovement_customerOrderItemId_key` ON `StockMovement`(`customerOrderItemId`);

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_customerOrderItemId_fkey` FOREIGN KEY (`customerOrderItemId`) REFERENCES `CustomerOrderRequestItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
