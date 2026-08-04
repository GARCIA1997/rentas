-- AlterEnum
ALTER TYPE "ContractStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3);
