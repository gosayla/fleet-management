-- CreateEnum
CREATE TYPE "VehicleUsageType" AS ENUM ('FLEET', 'STAFF');

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "usageType" "VehicleUsageType" NOT NULL DEFAULT 'FLEET';

-- CreateTable
CREATE TABLE "staff_vehicle_assignments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "assigneeName" TEXT NOT NULL,
    "assigneeTitle" TEXT,
    "assigneePhone" TEXT,
    "assigneeNationalId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    "odometerOut" DOUBLE PRECISION,
    "odometerIn" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_vehicle_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_vehicle_assignments_companyId_idx" ON "staff_vehicle_assignments"("companyId");

-- CreateIndex
CREATE INDEX "staff_vehicle_assignments_vehicleId_idx" ON "staff_vehicle_assignments"("vehicleId");

-- AddForeignKey
ALTER TABLE "staff_vehicle_assignments" ADD CONSTRAINT "staff_vehicle_assignments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_vehicle_assignments" ADD CONSTRAINT "staff_vehicle_assignments_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
