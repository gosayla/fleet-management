-- AlterTable
ALTER TABLE "vehicle_rentals" ADD COLUMN     "checklistItems" TEXT[],
ADD COLUMN     "conditionPhotos" TEXT[],
ADD COLUMN     "conditionRating" TEXT,
ADD COLUMN     "fuelLevel" DOUBLE PRECISION,
ADD COLUMN     "managerSignatureUrl" TEXT,
ADD COLUMN     "signatureUrl" TEXT;
