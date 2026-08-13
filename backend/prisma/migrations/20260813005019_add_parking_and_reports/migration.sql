/*
  Warnings:

  - The `status` column on the `MaintenanceReport` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "MaintenanceReportStatus" AS ENUM ('REPORTED', 'IN_PROGRESS', 'RESOLVED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REPORT_STATUS_CHANGED';

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "hasParking" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "MaintenanceReport" DROP COLUMN "status",
ADD COLUMN     "status" "MaintenanceReportStatus" NOT NULL DEFAULT 'REPORTED';

-- CreateIndex
CREATE INDEX "MaintenanceReport_propertyId_idx" ON "MaintenanceReport"("propertyId");

-- CreateIndex
CREATE INDEX "MaintenanceReport_status_idx" ON "MaintenanceReport"("status");

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
