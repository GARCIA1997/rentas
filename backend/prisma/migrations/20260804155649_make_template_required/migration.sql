/*
  Warnings:

  - Made the column `templateUsed` on table `Contract` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Contract" ALTER COLUMN "templateUsed" SET NOT NULL;
