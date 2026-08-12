-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "address" TEXT,
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "curp" VARCHAR(18),
ADD COLUMN     "ineBackUrl" TEXT,
ADD COLUMN     "ineFrontUrl" TEXT;

