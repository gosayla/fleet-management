-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('ONE_TIME', 'DAILY', 'MONTHLY_CONTRACT');

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "clientName" TEXT,
ADD COLUMN     "contractEnd" TIMESTAMP(3),
ADD COLUMN     "contractNumber" TEXT,
ADD COLUMN     "contractStart" TIMESTAMP(3),
ADD COLUMN     "tripType" "TripType" NOT NULL DEFAULT 'ONE_TIME';
