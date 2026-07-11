/*
  Warnings:

  - Added the required column `appliedFee` to the `opd_consultations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalFee` to the `opd_consultations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tokenNumber` to the `opd_consultations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "BillingStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "opd_consultations" ADD COLUMN     "appliedFee" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "originalFee" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "overrideReason" TEXT,
ADD COLUMN     "tokenNumber" INTEGER NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "patient_deposits" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "opdConsultationId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "collectedBy" UUID NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRefunded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "patient_deposits_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "patient_deposits" ADD CONSTRAINT "patient_deposits_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_deposits" ADD CONSTRAINT "patient_deposits_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_deposits" ADD CONSTRAINT "patient_deposits_opdConsultationId_fkey" FOREIGN KEY ("opdConsultationId") REFERENCES "opd_consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
