-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "representativeId" TEXT;

-- CreateTable
CREATE TABLE "Representative" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "position" TEXT,
    "idDocument" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "signatureImageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Representative_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Representative_isActive_idx" ON "Representative"("isActive");

-- CreateIndex
CREATE INDEX "Contract_representativeId_idx" ON "Contract"("representativeId");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_representativeId_fkey" FOREIGN KEY ("representativeId") REFERENCES "Representative"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Representative" ADD CONSTRAINT "Representative_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
