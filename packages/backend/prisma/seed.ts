import { PrismaClient, VehicleType, VehicleStatus, DriverStatus, UserRole, MaintenanceType, MaintenanceStatus, DocumentType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Company
  const company = await prisma.company.upsert({
    where: { crNumber: '1010123456' },
    update: { tammSubscriptionId: '7029295180' },
    create: {
      name: 'Al-Rashed Transport Co.',
      crNumber: '1010123456',
      tammSubscriptionId: '7029295180',
    },
  });

  // Admin user
  const password = await argon2.hash('Admin@1234');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@alrashed.sa' },
    update: {},
    create: {
      email: 'admin@alrashed.sa',
      password,
      fullName: 'Fleet Admin',
      phone: '+966500000000',
      role: UserRole.FLEET_MANAGER,
      companyId: company.id,
    },
  });

  // Vehicles
  const vehicles = await Promise.all([
    prisma.vehicle.upsert({
      where: { vin: 'SA1FB2C14PA001001' },
      update: {},
      create: {
        plateNumber: 'ABC 1234',
        make: 'Toyota',
        model: 'Land Cruiser',
        year: 2022,
        color: 'White',
        type: VehicleType.SUV,
        vin: 'SA1FB2C14PA001001',
        odometer: 45200,
        fuelCapacity: 87,
        status: VehicleStatus.ACTIVE,
        companyId: company.id,
      },
    }),
    prisma.vehicle.upsert({
      where: { vin: 'SA1FB2C14PA002002' },
      update: {},
      create: {
        plateNumber: 'XYZ 5678',
        make: 'Hino',
        model: '500 Series',
        year: 2021,
        color: 'Blue',
        type: VehicleType.TRUCK,
        vin: 'SA1FB2C14PA002002',
        odometer: 120350,
        fuelCapacity: 200,
        status: VehicleStatus.ACTIVE,
        companyId: company.id,
      },
    }),
    prisma.vehicle.upsert({
      where: { vin: 'SA1FB2C14PA003003' },
      update: {},
      create: {
        plateNumber: 'DEF 9012',
        make: 'Mercedes-Benz',
        model: 'Sprinter',
        year: 2023,
        color: 'Silver',
        type: VehicleType.VAN,
        vin: 'SA1FB2C14PA003003',
        odometer: 18000,
        fuelCapacity: 75,
        status: VehicleStatus.MAINTENANCE,
        companyId: company.id,
      },
    }),
  ]);

  // Drivers
  const drivers = await Promise.all([
    prisma.driver.upsert({
      where: { companyId_nationalId: { companyId: company.id, nationalId: '1098765432' } },
      update: {},
      create: {
        fullName: 'Mohammed Al-Qahtani',
        phone: '+966511111111',
        nationalId: '1098765432',
        licenseNumber: 'DL-2024-00112',
        licenseExpiry: new Date('2026-05-01'),
        status: DriverStatus.ACTIVE,
        companyId: company.id,
      },
    }),
    prisma.driver.upsert({
      where: { companyId_nationalId: { companyId: company.id, nationalId: '1087654321' } },
      update: {},
      create: {
        fullName: 'Ahmed Al-Dosari',
        phone: '+966522222222',
        nationalId: '1087654321',
        licenseNumber: 'DL-2023-00445',
        licenseExpiry: new Date('2025-11-30'),
        status: DriverStatus.ACTIVE,
        companyId: company.id,
      },
    }),
  ]);

  // Seed documents
  await prisma.fleetDocument.deleteMany({
    where: {
      companyId: company.id,
      referenceNumber: { startsWith: 'SEED-DOC-' },
    },
  });

  await prisma.fleetDocument.createMany({
    data: [
      {
        companyId: company.id,
        vehicleId: vehicles[0].id,
        type: DocumentType.VEHICLE_REGISTRATION,
        fileUrl: 'https://example.com/docs/seed-registration.pdf',
        issueDate: new Date('2025-01-01'),
        expiryDate: new Date('2026-12-31'),
        issuingAuthority: 'Traffic Department',
        referenceNumber: 'SEED-DOC-REG-001',
      },
      {
        companyId: company.id,
        vehicleId: vehicles[1].id,
        type: DocumentType.VEHICLE_INSURANCE,
        fileUrl: 'https://example.com/docs/seed-insurance.pdf',
        issueDate: new Date('2025-06-01'),
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15),
        issuingAuthority: 'Insurance Provider',
        referenceNumber: 'SEED-DOC-INS-001',
      },
      {
        companyId: company.id,
        driverId: drivers[0].id,
        type: DocumentType.DRIVER_LICENSE,
        fileUrl: 'https://example.com/docs/seed-driver-license.pdf',
        issueDate: new Date('2024-01-01'),
        expiryDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
        issuingAuthority: 'Licensing Authority',
        referenceNumber: 'SEED-DOC-DL-001',
      },
    ],
  });

  // Maintenance log
  await prisma.maintenanceLog.create({
    data: {
      vehicleId: vehicles[2].id,
      type: MaintenanceType.UNSCHEDULED,
      description: 'Engine oil leak repair + gasket replacement',
      scheduledDate: new Date(),
      status: MaintenanceStatus.IN_PROGRESS,
      companyId: company.id,
    },
  });

  console.log(`✅ Seeded: company="${company.name}", admin="${admin.email}"`);
  console.log(`   Vehicles: ${vehicles.length}, with demo maintenance log`);
  console.log(`\n   Login: admin@alrashed.sa / Admin@1234`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
