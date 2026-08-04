-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('RENT', 'DEPOSIT', 'EXTRA');

-- AlterTable: Add new columns to Contract with defaults to handle existing data
ALTER TABLE "Contract"
  ADD COLUMN "durationMonths" INTEGER DEFAULT 12,
  ADD COLUMN "paymentDay" INTEGER DEFAULT 1,
  ALTER COLUMN "endDate" DROP NOT NULL;

-- Update durationMonths for existing contracts based on startDate and endDate
-- Calculate months between startDate and endDate
UPDATE "Contract"
SET "durationMonths" = EXTRACT(YEAR FROM "endDate")::INT * 12 + EXTRACT(MONTH FROM "endDate")::INT - (EXTRACT(YEAR FROM "startDate")::INT * 12 + EXTRACT(MONTH FROM "startDate")::INT)
WHERE "durationMonths" = 12 AND "startDate" IS NOT NULL AND "endDate" IS NOT NULL;

-- Update paymentDay from existing RentPayment due dates (extract day from oldest/first payment for each contract)
UPDATE "Contract" c
SET "paymentDay" = EXTRACT(DAY FROM rp."dueDate")::INT
FROM (
  SELECT DISTINCT ON ("contractId") "contractId", "dueDate"
  FROM "RentPayment"
  ORDER BY "contractId", "dueDate" ASC
) rp
WHERE c."id" = rp."contractId" AND c."paymentDay" = 1;

-- AlterTable: Add new columns to RentPayment
ALTER TABLE "RentPayment"
  ADD COLUMN "paymentNumber" INTEGER,
  ADD COLUMN "paymentType" "PaymentType" NOT NULL DEFAULT 'RENT',
  ADD COLUMN "totalPaymentsInContract" INTEGER;

-- Update RentPayment: set paymentNumber and totalPaymentsInContract
-- For each contract, number the payments 1, 2, 3... and count total
UPDATE "RentPayment" rp
SET
  "paymentNumber" = row_num,
  "totalPaymentsInContract" = total_count
FROM (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "contractId" ORDER BY "dueDate" ASC) as row_num,
    COUNT(*) OVER (PARTITION BY "contractId") as total_count
  FROM "RentPayment"
) numbered
WHERE rp."id" = numbered."id";
