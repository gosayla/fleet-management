-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "checklistItems" TEXT[],
ADD COLUMN     "conditionPhotos" TEXT[],
ADD COLUMN     "conditionRating" TEXT,
ADD COLUMN     "driverSignatureUrl" TEXT,
ADD COLUMN     "fuelLevel" DOUBLE PRECISION,
ADD COLUMN     "managerSignatureUrl" TEXT;
