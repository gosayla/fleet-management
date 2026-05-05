"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationType = exports.PermitStatus = exports.UserRole = exports.DocumentType = exports.MaintenanceStatus = exports.MaintenanceType = exports.TripStatus = exports.DriverStatus = exports.VehicleType = exports.VehicleStatus = void 0;
var VehicleStatus;
(function (VehicleStatus) {
    VehicleStatus["ACTIVE"] = "ACTIVE";
    VehicleStatus["MAINTENANCE"] = "MAINTENANCE";
    VehicleStatus["INACTIVE"] = "INACTIVE";
    VehicleStatus["RETIRED"] = "RETIRED";
})(VehicleStatus || (exports.VehicleStatus = VehicleStatus = {}));
var VehicleType;
(function (VehicleType) {
    VehicleType["SEDAN"] = "SEDAN";
    VehicleType["SUV"] = "SUV";
    VehicleType["TRUCK"] = "TRUCK";
    VehicleType["VAN"] = "VAN";
    VehicleType["BUS"] = "BUS";
    VehicleType["MOTORCYCLE"] = "MOTORCYCLE";
    VehicleType["HEAVY_EQUIPMENT"] = "HEAVY_EQUIPMENT";
})(VehicleType || (exports.VehicleType = VehicleType = {}));
var DriverStatus;
(function (DriverStatus) {
    DriverStatus["ACTIVE"] = "ACTIVE";
    DriverStatus["OFF_DUTY"] = "OFF_DUTY";
    DriverStatus["ON_LEAVE"] = "ON_LEAVE";
    DriverStatus["SUSPENDED"] = "SUSPENDED";
    DriverStatus["TERMINATED"] = "TERMINATED";
})(DriverStatus || (exports.DriverStatus = DriverStatus = {}));
var TripStatus;
(function (TripStatus) {
    TripStatus["SCHEDULED"] = "SCHEDULED";
    TripStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TripStatus["COMPLETED"] = "COMPLETED";
    TripStatus["CANCELLED"] = "CANCELLED";
})(TripStatus || (exports.TripStatus = TripStatus = {}));
var MaintenanceType;
(function (MaintenanceType) {
    MaintenanceType["SCHEDULED"] = "SCHEDULED";
    MaintenanceType["UNSCHEDULED"] = "UNSCHEDULED";
    MaintenanceType["EMERGENCY"] = "EMERGENCY";
})(MaintenanceType || (exports.MaintenanceType = MaintenanceType = {}));
var MaintenanceStatus;
(function (MaintenanceStatus) {
    MaintenanceStatus["PENDING"] = "PENDING";
    MaintenanceStatus["IN_PROGRESS"] = "IN_PROGRESS";
    MaintenanceStatus["COMPLETED"] = "COMPLETED";
    MaintenanceStatus["CANCELLED"] = "CANCELLED";
})(MaintenanceStatus || (exports.MaintenanceStatus = MaintenanceStatus = {}));
var DocumentType;
(function (DocumentType) {
    DocumentType["VEHICLE_REGISTRATION"] = "VEHICLE_REGISTRATION";
    DocumentType["VEHICLE_INSURANCE"] = "VEHICLE_INSURANCE";
    DocumentType["PERIODIC_INSPECTION"] = "PERIODIC_INSPECTION";
    DocumentType["DRIVER_LICENSE"] = "DRIVER_LICENSE";
    DocumentType["TRANSPORT_PERMIT"] = "TRANSPORT_PERMIT";
    DocumentType["OWNERSHIP_DEED"] = "OWNERSHIP_DEED";
    DocumentType["OPERATION_CARD"] = "OPERATION_CARD";
})(DocumentType || (exports.DocumentType = DocumentType = {}));
var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    UserRole["FLEET_MANAGER"] = "FLEET_MANAGER";
    UserRole["DISPATCHER"] = "DISPATCHER";
    UserRole["DRIVER"] = "DRIVER";
    UserRole["VIEWER"] = "VIEWER";
})(UserRole || (exports.UserRole = UserRole = {}));
var PermitStatus;
(function (PermitStatus) {
    PermitStatus["PENDING"] = "PENDING";
    PermitStatus["ACTIVE"] = "ACTIVE";
    PermitStatus["EXPIRED"] = "EXPIRED";
    PermitStatus["CANCELLED"] = "CANCELLED";
})(PermitStatus || (exports.PermitStatus = PermitStatus = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["MAINTENANCE_DUE"] = "MAINTENANCE_DUE";
    NotificationType["DOCUMENT_EXPIRING"] = "DOCUMENT_EXPIRING";
    NotificationType["VIOLATION_ISSUED"] = "VIOLATION_ISSUED";
    NotificationType["TRIP_STARTED"] = "TRIP_STARTED";
    NotificationType["TRIP_COMPLETED"] = "TRIP_COMPLETED";
    NotificationType["DRIVER_ASSIGNED"] = "DRIVER_ASSIGNED";
    NotificationType["FUEL_LOW"] = "FUEL_LOW";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
//# sourceMappingURL=index.js.map