-- AlterEnum
-- RESOLVED se renombra a CLOSED (mismo estado final del hilo, nombre nuevo) — el cast
-- directo old::text::new falla si ya existen filas con status = 'RESOLVED' en la BD,
-- así que se mapea explícitamente en vez de asumir coincidencia 1:1 de valores.
BEGIN;
CREATE TYPE "MaintenanceReportStatus_new" AS ENUM ('REPORTED', 'IN_PROGRESS', 'CLOSED');
ALTER TABLE "MaintenanceReport" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "MaintenanceReport" ALTER COLUMN "status" TYPE "MaintenanceReportStatus_new" USING (
  CASE "status"::text
    WHEN 'RESOLVED' THEN 'CLOSED'
    ELSE "status"::text
  END
)::"MaintenanceReportStatus_new";
ALTER TYPE "MaintenanceReportStatus" RENAME TO "MaintenanceReportStatus_old";
ALTER TYPE "MaintenanceReportStatus_new" RENAME TO "MaintenanceReportStatus";
DROP TYPE "MaintenanceReportStatus_old";
ALTER TABLE "MaintenanceReport" ALTER COLUMN "status" SET DEFAULT 'REPORTED';
COMMIT;

-- CreateTable
CREATE TABLE "ReportMessage" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportMessage_reportId_idx" ON "ReportMessage"("reportId");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- AddForeignKey
ALTER TABLE "ReportMessage" ADD CONSTRAINT "ReportMessage_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "MaintenanceReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportMessage" ADD CONSTRAINT "ReportMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

