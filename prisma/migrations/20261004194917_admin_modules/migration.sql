-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "modules" TEXT[] DEFAULT ARRAY['orders', 'products', 'customers', 'delivery']::TEXT[];

