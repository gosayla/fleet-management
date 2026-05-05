-- CreateTable
CREATE TABLE "tamm_actual_driver_sessions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "conversationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tamm_actual_driver_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tamm_actual_driver_sessions_conversationId_key" ON "tamm_actual_driver_sessions"("conversationId");

-- CreateIndex
CREATE INDEX "tamm_actual_driver_sessions_companyId_idx" ON "tamm_actual_driver_sessions"("companyId");

-- CreateIndex
CREATE INDEX "tamm_actual_driver_sessions_vehicleId_idx" ON "tamm_actual_driver_sessions"("vehicleId");

-- CreateIndex
CREATE INDEX "tamm_actual_driver_sessions_driverId_idx" ON "tamm_actual_driver_sessions"("driverId");