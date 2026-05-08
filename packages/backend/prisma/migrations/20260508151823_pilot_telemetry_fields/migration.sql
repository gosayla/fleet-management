/*
  Warnings:

  - The primary key for the `_DriverToFleetDocument` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_FleetDocumentToVehicle` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[A,B]` on the table `_DriverToFleetDocument` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[A,B]` on the table `_FleetDocumentToVehicle` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "_DriverToFleetDocument" DROP CONSTRAINT "_DriverToFleetDocument_AB_pkey";

-- AlterTable
ALTER TABLE "_FleetDocumentToVehicle" DROP CONSTRAINT "_FleetDocumentToVehicle_AB_pkey";

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "pilotBatteryVoltage" DOUBLE PRECISION,
ADD COLUMN     "pilotIgnitionOn" BOOLEAN,
ADD COLUMN     "pilotImei" TEXT,
ADD COLUMN     "pilotLastMove" TIMESTAMP(3),
ADD COLUMN     "pilotLastStop" TIMESTAMP(3),
ADD COLUMN     "pilotLoadWeight" DOUBLE PRECISION,
ADD COLUMN     "pilotMotorHours" DOUBLE PRECISION,
ADD COLUMN     "pilotProviderMileage" DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "_DriverToFleetDocument_AB_unique" ON "_DriverToFleetDocument"("A", "B");

-- CreateIndex
CREATE UNIQUE INDEX "_FleetDocumentToVehicle_AB_unique" ON "_FleetDocumentToVehicle"("A", "B");
