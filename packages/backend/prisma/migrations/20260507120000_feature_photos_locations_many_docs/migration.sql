-- Migration: many-to-many documents↔vehicles/drivers, vehicle photos, trip locations, driver photo

-- Step 1: Create implicit many-to-many join table for FleetDocument ↔ Vehicle
CREATE TABLE "_FleetDocumentToVehicle" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  CONSTRAINT "_FleetDocumentToVehicle_AB_pkey" PRIMARY KEY ("A","B")
);
CREATE INDEX "_FleetDocumentToVehicle_B_index" ON "_FleetDocumentToVehicle"("B");

-- Step 2: Create implicit many-to-many join table for Driver ↔ FleetDocument
CREATE TABLE "_DriverToFleetDocument" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  CONSTRAINT "_DriverToFleetDocument_AB_pkey" PRIMARY KEY ("A","B")
);
CREATE INDEX "_DriverToFleetDocument_B_index" ON "_DriverToFleetDocument"("B");

-- Step 3: Migrate existing vehicleId data into the join table
INSERT INTO "_FleetDocumentToVehicle" ("A", "B")
SELECT "id", "vehicleId"
FROM "fleet_documents"
WHERE "vehicleId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 4: Migrate existing driverId data into the join table
INSERT INTO "_DriverToFleetDocument" ("A", "B")
SELECT "driverId", "id"
FROM "fleet_documents"
WHERE "driverId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 5: Add FK constraints for _FleetDocumentToVehicle
ALTER TABLE "_FleetDocumentToVehicle"
  ADD CONSTRAINT "_FleetDocumentToVehicle_A_fkey"
  FOREIGN KEY ("A") REFERENCES "fleet_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_FleetDocumentToVehicle"
  ADD CONSTRAINT "_FleetDocumentToVehicle_B_fkey"
  FOREIGN KEY ("B") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Add FK constraints for _DriverToFleetDocument
ALTER TABLE "_DriverToFleetDocument"
  ADD CONSTRAINT "_DriverToFleetDocument_A_fkey"
  FOREIGN KEY ("A") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_DriverToFleetDocument"
  ADD CONSTRAINT "_DriverToFleetDocument_B_fkey"
  FOREIGN KEY ("B") REFERENCES "fleet_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Drop old vehicleId and driverId from fleet_documents
ALTER TABLE "fleet_documents" DROP COLUMN IF EXISTS "vehicleId";
ALTER TABLE "fleet_documents" DROP COLUMN IF EXISTS "driverId";

-- Step 8: Add notes column to fleet_documents
ALTER TABLE "fleet_documents" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Step 9: Add photoUrl column to drivers
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;

-- Step 10: Create vehicle_photos table
CREATE TABLE "vehicle_photos" (
  "id" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "isProfile" BOOLEAN NOT NULL DEFAULT false,
  "caption" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vehicle_photos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vehicle_photos_vehicleId_idx" ON "vehicle_photos"("vehicleId");
ALTER TABLE "vehicle_photos"
  ADD CONSTRAINT "vehicle_photos_vehicleId_fkey"
  FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 11: Create trip_locations table
CREATE TABLE "trip_locations" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "lat" DOUBLE PRECISION NOT NULL,
  "lng" DOUBLE PRECISION NOT NULL,
  "speed" DOUBLE PRECISION,
  "heading" DOUBLE PRECISION,
  "recordedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trip_locations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "trip_locations_tripId_idx" ON "trip_locations"("tripId");
ALTER TABLE "trip_locations"
  ADD CONSTRAINT "trip_locations_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
