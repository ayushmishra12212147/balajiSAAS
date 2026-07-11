-- AlterTable
ALTER TABLE "audits" ADD COLUMN     "requestId" VARCHAR(50);

-- AlterTable
ALTER TABLE "hospitals" ADD COLUMN     "footerText" TEXT,
ADD COLUMN     "gstNumber" VARCHAR(50),
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "registrationNumber" VARCHAR(100),
ADD COLUMN     "website" VARCHAR(150);

-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "category" VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
ADD COLUMN     "dataType" VARCHAR(30) NOT NULL DEFAULT 'STRING',
ADD COLUMN     "description" TEXT;
