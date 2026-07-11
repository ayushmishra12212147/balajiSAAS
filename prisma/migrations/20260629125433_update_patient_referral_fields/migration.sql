/*
  Warnings:

  - You are about to drop the column `referredByDoctor` on the `patient_referrals` table. All the data in the column will be lost.
  - You are about to drop the column `referredByHospital` on the `patient_referrals` table. All the data in the column will be lost.
  - Added the required column `referralName` to the `patient_referrals` table without a default value. This is not possible if the table is not empty.
  - Added the required column `referralType` to the `patient_referrals` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "patient_referrals" DROP COLUMN "referredByDoctor",
DROP COLUMN "referredByHospital",
ADD COLUMN     "referralName" VARCHAR(150) NOT NULL,
ADD COLUMN     "referralType" VARCHAR(50) NOT NULL;

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "alternatePhone" VARCHAR(20),
ADD COLUMN     "remarks" TEXT;
