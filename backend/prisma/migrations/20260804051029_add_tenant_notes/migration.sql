/*
  Warnings:

  - Made the column `durationMonths` on table `Contract` required. This step will fail if there are existing NULL values in that column.
  - Made the column `paymentDay` on table `Contract` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Contract" ALTER COLUMN "durationMonths" SET NOT NULL,
ALTER COLUMN "durationMonths" DROP DEFAULT,
ALTER COLUMN "paymentDay" SET NOT NULL,
ALTER COLUMN "paymentDay" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "notes" TEXT;
