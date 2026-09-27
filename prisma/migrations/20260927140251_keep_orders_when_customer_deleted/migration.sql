-- Keep orders (and revenue history) when a customer is permanently deleted:
-- snapshot who ordered onto the order and null out the FK instead of cascading.

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_customerId_fkey";

-- AlterTable: add snapshot columns, backfill from the customer, then enforce NOT NULL
ALTER TABLE "Order" ADD COLUMN "customerName" TEXT,
ADD COLUMN "customerPhone" TEXT,
ALTER COLUMN "customerId" DROP NOT NULL;

UPDATE "Order" o
SET "customerName" = c."name", "customerPhone" = c."phone"
FROM "Customer" c
WHERE c."id" = o."customerId";

ALTER TABLE "Order" ALTER COLUMN "customerName" SET NOT NULL,
ALTER COLUMN "customerPhone" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
