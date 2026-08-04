-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "previousContractId" TEXT;

-- CreateIndex
CREATE INDEX "Contract_previousContractId_idx" ON "Contract"("previousContractId");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_previousContractId_fkey" FOREIGN KEY ("previousContractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
