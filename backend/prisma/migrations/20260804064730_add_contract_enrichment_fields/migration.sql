-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "convivanceRules" TEXT,
ADD COLUMN     "inventory" JSONB,
ADD COLUMN     "landlordsInfo" JSONB,
ADD COLUMN     "utilities" JSONB,
ADD COLUMN     "witnessInfo" JSONB;
