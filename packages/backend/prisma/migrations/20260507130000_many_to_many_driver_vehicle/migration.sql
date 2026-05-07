-- DropForeignKey
ALTER TABLE "vehicles" DROP CONSTRAINT IF EXISTS "vehicles_assignedDriverId_fkey";

-- DropForeignKey
ALTER TABLE "drivers" DROP CONSTRAINT IF EXISTS "drivers_assignedVehicleId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "vehicles_assignedDriverId_key";

-- DropIndex
DROP INDEX IF EXISTS "drivers_assignedVehicleId_key";

-- AlterTable
ALTER TABLE "vehicles" DROP COLUMN IF EXISTS "assignedDriverId";

-- AlterTable
ALTER TABLE "drivers" DROP COLUMN IF EXISTS "assignedVehicleId";

-- CreateTable
CREATE TABLE "_DriverToVehicle" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "_DriverToVehicle_AB_unique" ON "_DriverToVehicle"("A", "B");

-- CreateIndex
CREATE INDEX "_DriverToVehicle_B_index" ON "_DriverToVehicle"("B");

-- AddForeignKey
ALTER TABLE "_DriverToVehicle" ADD CONSTRAINT "_DriverToVehicle_A_fkey" FOREIGN KEY ("A") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DriverToVehicle" ADD CONSTRAINT "_DriverToVehicle_B_fkey" FOREIGN KEY ("B") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
