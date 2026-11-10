-- CreateTable
CREATE TABLE `CustomerOrderRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestId` VARCHAR(36) NOT NULL,
    `requestHash` CHAR(64) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `phone` VARCHAR(40) NOT NULL,
    `note` VARCHAR(1000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,

    UNIQUE INDEX `CustomerOrderRequest_requestId_key`(`requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerOrderRequestItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderRequestId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `sku` VARCHAR(64) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `quantity` INTEGER NOT NULL,

    UNIQUE INDEX `CustomerOrderRequestItem_orderRequestId_productId_key`(`orderRequestId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CustomerOrderRequestItem` ADD CONSTRAINT `CustomerOrderRequestItem_orderRequestId_fkey` FOREIGN KEY (`orderRequestId`) REFERENCES `CustomerOrderRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerOrderRequestItem` ADD CONSTRAINT `CustomerOrderRequestItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
