export declare enum VehicleStatus {
    ACTIVE = "ACTIVE",
    MAINTENANCE = "MAINTENANCE",
    INACTIVE = "INACTIVE",
    RETIRED = "RETIRED"
}
export declare enum VehicleType {
    SEDAN = "SEDAN",
    SUV = "SUV",
    TRUCK = "TRUCK",
    VAN = "VAN",
    BUS = "BUS",
    MOTORCYCLE = "MOTORCYCLE",
    HEAVY_EQUIPMENT = "HEAVY_EQUIPMENT"
}
export declare enum DriverStatus {
    ACTIVE = "ACTIVE",
    OFF_DUTY = "OFF_DUTY",
    ON_LEAVE = "ON_LEAVE",
    SUSPENDED = "SUSPENDED",
    TERMINATED = "TERMINATED"
}
export declare enum TripStatus {
    SCHEDULED = "SCHEDULED",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare enum MaintenanceType {
    SCHEDULED = "SCHEDULED",
    UNSCHEDULED = "UNSCHEDULED",
    EMERGENCY = "EMERGENCY"
}
export declare enum MaintenanceStatus {
    PENDING = "PENDING",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare enum DocumentType {
    VEHICLE_REGISTRATION = "VEHICLE_REGISTRATION",
    VEHICLE_INSURANCE = "VEHICLE_INSURANCE",
    PERIODIC_INSPECTION = "PERIODIC_INSPECTION",
    DRIVER_LICENSE = "DRIVER_LICENSE",
    TRANSPORT_PERMIT = "TRANSPORT_PERMIT",
    OWNERSHIP_DEED = "OWNERSHIP_DEED"
}
export declare enum UserRole {
    SUPER_ADMIN = "SUPER_ADMIN",
    FLEET_MANAGER = "FLEET_MANAGER",
    DISPATCHER = "DISPATCHER",
    DRIVER = "DRIVER",
    VIEWER = "VIEWER",
    MAINTENANCE_TECH = "MAINTENANCE_TECH"
}
export declare enum PermitStatus {
    PENDING = "PENDING",
    ACTIVE = "ACTIVE",
    EXPIRED = "EXPIRED",
    CANCELLED = "CANCELLED"
}
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
    sub: string;
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
export interface Company {
    id: string;
    name: string;
    crNumber: string;
    tammSubscriptionId?: string;
    naqlCompanyCode?: string;
    createdAt: Date;
    updatedAt: Date;
}
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
    odometer: number;
    fuelCapacity: number;
    assignedDriverId?: string;
    tammVehicleId?: string;
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
}
export interface UpdateVehicleDto extends Partial<CreateVehicleDto> {
    status?: VehicleStatus;
    assignedDriverId?: string;
}
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
    status: DriverStatus;
    assignedVehicleId?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateDriverDto {
    fullName: string;
    phone: string;
    email?: string;
    nationalId: string;
    licenseNumber: string;
    licenseExpiry: Date;
}
export interface UpdateDriverDto extends Partial<CreateDriverDto> {
    status?: DriverStatus;
    assignedVehicleId?: string;
}
export interface Trip {
    id: string;
    companyId: string;
    vehicleId: string;
    driverId: string;
    status: TripStatus;
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
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateTripDto {
    vehicleId: string;
    driverId: string;
    origin: string;
    destination: string;
    originCoords?: GeoPoint;
    destinationCoords?: GeoPoint;
    scheduledStart: Date;
    scheduledEnd: Date;
    notes?: string;
}
export interface GeoPoint {
    lat: number;
    lng: number;
}
export interface VehicleLocationUpdate {
    vehicleId: string;
    driverId: string;
    location: GeoPoint;
    speed?: number;
    heading?: number;
    timestamp: Date;
}
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
export interface NaqlPermit {
    permitId: string;
    companyCode: string;
    vehiclePlate: string;
    driverNationalId: string;
    origin: string;
    destination: string;
    cargoType: string;
    cargoWeight: number;
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
export interface FleetStats {
    totalVehicles: number;
    activeVehicles: number;
    vehiclesInMaintenance: number;
    totalDrivers: number;
    activeDrivers: number;
    tripsToday: number;
    tripsInProgress: number;
    fuelCostThisMonth: number;
    maintenanceCostThisMonth: number;
    pendingViolations: number;
    expiringDocuments: number;
}
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
export interface Notification {
    id: string;
    userId: string;
    title: string;
    body: string;
    type: NotificationType;
    referenceId?: string;
    isRead: boolean;
    createdAt: Date;
}
export declare enum NotificationType {
    MAINTENANCE_DUE = "MAINTENANCE_DUE",
    DOCUMENT_EXPIRING = "DOCUMENT_EXPIRING",
    VIOLATION_ISSUED = "VIOLATION_ISSUED",
    TRIP_STARTED = "TRIP_STARTED",
    TRIP_COMPLETED = "TRIP_COMPLETED",
    DRIVER_ASSIGNED = "DRIVER_ASSIGNED",
    FUEL_LOW = "FUEL_LOW"
}
//# sourceMappingURL=index.d.ts.map