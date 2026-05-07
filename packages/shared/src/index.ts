// ─── Enums ────────────────────────────────────────────────────────────────────

export enum VehicleStatus {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  INACTIVE = 'INACTIVE',
  RETIRED = 'RETIRED',
}

export enum VehicleType {
  SEDAN = 'SEDAN',
  SUV = 'SUV',
  TRUCK = 'TRUCK',
  VAN = 'VAN',
  BUS = 'BUS',
  MOTORCYCLE = 'MOTORCYCLE',
  HEAVY_EQUIPMENT = 'HEAVY_EQUIPMENT',
}

export enum DriverStatus {
  ACTIVE = 'ACTIVE',
  OFF_DUTY = 'OFF_DUTY',
  ON_LEAVE = 'ON_LEAVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

export enum TripStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TripType {
  ONE_TIME = 'ONE_TIME',
  DAILY = 'DAILY',
  MONTHLY_CONTRACT = 'MONTHLY_CONTRACT',
}

export enum MaintenanceType {
  SCHEDULED = 'SCHEDULED',
  UNSCHEDULED = 'UNSCHEDULED',
  EMERGENCY = 'EMERGENCY',
}

export enum MaintenanceStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum DocumentType {
  VEHICLE_REGISTRATION = 'VEHICLE_REGISTRATION',
  VEHICLE_INSURANCE = 'VEHICLE_INSURANCE',
  PERIODIC_INSPECTION = 'PERIODIC_INSPECTION',
  DRIVER_LICENSE = 'DRIVER_LICENSE',
  TRANSPORT_PERMIT = 'TRANSPORT_PERMIT',
  OWNERSHIP_DEED = 'OWNERSHIP_DEED',
  OPERATION_CARD = 'OPERATION_CARD',
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  FLEET_MANAGER = 'FLEET_MANAGER',
  DISPATCHER = 'DISPATCHER',
  DRIVER = 'DRIVER',
  VIEWER = 'VIEWER',
}

export enum PermitStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum BloodType {
  A_POS = 'A_POS',
  A_NEG = 'A_NEG',
  B_POS = 'B_POS',
  B_NEG = 'B_NEG',
  AB_POS = 'AB_POS',
  AB_NEG = 'AB_NEG',
  O_POS = 'O_POS',
  O_NEG = 'O_NEG',
}

// ─── User / Auth ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  companyId: string;
  fcmToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokenPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  companyId: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  companyName: string;
}

export interface AuthResponse {
  accessToken: string;
  user: Omit<User, 'createdAt' | 'updatedAt'>;
}

// ─── Company ──────────────────────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  crNumber: string; // Commercial Registration number
  tammSubscriptionId?: string;
  naqlCompanyCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Vehicle ──────────────────────────────────────────────────────────────────

export interface Vehicle {
  id: string;
  companyId: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  color: string;
  type: VehicleType;
  status: VehicleStatus;
  vin: string;
  odometer: number; // km
  fuelCapacity: number; // liters
  assignedDriverId?: string;
  tammVehicleId?: string; // Tamm platform reference
  licenseExpiryDate?: string;
  insuranceExpiryDate?: string;
  operationCardNumber?: string;
  operationCardIssueDate?: string;
  operationCardExpiryDate?: string;
  operationCardRenewDate?: string;
  operationCardFileUrl?: string;
  lastLocation?: GeoPoint;
  lastLocationAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVehicleDto {
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  color: string;
  type: VehicleType;
  vin: string;
  odometer: number;
  fuelCapacity: number;
  operationCardNumber?: string;
  operationCardIssueDate?: string;
  operationCardExpiryDate?: string;
  operationCardRenewDate?: string;
  operationCardFileUrl?: string;
  licenseExpiryDate?: string;
  insuranceExpiryDate?: string;
}

export interface UpdateVehicleDto extends Partial<CreateVehicleDto> {
  status?: VehicleStatus;
  assignedDriverId?: string;
}

// ─── Driver ───────────────────────────────────────────────────────────────────

export interface Driver {
  id: string;
  companyId: string;
  userId?: string;
  fullName: string;
  phone: string;
  email?: string;
  nationalId: string;
  licenseNumber: string;
  licenseExpiry: Date;
  bloodType?: BloodType;
  status: DriverStatus;
  assignedVehicleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDriverDto {
  fullName: string;
  phone: string;
  email: string;
  accountPassword: string;
  nationalId: string;
  licenseNumber: string;
  licenseExpiry: Date;
  bloodType?: BloodType;
}

export interface UpdateDriverDto extends Partial<CreateDriverDto> {
  status?: DriverStatus;
  assignedVehicleId?: string;
}

// ─── Trip ─────────────────────────────────────────────────────────────────────

export interface Trip {
  id: string;
  companyId: string;
  vehicleId: string;
  driverId: string;
  status: TripStatus;
  tripType: TripType;
  origin: string;
  destination: string;
  originCoords?: GeoPoint;
  destinationCoords?: GeoPoint;
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  distanceKm?: number;
  notes?: string;
  naqlPermitId?: string;
  clientName?: string;
  contractNumber?: string;
  contractStart?: Date;
  contractEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTripDto {
  vehicleId: string;
  driverId: string;
  tripType?: TripType;
  origin: string;
  destination: string;
  originCoords?: GeoPoint;
  destinationCoords?: GeoPoint;
  scheduledStart: Date;
  scheduledEnd: Date;
  notes?: string;
  clientName?: string;
  contractNumber?: string;
  contractStart?: Date;
  contractEnd?: Date;
}

// ─── GPS / Real-time ──────────────────────────────────────────────────────────

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface VehicleLocationUpdate {
  vehicleId: string;
  driverId: string;
  location: GeoPoint;
  speed?: number; // km/h
  heading?: number; // degrees 0-360
  timestamp: Date;
}

// ─── Maintenance ──────────────────────────────────────────────────────────────

export interface MaintenanceLog {
  id: string;
  companyId: string;
  vehicleId: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  description: string;
  scheduledDate: Date;
  completedDate?: Date;
  costSar?: number;
  odometerAtService?: number;
  nextServiceKm?: number;
  nextServiceDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMaintenanceDto {
  vehicleId: string;
  type: MaintenanceType;
  description: string;
  scheduledDate: Date;
  nextServiceKm?: number;
  nextServiceDate?: Date;
}

// ─── Fuel ─────────────────────────────────────────────────────────────────────

export interface FuelLog {
  id: string;
  companyId: string;
  vehicleId: string;
  driverId?: string;
  liters: number;
  costSar: number;
  odometer: number;
  station?: string;
  filledAt: Date;
  createdAt: Date;
}

export interface CreateFuelLogDto {
  vehicleId: string;
  driverId?: string;
  liters: number;
  costSar: number;
  odometer: number;
  station?: string;
  filledAt: Date;
}

// ─── Document ─────────────────────────────────────────────────────────────────

export interface FleetDocument {
  id: string;
  companyId: string;
  vehicleId?: string;
  driverId?: string;
  type: DocumentType;
  fileUrl: string;
  issueDate: Date;
  expiryDate: Date;
  issuingAuthority?: string;
  referenceNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Tamm Integration ─────────────────────────────────────────────────────────

/** Saudi licence plate decomposed into its letter + number parts */
export interface TammPlateDto {
  text1: string;
  text2: string;
  text3: string;
  number: number;
  type: { code: number; nameAr?: string; nameEn?: string };
}

/** Legacy vehicle shape (no real company-list endpoint on Tamm) */
export interface TammVehicle {
  vehicleId: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  registrationExpiry: Date;
  inspectionExpiry: Date;
  insuranceExpiry: Date;
  owner: string;
}

/** Normalised violation — compatible with the local DB upsert in sync service */
export interface TammViolation {
  violationId: string;
  plateNumber: string;
  vehicleId: string;
  description: string;
  amount: number;
  issuedAt: Date;
  location?: string;
  isPaid: boolean;
}

export interface TammDelegation {
  delegationId: string;
  vehicleId: string;
  delegateName: string;
  delegateNationalId: string;
  isInternational: boolean;
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
}

/** Raw MVPI response from POST /api/v1/inquiry/mvpi/latest-inspection */
export interface TammMvpiResult {
  plate: TammPlateDto;
  sequenceNumber: number;
  mvpiStatus: string; // 'VALID' | 'EXPIRED' | ...
  mvpiExpiryDate: string; // 'YYYY-MM-DD'
  mvpiExpiryDateHijri: string;
  odometer: number;
}

export interface TammInsurancePolicy {
  insuranceCompanyName: string;
  mainPolicyNumber: string;
  subPolicyNumber: string;
  policyEndDate: string;
  policyIssueDate: string;
  policyStartDate: string;
  policyCoverType: { code: number; nameAr: string; nameEn: string };
}

/** Raw insurance response from POST /api/v1/inquiry/vehicle-insurance */
export interface TammInsuranceResult {
  plate: TammPlateDto;
  list: TammInsurancePolicy[];
}

// ─── Actual Driver ────────────────────────────────────────────────────────────

/** Step 1 — verify vehicle by plate before assigning actual driver */
export interface ActualDriverVerifyVehicleDto {
  plateDto: TammPlateDto;
}

/** Step 2 — verify person identity (individual or company) */
export interface ActualDriverVerifyAdditionDto {
  /** 2 = Company, 3 = Individual */
  type: 2 | 3;
  /** MOI number (type=2) or National ID / Iqama (type=3) */
  idNumber: string;
  /** Required when type=3 — birth year in YYYY format */
  birthYear?: number;
  /** Required when type=2 — 1 = Sponsored ID, 2 = Plate of owned car */
  crossValidationBy?: 1 | 2;
  /** Required when type=2 and crossValidationBy=2 */
  crossValidationPlateDto?: TammPlateDto;
  /** Required when type=2 and crossValidationBy=1 */
  residentIqamaId?: string;
  /** Registered mobile number, starts with 5 */
  mobileNumber: string;
}

/** Step 3 — submit OTP to finalise actual driver assignment */
export interface ActualDriverFinalSubmitDto {
  /** OTP received by SMS; null for company (type=2) */
  otp: string | null;
}

export interface ActualDriverAdditionResult {
  referenceNumber: number;
}

/** Cancel Step 1 — verify vehicle for removal */
export interface ActualDriverRemoveVerifyDto {
  plateDto: TammPlateDto;
}

// ─── Naql Integration ─────────────────────────────────────────────────────────

export interface NaqlPermit {
  permitId: string;
  companyCode: string;
  vehiclePlate: string;
  driverNationalId: string;
  origin: string;
  destination: string;
  cargoType: string;
  cargoWeight: number; // kg
  status: PermitStatus;
  issuedAt: Date;
  validFrom: Date;
  validTo: Date;
}

export interface CreateNaqlPermitDto {
  vehiclePlate: string;
  driverNationalId: string;
  origin: string;
  destination: string;
  cargoType: string;
  cargoWeight: number;
  validFrom: Date;
  validTo: Date;
}

// ─── Dashboard / Reports ──────────────────────────────────────────────────────

export interface FleetStats {
  totalVehicles: number;
  activeVehicles: number;
  vehiclesInMaintenance: number;
  totalDrivers: number;
  activeDrivers: number;
  tripsToday: number;
  tripsInProgress: number;
  fuelCostThisMonth: number; // SAR
  maintenanceCostThisMonth: number; // SAR
  pendingViolations: number;
  expiringDocuments: number; // expiring within 30 days
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  referenceId?: string; // vehicle/driver/trip id
  isRead: boolean;
  createdAt: Date;
}

export enum NotificationType {
  MAINTENANCE_DUE = 'MAINTENANCE_DUE',
  DOCUMENT_EXPIRING = 'DOCUMENT_EXPIRING',
  VIOLATION_ISSUED = 'VIOLATION_ISSUED',
  TRIP_STARTED = 'TRIP_STARTED',
  TRIP_COMPLETED = 'TRIP_COMPLETED',
  DRIVER_ASSIGNED = 'DRIVER_ASSIGNED',
  FUEL_LOW = 'FUEL_LOW',
}
