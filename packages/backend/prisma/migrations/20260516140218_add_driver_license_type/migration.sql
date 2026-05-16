-- CreateEnum
CREATE TYPE "DriverLicenseType" AS ENUM ('PRIVATE', 'PUBLIC', 'MOTORCYCLE', 'LIGHT_TRUCK', 'HEAVY_TRUCK', 'BUS', 'HEAVY_MACHINERY');

-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "licenseType" "DriverLicenseType";
