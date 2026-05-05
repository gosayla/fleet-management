-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "bodyType" TEXT,
ADD COLUMN     "inspectionExpiryDate" TIMESTAMP(3),
ADD COLUMN     "insuranceStatus" TEXT,
ADD COLUMN     "licenseExpiryDate" TIMESTAMP(3),
ADD COLUMN     "licenseIssuanceDate" TIMESTAMP(3),
ADD COLUMN     "mvpiStatus" TEXT,
ADD COLUMN     "ownershipDate" TIMESTAMP(3),
ADD COLUMN     "plateType" TEXT,
ADD COLUMN     "restrictionStatus" TEXT,
ADD COLUMN     "sequenceNumber" TEXT,
ALTER COLUMN "fuelCapacity" SET DEFAULT 0;
