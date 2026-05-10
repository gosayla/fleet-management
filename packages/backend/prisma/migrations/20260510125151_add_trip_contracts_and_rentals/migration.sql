/*
  Warnings:

  - The values [MONTHLY_CONTRACT] on the enum `TripType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "TripLeg" AS ENUM ('OUTBOUND', 'RETURN');

-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('ACTIVE', 'RETURNED', 'OVERDUE', 'CANCELLED');

-- Migrate legacy MONTHLY_CONTRACT rows to DAILY before enum rename
UPDATE "trips" SET "tripType" = 'DAILY' WHERE "tripType" = 'MONTHLY_CONTRACT';

-- AlterEnum
BEGIN;
CREATE TYPE "TripType_new" AS ENUM ('ONE_TIME', 'DAILY', 'CAR_RENT');
ALTER TABLE "trips" ALTER COLUMN "tripType" DROP DEFAULT;
ALTER TABLE "trips" ALTER COLUMN "tripType" TYPE "TripType_new" USING ("tripType"::text::"TripType_new");
ALTER TYPE "TripType" RENAME TO "TripType_old";
ALTER TYPE "TripType_new" RENAME TO "TripType";
DROP TYPE "TripType_old";
ALTER TABLE "trips" ALTER COLUMN "tripType" SET DEFAULT 'ONE_TIME';
COMMIT;

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "contractId" TEXT,
ADD COLUMN     "leg" "TripLeg",
ADD COLUMN     "tripDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "trip_contracts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT,
    "contractNumber" TEXT,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "contractStart" TIMESTAMP(3) NOT NULL,
    "contractEnd" TIMESTAMP(3) NOT NULL,
    "departureTime" TEXT NOT NULL,
    "returnTime" TEXT,
    "isTwoWay" BOOLEAN NOT NULL DEFAULT true,
    "excludeFridays" BOOLEAN NOT NULL DEFAULT true,
    "excludeSaturdays" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_vacations" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_vacations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_rentals" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT,
    "clientNationalId" TEXT,
    "contractNumber" TEXT,
    "rentalStart" TIMESTAMP(3) NOT NULL,
    "rentalEnd" TIMESTAMP(3) NOT NULL,
    "odometerOut" DOUBLE PRECISION,
    "odometerIn" DOUBLE PRECISION,
    "dailyRateSar" DOUBLE PRECISION,
    "contractFileUrl" TEXT,
    "status" "RentalStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_rentals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_contracts_companyId_idx" ON "trip_contracts"("companyId");

-- CreateIndex
CREATE INDEX "trip_contracts_vehicleId_idx" ON "trip_contracts"("vehicleId");

-- CreateIndex
CREATE INDEX "trip_contracts_driverId_idx" ON "trip_contracts"("driverId");

-- CreateIndex
CREATE INDEX "contract_vacations_contractId_idx" ON "contract_vacations"("contractId");

-- CreateIndex
CREATE INDEX "vehicle_rentals_companyId_idx" ON "vehicle_rentals"("companyId");

-- CreateIndex
CREATE INDEX "vehicle_rentals_vehicleId_idx" ON "vehicle_rentals"("vehicleId");

-- CreateIndex
CREATE INDEX "trips_contractId_idx" ON "trips"("contractId");

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "trip_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_contracts" ADD CONSTRAINT "trip_contracts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_contracts" ADD CONSTRAINT "trip_contracts_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_contracts" ADD CONSTRAINT "trip_contracts_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_vacations" ADD CONSTRAINT "contract_vacations_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "trip_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_rentals" ADD CONSTRAINT "vehicle_rentals_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_rentals" ADD CONSTRAINT "vehicle_rentals_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
