-- AlterTable
ALTER TABLE `CustomerOrderRequest` ADD COLUMN `deliveryAddress` VARCHAR(500) NULL,
    ADD COLUMN `deliveryFee` DECIMAL(12, 2) NULL,
    ADD COLUMN `demoPayment` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `paymentProof` MEDIUMBLOB NULL,
    ADD COLUMN `paymentProofType` VARCHAR(16) NULL,
    ADD COLUMN `proofNeedsReplacement` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `proofSubmittedAt` DATETIME(3) NULL;
