-- AlterTable
ALTER TABLE "staff_vehicle_assignments" ADD COLUMN     "conditionPhotos" TEXT[],
ADD COLUMN     "conditionRating" TEXT,
ADD COLUMN     "fuelLevel" DOUBLE PRECISION,
ADD COLUMN     "signatureUrl" TEXT;
