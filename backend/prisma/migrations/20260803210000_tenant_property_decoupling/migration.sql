-- DropForeignKey
ALTER TABLE "Tenant" DROP CONSTRAINT "Tenant_propertyId_fkey";

-- DropIndex
DROP INDEX "Tenant_propertyId_idx";

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "bedrooms" INTEGER,
ADD COLUMN     "bathrooms" INTEGER;

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "propertyId",
DROP COLUMN "moveInDate";
