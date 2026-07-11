import { prisma } from "@/lib/prisma";
import { Prisma, BillingStatus, LaboratoryStatus, RadiologyStatus, OTType, DeliveryType, DeathLocationType, InvoiceStatus } from "@prisma/client";

export class OPDReportService {
  static async getDailyOPD(filters: {
    startDate: Date;
    endDate: Date;
    doctorId?: string;
    departmentId?: string;
    page: number;
    limit: number;
    bypassPagination?: boolean;
  }) {
    const where: Prisma.OPDConsultationWhereInput = {
      consultationDate: { gte: filters.startDate, lte: filters.endDate },
      isDeleted: false,
      cancelledAt: null,
      ...(filters.doctorId ? { doctorId: filters.doctorId } : {}),
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
    };

    const count = await prisma.oPDConsultation.count({ where });

    const rows = await prisma.oPDConsultation.findMany({
      where,
      include: {
        patient: { select: { name: true, uhid: true } },
        doctor: { include: { employee: { select: { designation: true } } } },
        department: { select: { name: true } },
      },
      orderBy: { consultationDate: "desc" },
      ...(filters.bypassPagination ? {} : { skip: (filters.page - 1) * filters.limit, take: filters.limit }),
    });

    const sumResult = await prisma.oPDConsultation.aggregate({
      where,
      _sum: {
        appliedFee: true,
      },
    });

    return {
      rows: rows.map((r) => ({
        id: r.id,
        opdId: r.opdId,
        patientName: r.patient.name,
        patientUhid: r.patient.uhid,
        doctorName: r.doctor.employee.designation,
        departmentName: r.department.name,
        consultationFee: Number(r.appliedFee),
        registrationTime: r.consultationDate,
      })),
      summary: {
        totalPatients: count,
        totalConsultationAmount: Number(sumResult._sum.appliedFee || 0),
      },
      pagination: {
        currentPage: filters.page,
        totalPages: Math.ceil(count / filters.limit) || 1,
        totalRows: count,
      },
    };
  }

  static async getDoctorWiseOPD(filters: {
    startDate: Date;
    endDate: Date;
    doctorId?: string;
    departmentId?: string;
  }) {
    const where: Prisma.OPDConsultationWhereInput = {
      consultationDate: { gte: filters.startDate, lte: filters.endDate },
      isDeleted: false,
      cancelledAt: null,
      ...(filters.doctorId ? { doctorId: filters.doctorId } : {}),
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
    };

    const groups = await prisma.oPDConsultation.groupBy({
      by: ["doctorId"],
      where,
      _count: {
        id: true,
      },
      _sum: {
        appliedFee: true,
      },
    });

    const doctorIds = groups.map((g) => g.doctorId);
    const doctors = await prisma.doctor.findMany({
      where: { id: { in: doctorIds } },
      include: { employee: { select: { designation: true } } },
    });

    const rows = groups.map((g) => {
      const doc = doctors.find((d) => d.id === g.doctorId);
      return {
        doctorId: g.doctorId,
        doctorName: doc ? doc.employee.designation : "Unknown Doctor",
        patientCount: g._count.id || 0,
        consultationAmount: Number(g._sum.appliedFee || 0),
      };
    });

    const totalPatients = rows.reduce((sum, r) => sum + r.patientCount, 0);
    const totalAmount = rows.reduce((sum, r) => sum + r.consultationAmount, 0);

    return {
      rows,
      summary: {
        totalPatients,
        totalConsultationAmount: totalAmount,
      },
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalRows: rows.length,
      },
    };
  }

  static async getDepartmentWiseOPD(filters: {
    startDate: Date;
    endDate: Date;
    departmentId?: string;
  }) {
    const where: Prisma.OPDConsultationWhereInput = {
      consultationDate: { gte: filters.startDate, lte: filters.endDate },
      isDeleted: false,
      cancelledAt: null,
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
    };

    const groups = await prisma.oPDConsultation.groupBy({
      by: ["departmentId"],
      where,
      _count: {
        id: true,
      },
      _sum: {
        appliedFee: true,
      },
    });

    const departmentIds = groups.map((g) => g.departmentId);
    const departments = await prisma.department.findMany({
      where: { id: { in: departmentIds } },
    });

    const rows = groups.map((g) => {
      const dept = departments.find((d) => d.id === g.departmentId);
      return {
        departmentId: g.departmentId,
        departmentName: dept ? dept.name : "Unknown Department",
        patientCount: g._count.id || 0,
        consultationAmount: Number(g._sum.appliedFee || 0),
      };
    });

    const totalPatients = rows.reduce((sum, r) => sum + r.patientCount, 0);
    const totalAmount = rows.reduce((sum, r) => sum + r.consultationAmount, 0);

    return {
      rows,
      summary: {
        totalPatients,
        totalConsultationAmount: totalAmount,
      },
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalRows: rows.length,
      },
    };
  }
}

export class IPDReportService {
  static async getDailyIPD(filters: {
    startDate: Date;
    endDate: Date;
    doctorId?: string;
    departmentId?: string;
    page: number;
    limit: number;
    bypassPagination?: boolean;
  }) {
    const where: Prisma.IPDAdmissionWhereInput = {
      admissionDate: { gte: filters.startDate, lte: filters.endDate },
      isDeleted: false,
      cancelledAt: null,
      ...(filters.doctorId ? { primaryDoctorId: filters.doctorId } : {}),
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
    };

    const count = await prisma.iPDAdmission.count({ where });

    const rows = await prisma.iPDAdmission.findMany({
      where,
      include: {
        patient: { select: { name: true, uhid: true } },
        primaryDoctor: { include: { employee: { select: { designation: true } } } },
        department: { select: { name: true } },
        bed: { include: { room: { select: { roomNumber: true, roomType: true } } } },
      },
      orderBy: { admissionDate: "desc" },
      ...(filters.bypassPagination ? {} : { skip: (filters.page - 1) * filters.limit, take: filters.limit }),
    });

    // Run aggregate calculations separately to prevent locks
    const admissionsCount = await prisma.iPDAdmission.count({
      where: {
        admissionDate: { gte: filters.startDate, lte: filters.endDate },
        isDeleted: false,
        cancelledAt: null,
        ...(filters.doctorId ? { primaryDoctorId: filters.doctorId } : {}),
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      },
    });

    const dischargesCount = await prisma.iPDAdmission.count({
      where: {
        dischargeDate: { gte: filters.startDate, lte: filters.endDate },
        isDeleted: false,
        cancelledAt: null,
        ...(filters.doctorId ? { primaryDoctorId: filters.doctorId } : {}),
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      },
    });

    const activePatientsCount = await prisma.iPDAdmission.count({
      where: {
        admissionDate: { lte: filters.endDate },
        OR: [
          { dischargeDate: null },
          { dischargeDate: { gt: filters.endDate } },
        ],
        isDeleted: false,
        cancelledAt: null,
        ...(filters.doctorId ? { primaryDoctorId: filters.doctorId } : {}),
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      },
    });

    return {
      rows: rows.map((r) => ({
        id: r.id,
        ipdId: r.ipdId,
        patientName: r.patient.name,
        patientUhid: r.patient.uhid,
        doctorName: r.primaryDoctor.employee.designation,
        departmentName: r.department.name,
        ward: r.bed.room.roomType,
        bedNumber: r.bed.bedNumber,
        admissionDate: r.admissionDate,
        dischargeDate: r.dischargeDate,
      })),
      summary: {
        admissions: admissionsCount,
        discharges: dischargesCount,
        activePatients: activePatientsCount,
      },
      pagination: {
        currentPage: filters.page,
        totalPages: Math.ceil(count / filters.limit) || 1,
        totalRows: count,
      },
    };
  }
}

export class BillingReportService {
  static async getTodayBilling(filters: {
    startDate: Date;
    endDate: Date;
    status?: string;
    page: number;
    limit: number;
    bypassPagination?: boolean;
  }) {
    const where: Prisma.InvoiceWhereInput = {
      createdAt: { gte: filters.startDate, lte: filters.endDate },
      isDeleted: false,
      cancelledAt: null,
      ...(filters.status ? { paymentStatus: filters.status as InvoiceStatus } : {}),
    };

    const count = await prisma.invoice.count({ where });

    const rows = await prisma.invoice.findMany({
      where,
      include: {
        patient: { select: { name: true, uhid: true } },
      },
      orderBy: { createdAt: "desc" },
      ...(filters.bypassPagination ? {} : { skip: (filters.page - 1) * filters.limit, take: filters.limit }),
    });

    const sumResult = await prisma.invoice.aggregate({
      where,
      _sum: {
        payableAmount: true,
        discountAmount: true,
        paidAmount: true,
        balanceAmount: true,
      },
    });

    return {
      rows: rows.map((r) => ({
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        patientName: r.patient.name,
        patientUhid: r.patient.uhid,
        amount: Number(r.payableAmount),
        discount: Number(r.discountAmount),
        paid: Number(r.paidAmount),
        balance: Number(r.balanceAmount),
        paymentStatus: r.paymentStatus,
        date: r.createdAt,
      })),
      summary: {
        totalCollection: Number(sumResult._sum.paidAmount || 0),
        totalDiscount: Number(sumResult._sum.discountAmount || 0),
        outstanding: Number(sumResult._sum.balanceAmount || 0),
      },
      pagination: {
        currentPage: filters.page,
        totalPages: Math.ceil(count / filters.limit) || 1,
        totalRows: count,
      },
    };
  }
}

export class DiagnosticsReportService {
  static async getLaboratoryReport(filters: {
    startDate: Date;
    endDate: Date;
    doctorId?: string;
    status?: string;
    page: number;
    limit: number;
    bypassPagination?: boolean;
  }) {
    const where: Prisma.LabTestOrderWhereInput = {
      createdAt: { gte: filters.startDate, lte: filters.endDate },
      isDeleted: false,
      ...(filters.doctorId ? { orderedByDoctorId: filters.doctorId } : {}),
      ...(filters.status ? { status: filters.status as LaboratoryStatus } : {}),
    };

    const count = await prisma.labTestOrder.count({ where });

    const rows = await prisma.labTestOrder.findMany({
      where,
      include: {
        patient: { select: { name: true, uhid: true } },
        testCatalog: { select: { name: true } },
        orderedByDoctor: { include: { employee: { select: { designation: true } } } },
      },
      orderBy: { createdAt: "desc" },
      ...(filters.bypassPagination ? {} : { skip: (filters.page - 1) * filters.limit, take: filters.limit }),
    });

    return {
      rows: rows.map((r) => ({
        id: r.id,
        testName: r.testCatalog.name,
        patientName: r.patient.name,
        patientUhid: r.patient.uhid,
        doctorName: r.orderedByDoctor.employee.designation,
        status: r.status,
        completionDate: r.completedAt,
        createdAt: r.createdAt,
      })),
      summary: {
        totalOrders: count,
      },
      pagination: {
        currentPage: filters.page,
        totalPages: Math.ceil(count / filters.limit) || 1,
        totalRows: count,
      },
    };
  }

  static async getRadiologyReport(filters: {
    startDate: Date;
    endDate: Date;
    doctorId?: string;
    status?: string;
    page: number;
    limit: number;
    bypassPagination?: boolean;
  }) {
    const where: Prisma.RadiologyScanOrderWhereInput = {
      createdAt: { gte: filters.startDate, lte: filters.endDate },
      isDeleted: false,
      ...(filters.doctorId ? { orderedByDoctorId: filters.doctorId } : {}),
      ...(filters.status ? { status: filters.status as RadiologyStatus } : {}),
    };

    const count = await prisma.radiologyScanOrder.count({ where });

    const rows = await prisma.radiologyScanOrder.findMany({
      where,
      include: {
        patient: { select: { name: true, uhid: true } },
        scanCatalog: { select: { name: true } },
        orderedByDoctor: { include: { employee: { select: { designation: true } } } },
      },
      orderBy: { createdAt: "desc" },
      ...(filters.bypassPagination ? {} : { skip: (filters.page - 1) * filters.limit, take: filters.limit }),
    });

    return {
      rows: rows.map((r) => ({
        id: r.id,
        scanName: r.scanCatalog.name,
        patientName: r.patient.name,
        patientUhid: r.patient.uhid,
        doctorName: r.orderedByDoctor.employee.designation,
        status: r.status,
        completionDate: r.completedAt,
        createdAt: r.createdAt,
      })),
      summary: {
        totalOrders: count,
      },
      pagination: {
        currentPage: filters.page,
        totalPages: Math.ceil(count / filters.limit) || 1,
        totalRows: count,
      },
    };
  }
}

export class OTReportService {
  static async getOTReport(filters: {
    startDate: Date;
    endDate: Date;
    doctorId?: string;
    departmentId?: string;
    page: number;
    limit: number;
    bypassPagination?: boolean;
  }) {
    const where: Prisma.OperationTheaterWhereInput = {
      scheduledDate: { gte: filters.startDate, lte: filters.endDate },
      isDeleted: false,
      cancelledAt: null,
      ...(filters.doctorId ? { primarySurgeonId: filters.doctorId } : {}),
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
    };

    const count = await prisma.operationTheater.count({ where });

    const rows = await prisma.operationTheater.findMany({
      where,
      include: {
        patient: { select: { name: true, uhid: true } },
        primarySurgeon: { include: { employee: { select: { designation: true } } } },
        department: { select: { name: true } },
      },
      orderBy: { scheduledDate: "desc" },
      ...(filters.bypassPagination ? {} : { skip: (filters.page - 1) * filters.limit, take: filters.limit }),
    });

    return {
      rows: rows.map((r) => ({
        id: r.id,
        otId: r.otId,
        patientName: r.patient.name,
        patientUhid: r.patient.uhid,
        surgeonName: r.primarySurgeon.employee.designation,
        procedure: r.operationName,
        type: r.operationType,
        date: r.scheduledDate,
      })),
      summary: {
        totalSurgeries: count,
      },
      pagination: {
        currentPage: filters.page,
        totalPages: Math.ceil(count / filters.limit) || 1,
        totalRows: count,
      },
    };
  }
}

export class VitalReportService {
  static async getBirthReport(filters: {
    startDate: Date;
    endDate: Date;
    page: number;
    limit: number;
    bypassPagination?: boolean;
  }) {
    const where: Prisma.BirthRegistrationWhereInput = {
      dob: { gte: filters.startDate, lte: filters.endDate },
      isDeleted: false,
    };

    const count = await prisma.birthRegistration.count({ where });

    const rows = await prisma.birthRegistration.findMany({
      where,
      include: {
        mother: { select: { name: true, uhid: true } },
      },
      orderBy: { dob: "desc" },
      ...(filters.bypassPagination ? {} : { skip: (filters.page - 1) * filters.limit, take: filters.limit }),
    });

    return {
      rows: rows.map((r) => ({
        id: r.id,
        certificateNumber: r.certificateNumber,
        motherName: r.mother.name,
        motherUhid: r.mother.uhid,
        babyName: r.babyName || "Baby Of " + r.mother.name,
        gender: r.gender,
        deliveryType: r.deliveryType,
        date: r.dob,
      })),
      summary: {
        totalBirths: count,
      },
      pagination: {
        currentPage: filters.page,
        totalPages: Math.ceil(count / filters.limit) || 1,
        totalRows: count,
      },
    };
  }

  static async getDeathReport(filters: {
    startDate: Date;
    endDate: Date;
    page: number;
    limit: number;
    bypassPagination?: boolean;
  }) {
    const where: Prisma.DeathRegistrationWhereInput = {
      dateOfDeath: { gte: filters.startDate, lte: filters.endDate },
      isDeleted: false,
    };

    const count = await prisma.deathRegistration.count({ where });

    const rows = await prisma.deathRegistration.findMany({
      where,
      include: {
        patient: { select: { name: true, uhid: true } },
        attendingDoctor: { include: { employee: { select: { designation: true } } } },
      },
      orderBy: { dateOfDeath: "desc" },
      ...(filters.bypassPagination ? {} : { skip: (filters.page - 1) * filters.limit, take: filters.limit }),
    });

    return {
      rows: rows.map((r) => ({
        id: r.id,
        certificateNumber: r.certificateNumber,
        patientName: r.patient ? r.patient.name : r.deceasedName,
        patientUhid: r.patient ? r.patient.uhid : "N/A",
        cause: r.causeOfDeath,
        doctorName: r.attendingDoctor ? r.attendingDoctor.employee.designation : "N/A",
        date: r.dateOfDeath,
      })),
      summary: {
        totalDeaths: count,
      },
      pagination: {
        currentPage: filters.page,
        totalPages: Math.ceil(count / filters.limit) || 1,
        totalRows: count,
      },
    };
  }
}

export class PharmacyReportService {
  static async getPharmacySales(filters: {
    startDate: Date;
    endDate: Date;
    page: number;
    limit: number;
    bypassPagination?: boolean;
  }) {
    const where: Prisma.PharmacyInvoiceWhereInput = {
      createdAt: { gte: filters.startDate, lte: filters.endDate },
      isDeleted: false,
      status: "PAID",
    };

    const count = await prisma.pharmacyInvoice.count({ where });

    const rows = await prisma.pharmacyInvoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...(filters.bypassPagination ? {} : { skip: (filters.page - 1) * filters.limit, take: filters.limit }),
    });

    const sumResult = await prisma.pharmacyInvoice.aggregate({
      where,
      _sum: {
        payableAmount: true,
      },
    });

    return {
      rows: rows.map((r) => ({
        id: r.id,
        invoice: r.pharmacyInvoiceNumber,
        customer: r.customerName,
        amount: Number(r.payableAmount),
        paymentMode: r.paymentMode,
        date: r.createdAt,
      })),
      summary: {
        totalSalesCount: count,
        totalSalesAmount: Number(sumResult._sum.payableAmount || 0),
      },
      pagination: {
        currentPage: filters.page,
        totalPages: Math.ceil(count / filters.limit) || 1,
        totalRows: count,
      },
    };
  }
}

export class CollectionReportService {
  static async getCollectionReport(filters: {
    startDate: Date;
    endDate: Date;
  }) {
    // 1. Fetch Hospital Billing collections (from Payment model)
    const hospitalPayments = await prisma.payment.findMany({
      where: {
        receivedAt: { gte: filters.startDate, lte: filters.endDate },
        isDeleted: false,
      },
      include: {
        invoice: {
          include: {
            patient: { select: { name: true } },
          },
        },
      },
      orderBy: { receivedAt: "desc" },
    });

    // 2. Fetch Pharmacy Collections (from PharmacyInvoicePayment model)
    // Structured via dynamic date references on the pharmacyInvoice creation datetime
    const pharmacyPayments = await prisma.pharmacyInvoicePayment.findMany({
      where: {
        pharmacyInvoice: {
          createdAt: { gte: filters.startDate, lte: filters.endDate },
          isDeleted: false,
          status: "PAID",
        },
      },
      include: {
        pharmacyInvoice: true,
      },
      orderBy: {
        pharmacyInvoice: {
          createdAt: "desc",
        },
      },
    });

    const hospitalCollection = hospitalPayments.map((p) => ({
      id: p.id,
      invoiceNumber: p.invoice.invoiceNumber,
      patientName: p.invoice.patient.name,
      amount: Number(p.amountPaid),
      paymentMode: p.paymentMode,
      date: p.receivedAt,
    }));

    const pharmacyCollection = pharmacyPayments.map((p) => ({
      id: p.id,
      invoiceNumber: p.pharmacyInvoice.pharmacyInvoiceNumber,
      patientName: p.pharmacyInvoice.customerName,
      amount: Number(p.amount),
      paymentMode: p.paymentMode,
      date: p.pharmacyInvoice.createdAt,
    }));

    const totalHospital = hospitalCollection.reduce((sum, r) => sum + r.amount, 0);
    const totalPharmacy = pharmacyCollection.reduce((sum, r) => sum + r.amount, 0);

    return {
      hospitalCollection,
      pharmacyCollection,
      summary: {
        hospitalTotal: totalHospital,
        pharmacyTotal: totalPharmacy,
        grandTotal: totalHospital + totalPharmacy,
      },
    };
  }
}
