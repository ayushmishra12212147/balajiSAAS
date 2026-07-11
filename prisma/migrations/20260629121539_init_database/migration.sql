-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'UPI', 'CARD', 'CHEQUE', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE');

-- CreateEnum
CREATE TYPE "OTType" AS ENUM ('MINOR', 'MAJOR');

-- CreateEnum
CREATE TYPE "LaboratoryStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RadiologyStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('PENDING', 'INVOICED', 'WAIVED');

-- CreateEnum
CREATE TYPE "PharmacyCustomerType" AS ENUM ('WALK_IN', 'PATIENT');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('GENERAL_WARD', 'ICU', 'SEMI_PRIVATE', 'PRIVATE');

-- CreateEnum
CREATE TYPE "BedStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('NORMAL', 'CESAREAN', 'STILL_BIRTH');

-- CreateEnum
CREATE TYPE "DeathLocationType" AS ENUM ('EMERGENCY', 'IPD', 'DEAD_ON_ARRIVAL');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "ChargeSourceModule" AS ENUM ('OPD', 'IPD', 'OT', 'LABORATORY', 'RADIOLOGY', 'PHARMACY', 'MANUAL');

-- CreateTable
CREATE TABLE "hospitals" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "address" TEXT NOT NULL,
    "stateInsuranceLicense" VARCHAR(100),
    "currentVersion" VARCHAR(20) NOT NULL DEFAULT '2.0.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "settingKey" VARCHAR(100) NOT NULL,
    "settingValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequences" (
    "sequenceName" VARCHAR(100) NOT NULL,
    "currentValue" BIGINT NOT NULL DEFAULT 0,
    "prefix" VARCHAR(20) NOT NULL,
    "paddingLength" INTEGER NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "lastGeneratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sequences_pkey" PRIMARY KEY ("sequenceName")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "employeeCode" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "EmployeeRole" NOT NULL,
    "designation" VARCHAR(100) NOT NULL,
    "departmentId" TEXT,
    "hospitalId" TEXT NOT NULL,
    "mobileNumber" VARCHAR(20) NOT NULL,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" VARCHAR(45),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctors" (
    "id" TEXT NOT NULL,
    "registrationNumber" VARCHAR(50) NOT NULL,
    "qualification" VARCHAR(150) NOT NULL,
    "specialization" VARCHAR(100) NOT NULL,
    "consultationFee" DECIMAL(12,2) NOT NULL,
    "roomNumber" VARCHAR(20),
    "dutySchedule" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "isAllowed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "uhid" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(100),
    "dob" DATE NOT NULL,
    "gender" "Gender" NOT NULL,
    "bloodGroup" "BloodGroup",
    "aadhaarNumber" VARCHAR(12),
    "occupation" VARCHAR(100),
    "photoUrl" TEXT,
    "maritalStatus" "MaritalStatus",
    "nationality" VARCHAR(100) DEFAULT 'Indian',
    "hospitalId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_addresses" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "pincode" VARCHAR(15) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "patient_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_emergency_contacts" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "relation" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "patient_emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_referrals" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "referredByDoctor" VARCHAR(150) NOT NULL,
    "referredByHospital" VARCHAR(150),
    "referralNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "patient_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bed_rooms" (
    "id" TEXT NOT NULL,
    "roomNumber" VARCHAR(20) NOT NULL,
    "roomType" "RoomType" NOT NULL,
    "chargePerDay" DECIMAL(12,2) NOT NULL,
    "floor" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "bed_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beds" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "bedNumber" VARCHAR(20) NOT NULL,
    "status" "BedStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bed_transfer_history" (
    "id" TEXT NOT NULL,
    "ipdAdmissionId" TEXT NOT NULL,
    "previousBedId" TEXT,
    "newBedId" TEXT NOT NULL,
    "transferDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transferReason" TEXT,
    "transferredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "bed_transfer_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opd_consultations" (
    "id" TEXT NOT NULL,
    "opdId" VARCHAR(30) NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "consultationDate" TIMESTAMP(3) NOT NULL,
    "depositAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "symptoms" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "opd_consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ipd_admissions" (
    "id" TEXT NOT NULL,
    "ipdId" VARCHAR(30) NOT NULL,
    "patientId" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "primaryDoctorId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "admissionDate" TIMESTAMP(3) NOT NULL,
    "dischargeDate" TIMESTAMP(3),
    "dischargeSummary" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "ipd_admissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_assignment_history" (
    "id" TEXT NOT NULL,
    "ipdAdmissionId" TEXT NOT NULL,
    "previousDoctorId" TEXT,
    "assignedDoctorId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "doctor_assignment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_theaters" (
    "id" TEXT NOT NULL,
    "otId" VARCHAR(30) NOT NULL,
    "ipdAdmissionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "operationType" "OTType" NOT NULL,
    "operationName" VARCHAR(150) NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "primarySurgeonId" TEXT NOT NULL,
    "assistantSurgeonId" TEXT,

    CONSTRAINT "operation_theaters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_test_catalogs" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "standardRate" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "lab_test_catalogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_test_orders" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "testCatalogId" TEXT NOT NULL,
    "orderedByDoctorId" TEXT NOT NULL,
    "opdConsultationId" TEXT,
    "ipdAdmissionId" TEXT,
    "billableChargeId" TEXT,
    "hospitalId" TEXT NOT NULL,
    "status" "LaboratoryStatus" NOT NULL DEFAULT 'SCHEDULED',
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "lab_test_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_test_results" (
    "id" TEXT NOT NULL,
    "testOrderId" TEXT NOT NULL,
    "parameterName" VARCHAR(100) NOT NULL,
    "parameterValue" VARCHAR(100) NOT NULL,
    "referenceRange" VARCHAR(100),
    "unit" VARCHAR(20),
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "lab_test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_scan_catalogs" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "standardRate" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "radiology_scan_catalogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_scan_orders" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "scanCatalogId" TEXT NOT NULL,
    "orderedByDoctorId" TEXT NOT NULL,
    "opdConsultationId" TEXT,
    "ipdAdmissionId" TEXT,
    "billableChargeId" TEXT,
    "status" "RadiologyStatus" NOT NULL DEFAULT 'SCHEDULED',
    "findings" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "radiology_scan_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge_catalogs" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "rate" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "charge_catalogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billable_charges" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "chargeCatalogId" TEXT NOT NULL,
    "sourceModule" "ChargeSourceModule" NOT NULL,
    "sourceEntityId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "rate" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "billingStatus" "BillingStatus" NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "billable_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" VARCHAR(30) NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "payableAmount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "balanceAmount" DECIMAL(12,2) NOT NULL,
    "paymentStatus" "InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "version" INTEGER NOT NULL DEFAULT 1,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_charge_mappings" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "billableChargeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "invoice_charge_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountPaid" DECIMAL(12,2) NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "transactionReference" VARCHAR(100),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedBy" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "paymentId" TEXT,
    "amountRefunded" DECIMAL(12,2) NOT NULL,
    "refundReason" TEXT NOT NULL,
    "refundedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refundedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "birth_registrations" (
    "id" TEXT NOT NULL,
    "babyName" VARCHAR(150),
    "dob" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "weightKg" DECIMAL(5,2) NOT NULL,
    "motherPatientId" TEXT NOT NULL,
    "ipdAdmissionId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "deliveryType" "DeliveryType" NOT NULL,
    "attendingDoctorId" TEXT NOT NULL,
    "certificateNumber" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "birth_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "death_registrations" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "hospitalId" TEXT NOT NULL,
    "deceasedName" VARCHAR(150) NOT NULL,
    "deceasedAge" INTEGER NOT NULL,
    "deceasedGender" "Gender" NOT NULL,
    "dateOfDeath" TIMESTAMP(3) NOT NULL,
    "causeOfDeath" TEXT NOT NULL,
    "locationType" "DeathLocationType" NOT NULL,
    "attendingDoctorId" TEXT,
    "informantDetails" TEXT,
    "certificateNumber" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "death_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicines" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "genericName" VARCHAR(150) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "form" VARCHAR(50) NOT NULL,
    "standardSellingPrice" DECIMAL(12,2) NOT NULL,
    "isExpirable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "medicines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_stocks" (
    "id" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "batchNumber" VARCHAR(50) NOT NULL,
    "expiryDate" DATE,
    "currentQuantity" INTEGER NOT NULL,
    "purchaseRate" DECIMAL(12,2) NOT NULL,
    "sellingRate" DECIMAL(12,2) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "medicine_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_purchase_orders" (
    "id" TEXT NOT NULL,
    "invoiceNumber" VARCHAR(50) NOT NULL,
    "supplierName" VARCHAR(150) NOT NULL,
    "orderDate" DATE NOT NULL,
    "totalCost" DECIMAL(12,2) NOT NULL,
    "receivedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "pharmacy_purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_purchase_items" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "batchNumber" VARCHAR(50) NOT NULL,
    "expiryDate" DATE,
    "quantityReceived" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "pharmacy_purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_invoices" (
    "id" TEXT NOT NULL,
    "pharmacyInvoiceNumber" VARCHAR(30) NOT NULL,
    "customerType" "PharmacyCustomerType" NOT NULL,
    "patientId" TEXT,
    "hospitalId" TEXT NOT NULL,
    "customerName" VARCHAR(150) NOT NULL,
    "customerPhone" VARCHAR(20),
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "payableAmount" DECIMAL(12,2) NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "receivedBy" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PAID',
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "pharmacy_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_invoice_items" (
    "id" TEXT NOT NULL,
    "pharmacyInvoiceId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "batchNumber" VARCHAR(50) NOT NULL,
    "quantitySold" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "pharmacy_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_returns" (
    "id" TEXT NOT NULL,
    "pharmacyInvoiceId" TEXT NOT NULL,
    "refundAmount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "pharmacy_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_templates" (
    "id" TEXT NOT NULL,
    "templateKey" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "layoutJson" JSONB NOT NULL,
    "pageFormat" VARCHAR(30) NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "print_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audits" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "clientIp" VARCHAR(45),
    "action" VARCHAR(50) NOT NULL,
    "resource" VARCHAR(100),
    "entityId" UUID,
    "previousState" JSONB,
    "newState" JSONB,
    "reason" TEXT,
    "description" TEXT NOT NULL,

    CONSTRAINT "audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hospitals_code_key" ON "hospitals"("code");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_settingKey_key" ON "system_settings"("settingKey");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeCode_key" ON "employees"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE INDEX "employees_email_idx" ON "employees"("email");

-- CreateIndex
CREATE INDEX "employees_role_idx" ON "employees"("role");

-- CreateIndex
CREATE INDEX "employees_hospitalId_idx" ON "employees"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_registrationNumber_key" ON "doctors"("registrationNumber");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_userId_module_action_key" ON "permissions"("userId", "module", "action");

-- CreateIndex
CREATE UNIQUE INDEX "patients_uhid_key" ON "patients"("uhid");

-- CreateIndex
CREATE UNIQUE INDEX "patients_aadhaarNumber_key" ON "patients"("aadhaarNumber");

-- CreateIndex
CREATE INDEX "patients_uhid_idx" ON "patients"("uhid");

-- CreateIndex
CREATE INDEX "patients_phone_idx" ON "patients"("phone");

-- CreateIndex
CREATE INDEX "patients_aadhaarNumber_idx" ON "patients"("aadhaarNumber");

-- CreateIndex
CREATE INDEX "patients_name_idx" ON "patients"("name");

-- CreateIndex
CREATE INDEX "patients_hospitalId_idx" ON "patients"("hospitalId");

-- CreateIndex
CREATE INDEX "patients_createdAt_idx" ON "patients"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "patient_addresses_patientId_key" ON "patient_addresses"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_emergency_contacts_patientId_key" ON "patient_emergency_contacts"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "bed_rooms_roomNumber_key" ON "bed_rooms"("roomNumber");

-- CreateIndex
CREATE UNIQUE INDEX "beds_roomId_bedNumber_key" ON "beds"("roomId", "bedNumber");

-- CreateIndex
CREATE UNIQUE INDEX "opd_consultations_opdId_key" ON "opd_consultations"("opdId");

-- CreateIndex
CREATE INDEX "opd_consultations_opdId_idx" ON "opd_consultations"("opdId");

-- CreateIndex
CREATE INDEX "opd_consultations_patientId_idx" ON "opd_consultations"("patientId");

-- CreateIndex
CREATE INDEX "opd_consultations_doctorId_idx" ON "opd_consultations"("doctorId");

-- CreateIndex
CREATE INDEX "opd_consultations_consultationDate_idx" ON "opd_consultations"("consultationDate");

-- CreateIndex
CREATE INDEX "opd_consultations_hospitalId_idx" ON "opd_consultations"("hospitalId");

-- CreateIndex
CREATE INDEX "opd_consultations_doctorId_consultationDate_idx" ON "opd_consultations"("doctorId", "consultationDate");

-- CreateIndex
CREATE UNIQUE INDEX "ipd_admissions_ipdId_key" ON "ipd_admissions"("ipdId");

-- CreateIndex
CREATE INDEX "ipd_admissions_ipdId_idx" ON "ipd_admissions"("ipdId");

-- CreateIndex
CREATE INDEX "ipd_admissions_patientId_idx" ON "ipd_admissions"("patientId");

-- CreateIndex
CREATE INDEX "ipd_admissions_bedId_idx" ON "ipd_admissions"("bedId");

-- CreateIndex
CREATE INDEX "ipd_admissions_admissionDate_idx" ON "ipd_admissions"("admissionDate");

-- CreateIndex
CREATE INDEX "ipd_admissions_hospitalId_idx" ON "ipd_admissions"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "operation_theaters_otId_key" ON "operation_theaters"("otId");

-- CreateIndex
CREATE INDEX "operation_theaters_otId_idx" ON "operation_theaters"("otId");

-- CreateIndex
CREATE INDEX "operation_theaters_ipdAdmissionId_idx" ON "operation_theaters"("ipdAdmissionId");

-- CreateIndex
CREATE INDEX "operation_theaters_scheduledDate_idx" ON "operation_theaters"("scheduledDate");

-- CreateIndex
CREATE INDEX "operation_theaters_hospitalId_idx" ON "operation_theaters"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "lab_test_catalogs_code_key" ON "lab_test_catalogs"("code");

-- CreateIndex
CREATE INDEX "lab_test_orders_patientId_idx" ON "lab_test_orders"("patientId");

-- CreateIndex
CREATE INDEX "lab_test_orders_status_idx" ON "lab_test_orders"("status");

-- CreateIndex
CREATE INDEX "lab_test_orders_hospitalId_idx" ON "lab_test_orders"("hospitalId");

-- CreateIndex
CREATE INDEX "lab_test_orders_patientId_createdAt_idx" ON "lab_test_orders"("patientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "lab_test_results_testOrderId_parameterName_key" ON "lab_test_results"("testOrderId", "parameterName");

-- CreateIndex
CREATE UNIQUE INDEX "radiology_scan_catalogs_code_key" ON "radiology_scan_catalogs"("code");

-- CreateIndex
CREATE INDEX "radiology_scan_orders_patientId_idx" ON "radiology_scan_orders"("patientId");

-- CreateIndex
CREATE INDEX "radiology_scan_orders_status_idx" ON "radiology_scan_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "charge_catalogs_code_key" ON "charge_catalogs"("code");

-- CreateIndex
CREATE INDEX "billable_charges_patientId_idx" ON "billable_charges"("patientId");

-- CreateIndex
CREATE INDEX "billable_charges_billingStatus_idx" ON "billable_charges"("billingStatus");

-- CreateIndex
CREATE INDEX "billable_charges_sourceModule_sourceEntityId_idx" ON "billable_charges"("sourceModule", "sourceEntityId");

-- CreateIndex
CREATE INDEX "billable_charges_patientId_createdAt_idx" ON "billable_charges"("patientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_invoiceNumber_idx" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_patientId_idx" ON "invoices"("patientId");

-- CreateIndex
CREATE INDEX "invoices_paymentStatus_idx" ON "invoices"("paymentStatus");

-- CreateIndex
CREATE INDEX "invoices_hospitalId_idx" ON "invoices"("hospitalId");

-- CreateIndex
CREATE INDEX "invoices_invoiceNumber_paymentStatus_idx" ON "invoices"("invoiceNumber", "paymentStatus");

-- CreateIndex
CREATE INDEX "invoices_patientId_createdAt_idx" ON "invoices"("patientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_charge_mappings_invoiceId_billableChargeId_key" ON "invoice_charge_mappings"("invoiceId", "billableChargeId");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_receivedAt_idx" ON "payments"("receivedAt");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE INDEX "refunds_invoiceId_idx" ON "refunds"("invoiceId");

-- CreateIndex
CREATE INDEX "refunds_refundedAt_idx" ON "refunds"("refundedAt");

-- CreateIndex
CREATE INDEX "refunds_createdAt_idx" ON "refunds"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "birth_registrations_certificateNumber_key" ON "birth_registrations"("certificateNumber");

-- CreateIndex
CREATE INDEX "birth_registrations_ipdAdmissionId_idx" ON "birth_registrations"("ipdAdmissionId");

-- CreateIndex
CREATE INDEX "birth_registrations_certificateNumber_idx" ON "birth_registrations"("certificateNumber");

-- CreateIndex
CREATE INDEX "birth_registrations_hospitalId_idx" ON "birth_registrations"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "death_registrations_certificateNumber_key" ON "death_registrations"("certificateNumber");

-- CreateIndex
CREATE INDEX "death_registrations_patientId_idx" ON "death_registrations"("patientId");

-- CreateIndex
CREATE INDEX "death_registrations_certificateNumber_idx" ON "death_registrations"("certificateNumber");

-- CreateIndex
CREATE INDEX "death_registrations_hospitalId_idx" ON "death_registrations"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "medicines_code_key" ON "medicines"("code");

-- CreateIndex
CREATE INDEX "medicines_name_idx" ON "medicines"("name");

-- CreateIndex
CREATE INDEX "medicines_genericName_idx" ON "medicines"("genericName");

-- CreateIndex
CREATE INDEX "medicines_code_idx" ON "medicines"("code");

-- CreateIndex
CREATE INDEX "medicine_stocks_medicineId_idx" ON "medicine_stocks"("medicineId");

-- CreateIndex
CREATE INDEX "medicine_stocks_expiryDate_idx" ON "medicine_stocks"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "medicine_stocks_medicineId_batchNumber_key" ON "medicine_stocks"("medicineId", "batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_invoices_pharmacyInvoiceNumber_key" ON "pharmacy_invoices"("pharmacyInvoiceNumber");

-- CreateIndex
CREATE INDEX "pharmacy_invoices_pharmacyInvoiceNumber_idx" ON "pharmacy_invoices"("pharmacyInvoiceNumber");

-- CreateIndex
CREATE INDEX "pharmacy_invoices_patientId_idx" ON "pharmacy_invoices"("patientId");

-- CreateIndex
CREATE INDEX "pharmacy_invoices_hospitalId_idx" ON "pharmacy_invoices"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "print_templates_templateKey_key" ON "print_templates"("templateKey");

-- CreateIndex
CREATE INDEX "print_templates_hospitalId_idx" ON "print_templates"("hospitalId");

-- CreateIndex
CREATE INDEX "audits_timestamp_idx" ON "audits"("timestamp");

-- CreateIndex
CREATE INDEX "audits_userId_idx" ON "audits"("userId");

-- CreateIndex
CREATE INDEX "audits_action_idx" ON "audits"("action");

-- CreateIndex
CREATE INDEX "audits_resource_entityId_idx" ON "audits"("resource", "entityId");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_id_fkey" FOREIGN KEY ("id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_addresses" ADD CONSTRAINT "patient_addresses_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_emergency_contacts" ADD CONSTRAINT "patient_emergency_contacts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_referrals" ADD CONSTRAINT "patient_referrals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "bed_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_transfer_history" ADD CONSTRAINT "bed_transfer_history_ipdAdmissionId_fkey" FOREIGN KEY ("ipdAdmissionId") REFERENCES "ipd_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_transfer_history" ADD CONSTRAINT "bed_transfer_history_previousBedId_fkey" FOREIGN KEY ("previousBedId") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_transfer_history" ADD CONSTRAINT "bed_transfer_history_newBedId_fkey" FOREIGN KEY ("newBedId") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_transfer_history" ADD CONSTRAINT "bed_transfer_history_transferredBy_fkey" FOREIGN KEY ("transferredBy") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_consultations" ADD CONSTRAINT "opd_consultations_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_consultations" ADD CONSTRAINT "opd_consultations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_consultations" ADD CONSTRAINT "opd_consultations_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_consultations" ADD CONSTRAINT "opd_consultations_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_consultations" ADD CONSTRAINT "opd_consultations_cancelledBy_fkey" FOREIGN KEY ("cancelledBy") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_admissions" ADD CONSTRAINT "ipd_admissions_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_admissions" ADD CONSTRAINT "ipd_admissions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_admissions" ADD CONSTRAINT "ipd_admissions_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_admissions" ADD CONSTRAINT "ipd_admissions_primaryDoctorId_fkey" FOREIGN KEY ("primaryDoctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_admissions" ADD CONSTRAINT "ipd_admissions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_admissions" ADD CONSTRAINT "ipd_admissions_cancelledBy_fkey" FOREIGN KEY ("cancelledBy") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_assignment_history" ADD CONSTRAINT "doctor_assignment_history_ipdAdmissionId_fkey" FOREIGN KEY ("ipdAdmissionId") REFERENCES "ipd_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_assignment_history" ADD CONSTRAINT "doctor_assignment_history_previousDoctorId_fkey" FOREIGN KEY ("previousDoctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_assignment_history" ADD CONSTRAINT "doctor_assignment_history_assignedDoctorId_fkey" FOREIGN KEY ("assignedDoctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_theaters" ADD CONSTRAINT "operation_theaters_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_theaters" ADD CONSTRAINT "operation_theaters_ipdAdmissionId_fkey" FOREIGN KEY ("ipdAdmissionId") REFERENCES "ipd_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_theaters" ADD CONSTRAINT "operation_theaters_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_theaters" ADD CONSTRAINT "operation_theaters_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_theaters" ADD CONSTRAINT "operation_theaters_cancelledBy_fkey" FOREIGN KEY ("cancelledBy") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_theaters" ADD CONSTRAINT "operation_theaters_primarySurgeonId_fkey" FOREIGN KEY ("primarySurgeonId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_theaters" ADD CONSTRAINT "operation_theaters_assistantSurgeonId_fkey" FOREIGN KEY ("assistantSurgeonId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_test_orders" ADD CONSTRAINT "lab_test_orders_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_test_orders" ADD CONSTRAINT "lab_test_orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_test_orders" ADD CONSTRAINT "lab_test_orders_testCatalogId_fkey" FOREIGN KEY ("testCatalogId") REFERENCES "lab_test_catalogs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_test_orders" ADD CONSTRAINT "lab_test_orders_orderedByDoctorId_fkey" FOREIGN KEY ("orderedByDoctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_test_orders" ADD CONSTRAINT "lab_test_orders_opdConsultationId_fkey" FOREIGN KEY ("opdConsultationId") REFERENCES "opd_consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_test_orders" ADD CONSTRAINT "lab_test_orders_ipdAdmissionId_fkey" FOREIGN KEY ("ipdAdmissionId") REFERENCES "ipd_admissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_test_results" ADD CONSTRAINT "lab_test_results_testOrderId_fkey" FOREIGN KEY ("testOrderId") REFERENCES "lab_test_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_scan_orders" ADD CONSTRAINT "radiology_scan_orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_scan_orders" ADD CONSTRAINT "radiology_scan_orders_scanCatalogId_fkey" FOREIGN KEY ("scanCatalogId") REFERENCES "radiology_scan_catalogs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_scan_orders" ADD CONSTRAINT "radiology_scan_orders_orderedByDoctorId_fkey" FOREIGN KEY ("orderedByDoctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_scan_orders" ADD CONSTRAINT "radiology_scan_orders_opdConsultationId_fkey" FOREIGN KEY ("opdConsultationId") REFERENCES "opd_consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_scan_orders" ADD CONSTRAINT "radiology_scan_orders_ipdAdmissionId_fkey" FOREIGN KEY ("ipdAdmissionId") REFERENCES "ipd_admissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billable_charges" ADD CONSTRAINT "billable_charges_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billable_charges" ADD CONSTRAINT "billable_charges_chargeCatalogId_fkey" FOREIGN KEY ("chargeCatalogId") REFERENCES "charge_catalogs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_cancelledBy_fkey" FOREIGN KEY ("cancelledBy") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_charge_mappings" ADD CONSTRAINT "invoice_charge_mappings_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_charge_mappings" ADD CONSTRAINT "invoice_charge_mappings_billableChargeId_fkey" FOREIGN KEY ("billableChargeId") REFERENCES "billable_charges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_refundedBy_fkey" FOREIGN KEY ("refundedBy") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "birth_registrations" ADD CONSTRAINT "birth_registrations_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "birth_registrations" ADD CONSTRAINT "birth_registrations_motherPatientId_fkey" FOREIGN KEY ("motherPatientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "birth_registrations" ADD CONSTRAINT "birth_registrations_ipdAdmissionId_fkey" FOREIGN KEY ("ipdAdmissionId") REFERENCES "ipd_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "birth_registrations" ADD CONSTRAINT "birth_registrations_attendingDoctorId_fkey" FOREIGN KEY ("attendingDoctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "death_registrations" ADD CONSTRAINT "death_registrations_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "death_registrations" ADD CONSTRAINT "death_registrations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "death_registrations" ADD CONSTRAINT "death_registrations_attendingDoctorId_fkey" FOREIGN KEY ("attendingDoctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_stocks" ADD CONSTRAINT "medicine_stocks_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_purchase_orders" ADD CONSTRAINT "pharmacy_purchase_orders_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_purchase_items" ADD CONSTRAINT "pharmacy_purchase_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "pharmacy_purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_purchase_items" ADD CONSTRAINT "pharmacy_purchase_items_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_invoices" ADD CONSTRAINT "pharmacy_invoices_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_invoices" ADD CONSTRAINT "pharmacy_invoices_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_invoices" ADD CONSTRAINT "pharmacy_invoices_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_invoices" ADD CONSTRAINT "pharmacy_invoices_cancelledBy_fkey" FOREIGN KEY ("cancelledBy") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_invoice_items" ADD CONSTRAINT "pharmacy_invoice_items_pharmacyInvoiceId_fkey" FOREIGN KEY ("pharmacyInvoiceId") REFERENCES "pharmacy_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_invoice_items" ADD CONSTRAINT "pharmacy_invoice_items_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_returns" ADD CONSTRAINT "pharmacy_returns_pharmacyInvoiceId_fkey" FOREIGN KEY ("pharmacyInvoiceId") REFERENCES "pharmacy_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_templates" ADD CONSTRAINT "print_templates_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
