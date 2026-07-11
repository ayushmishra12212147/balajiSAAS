"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Loader2,
  Bed,
  ArrowRight,
  ShieldAlert,
  PlusCircle,
  User,
  DollarSign,
  Activity,
  Heart,
  Skull,
  LogOut,
  PlusSquare,
  Baby,
  Printer,
  History,
  DoorOpen,
  Calendar,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  FileText
} from "lucide-react";

// Dropdowns & metadata types
type DoctorDropdown = {
  id: string;
  employee: {
    name: string;
    designation: string;
  };
};

type DepartmentDropdown = {
  id: string;
  name: string;
  code: string;
  isDeleted?: boolean;
};

type BedItem = {
  id: string;
  bedNumber: string;
  status: string;
};

type RoomItem = {
  id: string;
  roomNumber: string;
  roomType: string;
  floor: string;
  chargePerDay: string;
  beds: BedItem[];
};

type ChargeCatalogDropdown = {
  id: string;
  code: string;
  name: string;
  category: string;
  rate: number;
};

type CatalogItem = {
  id: string;
  code: string;
  name: string;
  category: string;
  standardRate: number;
  department: "Laboratory" | "Radiology";
};

type InpatientSummary = {
  id: string;
  ipdId: string;
  admissionDate: string;
  dischargeDate: string | null;
  isDeceased: boolean;
  patient: {
    id: string;
    uhid: string;
    name: string;
    gender: string;
    phone: string;
  };
  bed: {
    id: string;
    bedNumber: string;
    room: {
      roomNumber: string;
      roomType: string;
    };
  };
  primaryDoctor: {
    employee: {
      name: string;
      designation: string;
    };
  };
  department: {
    name: string;
  };
};

export default function IPDWorkspacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "active";

  const [activePrintAdmission, setActivePrintAdmission] = useState<any | null>(null);
  const [printModalCharges, setPrintModalCharges] = useState<any[]>([]);
  const [loadingPrintCharges, setLoadingPrintCharges] = useState(false);

  useEffect(() => {
    setFilterIpdId("");
    setFilterUhid("");
    setFilterName("");
    setFilterStatus(currentTab === "search" ? "DISCHARGED" : "ACTIVE");
    setPage(1);
  }, [currentTab]);

  const [loading, setLoading] = useState(false);
  const [admissions, setAdmissions] = useState<InpatientSummary[]>([]);
  const [activeAdmissions, setActiveAdmissions] = useState<InpatientSummary[]>([]);

  // Metadata catalogs
  const [doctors, setDoctors] = useState<DoctorDropdown[]>([]);
  const [departments, setDepartments] = useState<DepartmentDropdown[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [catalogs, setCatalogs] = useState<ChargeCatalogDropdown[]>([]);
  const [diagCatalogs, setDiagCatalogs] = useState<CatalogItem[]>([]);

  // Autocomplete patient search (Admission tab)
  const [patientSearch, setPatientSearch] = useState("");
  const [patientMatches, setPatientMatches] = useState<any[]>([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedPatientName, setSelectedPatientName] = useState("");

  // Search Filters (Active Patients tab)
  const [filterIpdId, setFilterIpdId] = useState("");
  const [filterUhid, setFilterUhid] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterStatus, setFilterStatus] = useState(() => {
    if (typeof window !== "undefined") {
      const tab = new URLSearchParams(window.location.search).get("tab");
      if (tab === "search") return "DISCHARGED";
    }
    return "ACTIVE";
  }); // "ACTIVE" | "DISCHARGED" | "DECEASED" | ""
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form states: New Admission
  const [admitDeptId, setAdmitDeptId] = useState("");
  const [admitDocId, setAdmitDocId] = useState("");
  const [admitBedId, setAdmitBedId] = useState("");
  const [admitDate, setAdmitDate] = useState(new Date().toISOString().substring(0, 16));
  const [admitting, setAdmitting] = useState(false);

  // Form states: Inline Assign Charge Modal
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [chargeTargetAdmission, setChargeTargetAdmission] = useState<InpatientSummary | null>(null);
  const [chargeCatalogId, setChargeCatalogId] = useState("");
  const [chargeQty, setChargeQty] = useState(1);
  const [chargeRate, setChargeRate] = useState("");
  const [savingCharge, setSavingCharge] = useState(false);
  const [addedCharges, setAddedCharges] = useState<{ catalogId: string; name: string; quantity: number; rate: number | null }[]>([]);
  const [isCustomCharge, setIsCustomCharge] = useState(false);
  const [customChargeName, setCustomChargeName] = useState("");
  const [customChargeRate, setCustomChargeRate] = useState("");

  // Form states: Inline Bed Transfer Modal
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTargetAdmission, setTransferTargetAdmission] = useState<InpatientSummary | null>(null);
  const [transferBedId, setTransferBedId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [savingTransfer, setSavingTransfer] = useState(false);

  // Form states: Diagnostics Booking Tab
  const [diagAdmissionId, setDiagAdmissionId] = useState("");
  const [selectedDiagIds, setSelectedDiagIds] = useState<string[]>([]);
  const [diagSearchQuery, setDiagSearchQuery] = useState("");
  const [savingDiag, setSavingDiag] = useState(false);
  const [diagDropdownOpen, setDiagDropdownOpen] = useState(false);

  // Form states: Birth & Death Tab
  const [regMode, setRegMode] = useState<"birth" | "death">("birth");
  const [regAdmissionId, setRegAdmissionId] = useState("");
  // Birth
  const [birthBabyName, setBirthBabyName] = useState("");
  const [birthGender, setBirthGender] = useState("MALE");
  const [birthWeight, setBirthWeight] = useState(3.0);
  const [birthDeliveryType, setBirthDeliveryType] = useState("NORMAL");
  const [birthDob, setBirthDob] = useState(new Date().toISOString().substring(0, 16));
  const [birthDoctorId, setBirthDoctorId] = useState("");
  // Death
  const [deathDeceasedName, setDeathDeceasedName] = useState("");
  const [deathDeceasedAge, setDeathDeceasedAge] = useState(0);
  const [deathDeceasedGender, setDeathDeceasedGender] = useState("MALE");
  const [deathDate, setDeathDate] = useState(new Date().toISOString().substring(0, 16));
  const [deathCause, setDeathCause] = useState("");
  const [deathLocation, setDeathLocation] = useState("IPD");
  const [deathDoctorId, setDeathDoctorId] = useState("");
  const [deathInformant, setDeathInformant] = useState("");
  const [savingReg, setSavingReg] = useState(false);

  // Form states: Discharge Inpatient Tab
  const [dischargeAdmissionId, setDischargeAdmissionId] = useState("");
  const [dischargeSummary, setDischargeSummary] = useState("");
  const [dischargeType, setDischargeType] = useState<"NORMAL" | "LAMA" | "DAMA" | "REFERRED" | "EXPIRED">("NORMAL");
  const [finalDiagnosis, setFinalDiagnosis] = useState("");
  const [treatmentSummary, setTreatmentSummary] = useState("");
  const [conditionAtDischarge, setConditionAtDischarge] = useState("");
  const [followUpInstructions, setFollowUpInstructions] = useState("");
  const [dischargeDateTime, setDischargeDateTime] = useState(new Date().toISOString().substring(0, 16));
  const [dischargeDetails, setDischargeDetails] = useState<any | null>(null);
  const [loadingDischargeDetails, setLoadingDischargeDetails] = useState(false);
  const [savingDischarge, setSavingDischarge] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activePrintMenuId, setActivePrintMenuId] = useState<string | null>(null);

  // Load admissions summary table
  const fetchAdmissions = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        ipdId: filterIpdId,
        uhid: filterUhid,
        name: filterName,
        status: filterStatus,
        page: page.toString(),
        limit: "10",
      });
      const res = await apiClient<{
        admissions: InpatientSummary[];
        pagination: { pages: number };
      }>(`/api/ipd/admissions?${query.toString()}`);
      setAdmissions(res.admissions || []);
      setTotalPages(res.pagination.pages || 1);
    } catch {
      toast.error("Failed to load inpatient directory.");
    } finally {
      setLoading(false);
    }
  };

  // Load simple active admissions dropdown reference
  const fetchActiveAdmissionsOnly = async () => {
    try {
      const res = await apiClient<{ admissions: InpatientSummary[] }>(
        `/api/ipd/admissions?status=ACTIVE&limit=100`
      );
      setActiveAdmissions(res.admissions || []);
    } catch {
      // silent
    }
  };

  // Load all lookups & metadata catalog databases
  const loadLookups = async () => {
    try {
      const docsData = await apiClient<DoctorDropdown[]>("/api/admin/doctors");
      setDoctors(docsData);
      const deptsData = await apiClient<DepartmentDropdown[]>("/api/admin/departments");
      setDepartments(deptsData.filter((d) => !d.isDeleted));
      const roomsData = await apiClient<RoomItem[]>("/api/ipd/beds");
      setRooms(roomsData);
      const catsData = await apiClient<ChargeCatalogDropdown[]>("/api/ipd/charge-catalogs");
      setCatalogs(catsData);
      
      const diagRes = await apiClient<{
        labCatalogs: any[];
        radCatalogs: any[];
      }>("/api/opd/catalogs");
      const mappedLabs: CatalogItem[] = (diagRes.labCatalogs || []).map((i) => ({
        ...i,
        department: "Laboratory",
      }));
      const mappedRads: CatalogItem[] = (diagRes.radCatalogs || []).map((i) => ({
        ...i,
        department: "Radiology",
      }));
      setDiagCatalogs([...mappedLabs, ...mappedRads]);
    } catch {
      toast.error("Failed to load clinical catalog datasets.");
    }
  };

  // Setup tab workspace synchronization hooks
  useEffect(() => {
    if (currentTab === "search") {
      setFilterStatus("DISCHARGED");
      setPage(1);
    } else if (currentTab === "active") {
      setFilterStatus("ACTIVE");
      setPage(1);
    }
  }, [currentTab]);

  useEffect(() => {
    loadLookups();
    fetchActiveAdmissionsOnly();
  }, []);

  useEffect(() => {
    if (currentTab === "active" || currentTab === "search") {
      fetchAdmissions();
    } else {
      fetchActiveAdmissionsOnly();
    }
  }, [currentTab, page, filterStatus]);

  // Autocomplete patient search
  useEffect(() => {
    if (patientSearch.trim().length < 2) {
      setPatientMatches([]);
      return;
    }
    const delay = setTimeout(async () => {
      setSearchingPatients(true);
      try {
        const res = await apiClient<{ patients: any[] }>(
          `/api/patients?name=${encodeURIComponent(patientSearch)}&limit=5`
        );
        setPatientMatches(res.patients || []);
      } catch {
        // silent
      } finally {
        setSearchingPatients(false);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [patientSearch]);

  const handleTabChange = (tabId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tabId);
    router.push(url.pathname + url.search);
  };

  // Form submits: Admit Patient
  const handleAdmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.error("Demographics Lookup: Please search and select a valid registered patient.");
      return;
    }
    if (!admitDocId || !admitDeptId || !admitBedId) {
      toast.error("Admissions Form: Please fill out all required fields.");
      return;
    }
    setAdmitting(true);
    try {
      const res = await apiClient<{ id: string }>("/api/ipd/admissions", {
        method: "POST",
        body: JSON.stringify({
          patientId: selectedPatientId,
          doctorId: admitDocId,
          departmentId: admitDeptId,
          bedId: admitBedId,
          admissionDate: admitDate,
        }),
      });
      toast.success("Patient admitted to ward room successfully!");
      // Reset forms
      setSelectedPatientId("");
      setSelectedPatientName("");
      setAdmitBedId("");
      handleTabChange("active");
    } catch (err: any) {
      toast.error(err.message || "Admission flow failed.");
    } finally {
      setAdmitting(false);
    }
  };

  // Form submits: Inline Assign Charge
  const handleAssignChargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chargeTargetAdmission) return;
    if (addedCharges.length === 0 && !chargeCatalogId && !customChargeName) {
      toast.error("Please add at least one charge item.");
      return;
    }
    setSavingCharge(true);
    try {
      const payload = [...addedCharges];
      if (isCustomCharge) {
        if (customChargeName) {
          payload.push({
            catalogId: "",
            name: customChargeName,
            quantity: chargeQty,
            rate: customChargeRate ? Number(customChargeRate) : 0,
          });
        }
      } else {
        if (chargeCatalogId) {
          const cat = catalogs.find((c) => c.id === chargeCatalogId);
          payload.push({
            catalogId: chargeCatalogId,
            name: cat?.name || "",
            quantity: chargeQty,
            rate: chargeRate ? Number(chargeRate) : null,
          });
        }
      }
      const requestBody = payload.map((c) => ({
        chargeCatalogId: c.catalogId || null,
        customName: c.catalogId ? null : c.name,
        quantity: c.quantity,
        rate: c.rate,
      }));

      await apiClient(`/api/ipd/admissions/${chargeTargetAdmission.id}/assign-charge`, {
        method: "POST",
        body: JSON.stringify(requestBody),
      });
      toast.success("Clinical charges allocated successfully.");
      setSuccessMsg(`Successfully allocated clinical charges to ${chargeTargetAdmission.patient.name} (${chargeTargetAdmission.ipdId}). The items have been posted to the inpatient's billing ledger.`);
      setChargeModalOpen(false);
      setAddedCharges([]);
      setChargeCatalogId("");
      setChargeQty(1);
      setChargeRate("");
      setIsCustomCharge(false);
      setCustomChargeName("");
      setCustomChargeRate("");
      fetchAdmissions();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign charge.");
    } finally {
      setSavingCharge(false);
    }
  };

  // Form submits: Inline Bed Transfer
  const handleBedTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTargetAdmission || !transferBedId) return;
    setSavingTransfer(true);
    try {
      await apiClient(`/api/ipd/admissions/${transferTargetAdmission.id}/transfer-bed`, {
        method: "POST",
        body: JSON.stringify({
          newBedId: transferBedId,
          transferReason,
        }),
      });
      toast.success("Patient bed transfer recorded successfully.");
      setTransferModalOpen(false);
      setTransferBedId("");
      setTransferReason("");
      fetchAdmissions();
    } catch (err: any) {
      toast.error(err.message || "Bed transfer failed.");
    } finally {
      setSavingTransfer(false);
    }
  };

  // Form submits: Assign Diagnostics
  const handleDiagnosticsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagAdmissionId) {
      toast.error("Please select an active inpatient.");
      return;
    }
    if (selectedDiagIds.length === 0) {
      toast.error("Please check at least one laboratory or radiology test.");
      return;
    }
    setSavingDiag(true);
    try {
      const selectedItems = diagCatalogs.filter((d) => selectedDiagIds.includes(d.id));
      const labIds = selectedItems.filter((i) => i.department === "Laboratory").map((i) => i.id);
      const radIds = selectedItems.filter((i) => i.department === "Radiology").map((i) => i.id);

      await apiClient("/api/ipd/diagnostics", {
        method: "POST",
        body: JSON.stringify({
          ipdAdmissionId: diagAdmissionId,
          labTestCatalogIds: labIds,
          radiologyScanCatalogIds: radIds,
        }),
      });
      toast.success("Laboratory/Radiology investigations ordered successfully!");
      const adm = activeAdmissions.find((a) => a.id === diagAdmissionId);
      setSuccessMsg(`Successfully ordered diagnostic tests for patient ${adm?.patient.name || "Inpatient"}. The investigations have been sent to laboratory/radiology logs.`);
      setSelectedDiagIds([]);
      setDiagAdmissionId("");
    } catch (err: any) {
      toast.error(err.message || "Failed to order investigations.");
    } finally {
      setSavingDiag(false);
    }
  };

  // Form submits: Birth & Death Registration
  const handleVitalRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regAdmissionId) {
      toast.error("Please select the corresponding inpatient admission encounter.");
      return;
    }
    setSavingReg(true);
    try {
      if (regMode === "birth") {
        const res = await apiClient<any>(`/api/ipd/admissions/${regAdmissionId}/birth`, {
          method: "POST",
          body: JSON.stringify({
            babyName: birthBabyName || null,
            gender: birthGender,
            weightKg: Number(birthWeight),
            deliveryType: birthDeliveryType,
            dob: birthDob,
            attendingDoctorId: birthDoctorId,
          }),
        });
        toast.success("Birth registered successfully!");
        triggerSlipsPrint(regAdmissionId, "birth");
      } else {
        const res = await apiClient<any>(`/api/ipd/admissions/${regAdmissionId}/death`, {
          method: "POST",
          body: JSON.stringify({
            deceasedName: deathDeceasedName || null,
            deceasedAge: Number(deathDeceasedAge),
            deceasedGender: deathDeceasedGender,
            dateOfDeath: deathDate,
            causeOfDeath: deathCause,
            locationType: deathLocation,
            attendingDoctorId: deathDoctorId,
            informantDetails: deathInformant || null,
          }),
        });
        toast.success("Death registered successfully!");
        triggerSlipsPrint(regAdmissionId, "death");
      }
      setRegAdmissionId("");
    } catch (err: any) {
      toast.error(err.message || "Failed to register vital event.");
    } finally {
      setSavingReg(false);
    }
  };

  // Helper print popup trigger
  const triggerSlipsPrint = async (admissionId: string, type: string) => {
    try {
      const printData = await apiClient<Record<string, unknown>>(
        `/api/ipd/admissions/${admissionId}/print?type=${type}`
      );
      const printResult = await apiClient<{ renderedPayload: string }>("/api/print", {
        method: "POST",
        body: JSON.stringify({
          templateId:
            type === "birth"
              ? "BIRTH_CERTIFICATE"
              : type === "death"
              ? "DEATH_CERTIFICATE"
              : type === "discharge"
              ? "DISCHARGE_SUMMARY"
              : type === "transfer"
              ? "IPD_BED_SLIP"
              : "IPD_ADMISSION_FORM",
          printData,
          options: { format: "A4" },
        }),
      });

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Allow popups to trigger print slips.");
        return;
      }
      printWindow.document.write(`
        <html>
          <head>
            <title>IPD ${type.toUpperCase()} Certificate Slip</title>
            <style>
              body { background: #fff; margin: 0; padding: 20px; font-family: sans-serif; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body onload="window.print()">
            ${printResult.renderedPayload}
          </body>
        </html>
      `);
      printWindow.document.close();
      toast.success("Certificate print compiled.");
    } catch {
      toast.error("Printing layout failed.");
    }
  };

  useEffect(() => {
    if (!activePrintAdmission) {
      setPrintModalCharges([]);
      return;
    }
    const loadCharges = async () => {
      setLoadingPrintCharges(true);
      try {
        const res = await apiClient<any>(`/api/ipd/admissions/${activePrintAdmission.id}`);
        setPrintModalCharges(res.charges || []);
      } catch {
        toast.error("Failed to load billing charges.");
      } finally {
        setLoadingPrintCharges(false);
      }
    };
    loadCharges();
  }, [activePrintAdmission]);

  const handlePrintCharges = () => {
    if (!activePrintAdmission) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Allow popups to print charges.");
      return;
    }
    const chargeRows = printModalCharges.map(c => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${c.chargeCatalog.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${c.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₹${Number(c.rate).toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₹${Number(c.totalAmount).toFixed(2)}</td>
      </tr>
    `).join("");

    const total = printModalCharges.reduce((acc, curr) => acc + Number(curr.totalAmount), 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>IPD Charges Summary - ${activePrintAdmission.ipdId}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; }
            .info-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 15px; margin-bottom: 30px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
            th { background: #f5f5f5; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
            .total-row { font-weight: bold; font-size: 16px; text-align: right; margin-top: 20px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <h2>SHREE GANESHA HOSPITAL</h2>
            <h3>IPD Patient Charges Summary</h3>
          </div>
          <div class="info-grid">
             <div>
               <strong>Patient Name:</strong> ${activePrintAdmission.patient.name}<br>
               <strong>UHID:</strong> ${activePrintAdmission.patient.uhid}<br>
               <strong>IPD ID:</strong> ${activePrintAdmission.ipdId}
             </div>
             <div>
               <strong>Admission Date:</strong> ${new Date(activePrintAdmission.admissionDate).toLocaleDateString()}<br>
               <strong>Status:</strong> ${activePrintAdmission.dischargeDate ? "Discharged" : "Active"}<br>
               <strong>Print Date:</strong> ${new Date().toLocaleDateString()}
             </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 50%;">Charge Description</th>
                <th style="text-align: center; width: 15%;">Qty</th>
                <th style="text-align: right; width: 15%;">Rate</th>
                <th style="text-align: right; width: 20%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${chargeRows || '<tr><td colspan="4" style="text-align: center; padding: 20px;">No charges recorded.</td></tr>'}
            </tbody>
          </table>
          <div class="total-row">
            Grand Total: ₹${total.toFixed(2)}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Fetch discharge details (outstanding bill calculations)
  useEffect(() => {
    if (!dischargeAdmissionId) {
      setDischargeDetails(null);
      return;
    }
    async function loadDischargeDetails() {
      setLoadingDischargeDetails(true);
      try {
        const data = await apiClient<any>(`/api/ipd/admissions/${dischargeAdmissionId}`);
        setDischargeDetails(data);
      } catch {
        toast.error("Failed to load inpatient financial ledger details.");
      } finally {
        setLoadingDischargeDetails(false);
      }
    }
    loadDischargeDetails();
  }, [dischargeAdmissionId]);

  // Form submits: Discharge Patient
  const handleDischargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dischargeAdmissionId) return;
    if (!finalDiagnosis.trim() || finalDiagnosis.length < 3) {
      toast.error("Final Diagnosis must contain at least 3 characters.");
      return;
    }
    if (!dischargeSummary.trim() || dischargeSummary.length < 5) {
      toast.error("Discharge summary must contain a clinical note of at least 5 characters.");
      return;
    }
    setSavingDischarge(true);
    try {
      await apiClient(`/api/ipd/admissions/${dischargeAdmissionId}/discharge`, {
        method: "POST",
        body: JSON.stringify({
          dischargeType,
          finalDiagnosis,
          dischargeSummary,
          treatmentSummary: treatmentSummary || null,
          conditionAtDischarge: conditionAtDischarge || null,
          followUpInstructions: followUpInstructions || null,
          dischargeDateTime: dischargeDateTime ? new Date(dischargeDateTime).toISOString() : null,
        }),
      });
      toast.success("Clinically discharged. Room bed released.");
      
      // Auto open printable documents
      window.open(`/ipd/${dischargeAdmissionId}/discharge-summary`, "_blank");
      window.open(`/ipd/${dischargeAdmissionId}/discharge-card`, "_blank");

      setDischargeAdmissionId("");
      setDischargeSummary("");
      setFinalDiagnosis("");
      setTreatmentSummary("");
      setConditionAtDischarge("");
      setFollowUpInstructions("");
    } catch (err: any) {
      toast.error(err.message || "Failed to clinically discharge patient.");
    } finally {
      setSavingDischarge(false);
    }
  };

  // Filtered diagnostic test items list
  const filteredDiagCatalogs = useMemo(() => {
    return diagCatalogs.filter((item) => {
      const query = diagSearchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query)
      );
    });
  }, [diagCatalogs, diagSearchQuery]);

  // Calculations for discharge ledger items
  const ledgerTotals = useMemo(() => {
    if (!dischargeDetails || !dischargeDetails.charges) return 0;
    return dischargeDetails.charges.reduce((acc: number, curr: any) => acc + Number(curr.totalAmount), 0);
  }, [dischargeDetails]);

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center space-x-2">
            <span>Inpatient Workspace (IPD)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Admit, re-allocate ward beds, assign procedure charges, issue vital certificates, and clinically discharge patients.
          </p>
        </div>
      </div>


      {/* Workspace Content rendering based on activeTab */}
      <div className="w-full">
        {/* ==================== 1. TAB: ACTIVE INPATIENTS ==================== */}
        {(currentTab === "active" || currentTab === "search") && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Search Filter Panel */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPage(1);
                fetchAdmissions();
              }}
              className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl gap-3 grid grid-cols-1 sm:grid-cols-5 items-end"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">IPD ID</label>
                <input
                  type="text"
                  value={filterIpdId}
                  onChange={(e) => setFilterIpdId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                  placeholder="e.g. IPD260001"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">UHID</label>
                <input
                  type="text"
                  value={filterUhid}
                  onChange={(e) => setFilterUhid(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                  placeholder="e.g. SGH29..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">Patient Name</label>
                <input
                  type="text"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                  placeholder="e.g. Ayush"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">Ledger Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                >
                  <option value="ACTIVE">Active Admissions</option>
                  <option value="DISCHARGED">Discharged Inpatients</option>
                  <option value="DECEASED">Deceased Register</option>
                  <option value="">All Admissions Records</option>
                </select>
              </div>

              <button
                type="submit"
                className="flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 px-4 rounded-xl cursor-pointer h-[34px] transition-all"
              >
                <Search size={13} />
                <span>Search</span>
              </button>
            </form>

            {/* List Display */}
            {loading ? (
              <div className="h-64 flex items-center justify-center text-zinc-400 text-sm font-mono">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-3" />
                <span>Extracting inpatient registries...</span>
              </div>
            ) : admissions.length === 0 ? (
              <div className="h-64 border border-dashed border-slate-850 rounded-2xl flex flex-col items-center justify-center text-slate-500 space-y-2">
                <ShieldAlert size={28} className="text-slate-600" />
                <p className="text-xs font-mono">No matching Inpatient admissions found in directory.</p>
              </div>
            ) : (
              <div className="bg-slate-900/20 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950/20 border-b border-slate-800 text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
                        <th className="py-3 px-4">IPD ID</th>
                        <th className="py-3 px-4">Patient Demographics</th>
                        <th className="py-3 px-4">Admitted At</th>
                        <th className="py-3 px-4">Ward / Room Location</th>
                        <th className="py-3 px-4">Attending Clinician</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300">
                      {admissions.map((adm) => (
                        <tr key={adm.id} className="hover:bg-slate-950/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                            {adm.ipdId}
                          </td>
                          <td className="py-3.5 px-4">
                            <div>
                              <span className="font-semibold text-slate-100">{adm.patient.name}</span>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                UHID: {adm.patient.uhid} | {adm.patient.gender}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            {new Date(adm.admissionDate).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-1">
                              <Bed size={12} className="text-slate-400" />
                              <span>
                                Room {adm.bed.room.roomNumber} - Bed {adm.bed.bedNumber}
                              </span>
                            </div>
                            <span className="text-[9px] text-zinc-500 block mt-0.5">
                              {adm.bed.room.roomType.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-200">{adm.primaryDoctor.employee.name}</span>
                            <span className="text-[9px] text-zinc-550 block mt-0.5">
                              {adm.primaryDoctor.employee.designation} • {adm.department.name}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${
                                adm.isDeceased
                                  ? "bg-red-950/30 text-red-400 border border-red-900/30"
                                  : adm.dischargeDate
                                  ? "bg-blue-950/20 text-blue-400 border border-blue-900/30"
                                  : "bg-emerald-950/20 text-emerald-450 border border-emerald-900/30"
                              }`}
                            >
                              {adm.isDeceased ? "Deceased" : adm.dischargeDate ? "Discharged" : "Active Inpatient"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                            {!adm.dischargeDate && !adm.isDeceased && (
                              <>
                                <button
                                  onClick={() => {
                                    setChargeTargetAdmission(adm);
                                    setChargeModalOpen(true);
                                  }}
                                  className="inline-flex items-center space-x-0.5 bg-slate-850 hover:bg-slate-800 text-emerald-400 px-2 py-1 rounded-lg border border-slate-800 text-[10px]"
                                >
                                  <span>+ Charge</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setTransferTargetAdmission(adm);
                                    setTransferModalOpen(true);
                                  }}
                                  className="inline-flex items-center space-x-0.5 bg-slate-850 hover:bg-slate-800 text-amber-400 px-2 py-1 rounded-lg border border-slate-800 text-[10px]"
                                >
                                  <span>Transfer</span>
                                </button>
                              </>
                            )}
                            {adm.dischargeDate && (
                              <button
                                type="button"
                                onClick={() => setActivePrintAdmission(adm)}
                                className="inline-flex items-center space-x-1 bg-slate-850 hover:bg-slate-800 text-emerald-450 hover:text-emerald-400 px-2.5 py-1 rounded-lg border border-slate-800 transition-all text-[10px] font-semibold cursor-pointer"
                              >
                                <Printer size={10} className="mr-0.5" />
                                <span>Print Slips</span>
                              </button>
                            )}
                            <Link
                              href={`/ipd/${adm.id}`}
                              className="inline-flex items-center space-x-1 bg-slate-850 hover:bg-slate-800 text-zinc-300 hover:text-white px-2 py-1 rounded-lg border border-slate-800 transition-all text-[10px]"
                            >
                              <span>Open Chart</span>
                              <ArrowRight size={10} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center border-t border-slate-800 p-4 bg-slate-900/20 text-[10px]">
                    <span className="text-slate-500 font-mono">
                      Page {page} of {totalPages}
                    </span>
                    <div className="flex space-x-1">
                      <button
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                        className="bg-slate-850 hover:bg-slate-800 text-zinc-300 px-3 py-1 rounded-lg disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <button
                        disabled={page === totalPages}
                        onClick={() => setPage(page + 1)}
                        className="bg-slate-850 hover:bg-slate-800 text-zinc-300 px-3 py-1 rounded-lg disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== 2. TAB: NEW ADMISSION ==================== */}
        {currentTab === "admission" && (
          <div className="max-w-2xl bg-slate-900/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm shadow space-y-6 animate-in fade-in duration-200">
            <h2 className="text-sm font-bold text-slate-100 uppercase border-b border-slate-800 pb-2">
              Admit Inpatient Encounter
            </h2>
            <form onSubmit={handleAdmissionSubmit} className="space-y-4">
              {/* Step 1: Patient lookup autocomplete */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400">Search Patient (UHID/Name/Phone) *</label>
                {selectedPatientId ? (
                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-200">{selectedPatientName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPatientId("");
                        setSelectedPatientName("");
                      }}
                      className="text-red-400 hover:underline cursor-pointer"
                    >
                      Clear Lookup
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                      placeholder="Type name, phone or unique UHID..."
                    />
                    {searchingPatients && (
                      <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-emerald-500" />
                    )}
                    {patientMatches.length > 0 && (
                      <div className="absolute w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl z-50 divide-y divide-slate-850">
                        {patientMatches.map((pat) => (
                          <div
                            key={pat.id}
                            onClick={() => {
                              setSelectedPatientId(pat.id);
                              setSelectedPatientName(`${pat.name} (${pat.uhid})`);
                              setPatientMatches([]);
                              setPatientSearch("");
                            }}
                            className="p-3 text-xs flex justify-between hover:bg-slate-900 cursor-pointer"
                          >
                            <span className="font-semibold text-slate-200">{pat.name} ({pat.uhid})</span>
                            <span className="text-slate-400">{pat.phone}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-[9px] text-slate-500 mt-1">
                  If this is a new patient, register them first under the{" "}
                  <Link href="/opd/register" className="text-emerald-400 hover:underline">
                    OPD Patient Registration
                  </Link>{" "}
                  module.
                </p>
              </div>

              {/* Department & Doctor */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400">Admitting Department *</label>
                  <select
                    required
                    value={admitDeptId}
                    onChange={(e) => setAdmitDeptId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400">Admitting Primary Doctor *</label>
                  <select
                    required
                    value={admitDocId}
                    onChange={(e) => setAdmitDocId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.employee.name} ({d.employee.designation})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bed Location Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400">Select Available Bed Location *</label>
                <select
                  required
                  value={admitBedId}
                  onChange={(e) => setAdmitBedId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                >
                  <option value="">Select Bed Location (Vacant only)</option>
                  {rooms.map((room) => {
                    const vacantBeds = room.beds.filter((b) => b.status === "AVAILABLE");
                    if (vacantBeds.length === 0) return null;
                    return (
                      <optgroup
                        key={room.id}
                        label={`Room ${room.roomNumber} - Floor ${room.floor} (${room.roomType}) - ₹${Number(room.chargePerDay).toFixed(0)}/Day`}
                      >
                        {vacantBeds.map((bed) => (
                          <option key={bed.id} value={bed.id}>
                            Bed {bed.bedNumber}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400">Admission Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={admitDate}
                  onChange={(e) => setAdmitDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={admitting}
                  className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-40"
                >
                  {admitting ? "Processing..." : "Generate IPD Admission"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ==================== 3. TAB: ASSIGN DIAGNOSTICS ==================== */}
        {currentTab === "diagnostics" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
            {/* Left Selection */}
            <div className="md:col-span-1 bg-slate-900/40 border border-slate-800 p-5 rounded-2xl backdrop-blur-sm shadow space-y-4">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                1. Select Active Inpatient
              </h3>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400">Admitted Inpatient *</label>
                <select
                  value={diagAdmissionId}
                  onChange={(e) => setDiagAdmissionId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                >
                  <option value="">Select Inpatient</option>
                  {activeAdmissions.map((adm) => (
                    <option key={adm.id} value={adm.id}>
                      {adm.patient.name} ({adm.ipdId}) - Room {adm.bed.room.roomNumber}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {/* Right Panel: Checklist */}
            {diagAdmissionId && (
              <div className="md:col-span-2 bg-slate-900/40 border border-slate-800 p-5 rounded-2xl backdrop-blur-sm shadow space-y-4">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                  2. Select Investigations to Schedule
                </h3>

                <div className="space-y-4">
                  {/* Autocomplete Search input */}
                  <div className="relative">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase">Search & Add Investigations</label>
                    <div className="relative mt-1">
                      <Search className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 h-full" size={14} />
                      <input
                        type="text"
                        value={diagSearchQuery}
                        onChange={(e) => {
                          setDiagSearchQuery(e.target.value);
                          setDiagDropdownOpen(true);
                        }}
                        onFocus={() => setDiagDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setDiagDropdownOpen(false), 200)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl pl-9 pr-4 py-2 outline-none hover:border-slate-700 focus:border-emerald-500"
                        placeholder="Type to search diagnostic tests (e.g. Hemoglobin, X-Ray, Lipid)..."
                      />
                    </div>

                    {/* Floating Dropdown List */}
                    {diagDropdownOpen && diagSearchQuery.trim().length > 0 && (
                      <div className="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-y-auto border border-slate-800 bg-slate-950 rounded-xl divide-y divide-slate-850 shadow-2xl">
                        {filteredDiagCatalogs
                          .filter((item) => !selectedDiagIds.includes(item.id))
                          .map((item) => (
                            <div
                              key={item.id}
                              onClick={() => {
                                setSelectedDiagIds((prev) => [...prev, item.id]);
                                setDiagSearchQuery("");
                                setDiagDropdownOpen(false);
                              }}
                              className="flex justify-between items-center p-3 text-xs text-slate-300 hover:bg-slate-900 cursor-pointer transition-colors"
                            >
                              <div>
                                <span className="font-semibold text-slate-200">{item.name}</span>
                                <span className="text-[9px] block text-zinc-550 font-mono">Code: {item.code} | Dept: {item.department}</span>
                              </div>
                              <span className="font-mono text-emerald-450 font-bold">₹{Number(item.standardRate).toFixed(2)}</span>
                            </div>
                          ))}
                        {filteredDiagCatalogs.filter((item) => !selectedDiagIds.includes(item.id)).length === 0 && (
                          <p className="text-center text-xs text-zinc-550 py-3 italic">No matching diagnostics found.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Queued/Selected Tests List */}
                  {selectedDiagIds.length > 0 && (
                    <div className="border border-slate-800 bg-slate-950/20 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-950 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-800">
                            <th className="py-2.5 px-3">Test Name</th>
                            <th className="py-2.5 px-3">Dept</th>
                            <th className="py-2.5 px-3 text-right">Price</th>
                            <th className="py-2.5 px-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850/50 text-slate-300">
                          {selectedDiagIds.map((id) => {
                            const item = diagCatalogs.find((d) => d.id === id);
                            if (!item) return null;
                            return (
                              <tr key={item.id} className="hover:bg-slate-900/20">
                                <td className="py-2 px-3 font-semibold text-slate-200">{item.name}</td>
                                <td className="py-2 px-3 text-zinc-500 font-mono text-[9px]">{item.department}</td>
                                <td className="py-2 px-3 text-right font-mono text-emerald-400 font-semibold">₹{Number(item.standardRate).toFixed(2)}</td>
                                <td className="py-2 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedDiagIds((prev) => prev.filter((x) => x !== item.id))}
                                    className="text-red-400 hover:text-red-300 text-[10px] hover:underline cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-800">
                  <button
                    onClick={handleDiagnosticsSubmit}
                    disabled={savingDiag}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    {savingDiag ? "Ordering..." : "Order Selected Tests"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== 4. TAB: BIRTH & DEATH REGISTRATION ==================== */}
        {currentTab === "registration" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
            {/* Sidebar selector */}
            <div className="md:col-span-1 bg-slate-900/40 border border-slate-800 p-5 rounded-2xl backdrop-blur-sm shadow space-y-4">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                1. Registry Configuration
              </h3>
              
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setRegMode("birth")}
                  className={`flex-1 text-center py-2 text-xs font-bold rounded-lg ${
                    regMode === "birth"
                      ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Birth Certificate
                </button>
                <button
                  type="button"
                  onClick={() => setRegMode("death")}
                  className={`flex-1 text-center py-2 text-xs font-bold rounded-lg ${
                    regMode === "death"
                      ? "bg-red-650/10 text-red-400 border border-red-500/20"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Death Certificate
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400">Admitted Inpatient *</label>
                <select
                  value={regAdmissionId}
                  onChange={(e) => setRegAdmissionId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                >
                  <option value="">Select Inpatient</option>
                  {activeAdmissions
                    .filter((adm) => regMode !== "birth" || adm.patient.gender === "FEMALE")
                    .map((adm) => (
                      <option key={adm.id} value={adm.id}>
                        {adm.patient.name} ({adm.ipdId})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Registration Forms */}
            {regAdmissionId && (
              <div className="md:col-span-2 bg-slate-900/40 border border-slate-800 p-5 rounded-2xl backdrop-blur-sm shadow space-y-4">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                  {regMode === "birth" ? "2. Baby Birth Registration Form" : "2. Deceased Death Registration Form"}
                </h3>

                <form onSubmit={handleVitalRegistrationSubmit} className="space-y-4">
                  {regMode === "birth" ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-400">Baby Name (Optional)</label>
                        <input
                          type="text"
                          value={birthBabyName}
                          onChange={(e) => setBirthBabyName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                          placeholder="e.g. Baby of Mother"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-slate-400">Gender *</label>
                          <select
                            value={birthGender}
                            onChange={(e) => setBirthGender(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                          >
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-slate-400">Weight (Kg) *</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.1"
                            value={birthWeight}
                            onChange={(e) => setBirthWeight(Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-slate-400">Delivery Type *</label>
                          <select
                            value={birthDeliveryType}
                            onChange={(e) => setBirthDeliveryType(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                          >
                            <option value="NORMAL">Normal Delivery</option>
                            <option value="CESAREAN">Cesarean Section</option>
                            <option value="STILL_BIRTH">Still Birth</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-slate-400">Attending Clinician *</label>
                          <select
                            required
                            value={birthDoctorId}
                            onChange={(e) => setBirthDoctorId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                          >
                            <option value="">Select Doctor</option>
                            {doctors.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.employee.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-400">Date & Time of Birth *</label>
                        <input
                          type="datetime-local"
                          required
                          value={birthDob}
                          onChange={(e) => setBirthDob(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-400">Deceased Legal Name</label>
                        <input
                          type="text"
                          value={deathDeceasedName}
                          onChange={(e) => setDeathDeceasedName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-slate-400">Deceased Age *</label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={deathDeceasedAge}
                            onChange={(e) => setDeathDeceasedAge(Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-slate-400">Gender *</label>
                          <select
                            value={deathDeceasedGender}
                            onChange={(e) => setDeathDeceasedGender(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                          >
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-slate-400">Attending Doctor *</label>
                          <select
                            required
                            value={deathDoctorId}
                            onChange={(e) => setDeathDoctorId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                          >
                            <option value="">Select Doctor</option>
                            {doctors.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.employee.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-slate-400">Death Location Type</label>
                          <select
                            value={deathLocation}
                            onChange={(e) => setDeathLocation(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                          >
                            <option value="IPD">Inpatient Ward (IPD)</option>
                            <option value="EMERGENCY">Emergency Room</option>
                            <option value="DEAD_ON_ARRIVAL">Dead on Arrival</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-400">Cause of Death *</label>
                        <textarea
                          required
                          rows={2}
                          value={deathCause}
                          onChange={(e) => setDeathCause(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl p-2.5 outline-none"
                          placeholder="e.g. Cardiorespiratory Arrest secondary to Septic Shock"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-slate-400">Date & Time of Death *</label>
                          <input
                            type="datetime-local"
                            required
                            value={deathDate}
                            onChange={(e) => setDeathDate(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-slate-400">Informant Details (Optional)</label>
                          <input
                            type="text"
                            value={deathInformant}
                            onChange={(e) => setDeathInformant(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                            placeholder="e.g. Spouse, Brother, etc."
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex justify-end pt-4 border-t border-slate-800">
                    <button
                      type="submit"
                      disabled={savingReg}
                      className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      {savingReg ? "Saving..." : regMode === "birth" ? "Register Birth & Print Certificate" : "Register Death & Print Certificate"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ==================== 5. TAB: DISCHARGE PATIENT ==================== */}
        {currentTab === "discharge" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
            {/* Left selector */}
            <div className="md:col-span-1 bg-slate-900/40 border border-slate-800 p-5 rounded-2xl backdrop-blur-sm shadow space-y-4">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                1. Select Patient
              </h3>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400">Active Inpatient *</label>
                <select
                  value={dischargeAdmissionId}
                  onChange={(e) => setDischargeAdmissionId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                >
                  <option value="">Select Inpatient</option>
                  {activeAdmissions.map((adm) => (
                    <option key={adm.id} value={adm.id}>
                      {adm.patient.name} ({adm.ipdId}) - Room {adm.bed.room.roomNumber}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right details */}
            {dischargeAdmissionId && (
              <div className="md:col-span-2 space-y-6">
                {/* Financial overview */}
                <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl backdrop-blur-sm shadow space-y-4">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                    2. Outstanding Billing Status Check
                  </h3>

                  {loadingDischargeDetails ? (
                    <div className="h-20 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-emerald-500 mr-2" />
                      <span className="text-xs font-mono text-zinc-400">Calculating ledger items...</span>
                    </div>
                  ) : dischargeDetails ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-850">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Accumulative Charges</span>
                          <p className="text-xs text-slate-400 mt-0.5">Includes room rent, clinical visits, diagnostics, and services.</p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold font-mono text-emerald-400">₹{ledgerTotals.toFixed(2)}</span>
                          <span className="text-[9px] block text-zinc-550 italic font-mono mt-0.5">Pending Invoice</span>
                        </div>
                      </div>
                      <p className="text-[9px] text-amber-500 flex items-center space-x-1.5">
                        <AlertCircle size={10} />
                        <span>Discharging releases the bed instantly. Final settlement can be generated at the Billing counter.</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 italic">No details fetched.</p>
                  )}
                </div>

                {/* Discharge summary form */}
                <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl backdrop-blur-sm shadow space-y-4">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                    3. Clinical Discharge Form
                  </h3>

                  <form onSubmit={handleDischargeSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Discharge Type *</span>
                        <select
                          value={dischargeType}
                          onChange={(e) => setDischargeType(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                        >
                          <option value="NORMAL">Normal Discharge</option>
                          <option value="LAMA">LAMA (Left Against Medical Advice)</option>
                          <option value="DAMA">DAMA (Discharged Against Medical Advice)</option>
                          <option value="REFERRED">Referred</option>
                          <option value="EXPIRED">Expired</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Discharge Date & Time</span>
                        <input
                          type="datetime-local"
                          value={dischargeDateTime}
                          onChange={(e) => setDischargeDateTime(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                        />
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Final Discharge/ICD Code *</span>
                        <input
                          type="text"
                          required
                          value={finalDiagnosis}
                          onChange={(e) => setFinalDiagnosis(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                          placeholder="e.g. Acute Appendicitis (K35.8) / ICD-10 Code"
                        />
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Discharge Summary Notes *</span>
                        <textarea
                          required
                          value={dischargeSummary}
                          onChange={(e) => setDischargeSummary(e.target.value)}
                          rows={3}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl p-2.5 outline-none focus:border-emerald-500"
                          placeholder="Detail the patient's recovery trajectory, diagnostic summary, and discharge medications..."
                        />
                        <p className="text-[8px] text-zinc-500">Minimum 5 characters required.</p>
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Treatment Summary</span>
                        <textarea
                          value={treatmentSummary}
                          onChange={(e) => setTreatmentSummary(e.target.value)}
                          rows={2}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl p-2.5 outline-none"
                          placeholder="Medication and procedures performed during hospital stay..."
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Condition at Discharge</span>
                        <input
                          type="text"
                          value={conditionAtDischarge}
                          onChange={(e) => setConditionAtDischarge(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                          placeholder="e.g. Stable, Improved"
                        />
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Follow-up Instructions</span>
                        <textarea
                          value={followUpInstructions}
                          onChange={(e) => setFollowUpInstructions(e.target.value)}
                          rows={2}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl p-2.5 outline-none"
                          placeholder="Upcoming consult reviews, warnings, red-flag symptoms..."
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-800">
                      <button
                        type="submit"
                        disabled={savingDischarge || !dischargeDetails}
                        className="bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 font-semibold py-2 px-5 rounded-xl text-xs cursor-pointer shadow disabled:opacity-40"
                      >
                        {savingDischarge ? "Processing..." : "Complete Discharge & Print Summary"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==========================================
          INLINE MODAL: ASSIGN CHARGES
          ========================================== */}
      {chargeModalOpen && chargeTargetAdmission && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => { setChargeModalOpen(false); setAddedCharges([]); setIsCustomCharge(false); }}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2 mb-4">
              Assign Inpatient Charges
            </h3>
            <p className="text-[10px] text-slate-400 mb-3">
              Allocating charge to: <span className="text-slate-200 font-semibold">{chargeTargetAdmission.patient.name}</span>
            </p>

            <div className="space-y-4">
              {/* Checkbox to choose standard vs custom */}
              <div className="flex items-center space-x-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                <input
                  type="checkbox"
                  id="customChargeToggle"
                  checked={isCustomCharge}
                  onChange={(e) => {
                    setIsCustomCharge(e.target.checked);
                    setChargeCatalogId("");
                    setCustomChargeName("");
                    setCustomChargeRate("");
                    setChargeRate("");
                  }}
                  className="rounded border-slate-850 bg-slate-950 text-emerald-600 focus:ring-0 focus:ring-offset-0 cursor-pointer h-4 w-4"
                />
                <label htmlFor="customChargeToggle" className="text-[10px] font-semibold text-slate-350 cursor-pointer select-none">
                  Custom ad-hoc charge (Custom name & rate)
                </label>
              </div>

              {isCustomCharge ? (
                // Custom Charge Inputs
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400">Custom Charge Name *</label>
                    <input
                      type="text"
                      required
                      value={customChargeName}
                      onChange={(e) => setCustomChargeName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                      placeholder="e.g. Special Extra Dressing, Ambulance Fee"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-400">Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={chargeQty}
                        onChange={(e) => setChargeQty(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-400">Rate (₹) *</label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={customChargeRate}
                        onChange={(e) => setCustomChargeRate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // Standard Catalog Dropdown
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400">Select Catalog Item</label>
                    <select
                      value={chargeCatalogId}
                      onChange={(e) => setChargeCatalogId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                    >
                      <option value="">Choose Catalog</option>
                      {catalogs.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} ({cat.category}) - ₹{Number(cat.rate).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-400">Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={chargeQty}
                        onChange={(e) => setChargeQty(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-400">Custom Rate (Optional)</label>
                      <input
                        type="number"
                        value={chargeRate}
                        onChange={(e) => setChargeRate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                        placeholder="Catalog Default"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (isCustomCharge) {
                    if (!customChargeName) {
                      toast.error("Please enter a custom charge name.");
                      return;
                    }
                    if (!customChargeRate || Number(customChargeRate) <= 0) {
                      toast.error("Please enter a valid positive rate.");
                      return;
                    }
                    setAddedCharges((prev) => [
                      ...prev,
                      {
                        catalogId: "",
                        name: customChargeName,
                        quantity: chargeQty,
                        rate: Number(customChargeRate),
                      },
                    ]);
                    setCustomChargeName("");
                    setCustomChargeRate("");
                    setChargeQty(1);
                  } else {
                    if (!chargeCatalogId) {
                      toast.error("Please select a catalog item first.");
                      return;
                    }
                    const cat = catalogs.find((c) => c.id === chargeCatalogId);
                    setAddedCharges((prev) => [
                      ...prev,
                      {
                        catalogId: chargeCatalogId,
                        name: cat?.name || "",
                        quantity: chargeQty,
                        rate: chargeRate ? Number(chargeRate) : null,
                      },
                    ]);
                    setChargeCatalogId("");
                    setChargeQty(1);
                    setChargeRate("");
                  }
                }}
                className="w-full bg-slate-850 text-emerald-400 border border-slate-800 hover:bg-slate-850 text-xs font-semibold py-2.5 px-4 rounded-xl cursor-pointer"
              >
                + Add to Queue List
              </button>

              {/* Added charges list preview (moved below) */}
              {addedCharges.length > 0 && (
                <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-3 max-h-36 overflow-y-auto space-y-2 mt-2">
                  <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">Charges Queue to Assign</span>
                  <div className="space-y-1.5 mt-1">
                    {addedCharges.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-850">
                        <div>
                          <span className="font-semibold text-slate-200">{item.name}</span>
                          <span className="text-[9px] block text-zinc-500 font-mono">Qty: {item.quantity} | Rate: ₹{item.rate !== null ? item.rate : "Catalog"}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAddedCharges((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-red-450 text-[10px] hover:underline cursor-pointer ml-2"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleAssignChargeSubmit} className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setChargeModalOpen(false); setAddedCharges([]); setIsCustomCharge(false); }}
                  className="bg-slate-850 text-zinc-300 px-4 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={savingCharge}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {savingCharge ? "Saving..." : "Assign All Charges"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          INLINE MODAL: BED TRANSFER
          ========================================== */}
      {transferModalOpen && transferTargetAdmission && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setTransferModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2 mb-4">
              Bed Transfer Allocator
            </h3>
            <p className="text-[10px] text-slate-400 mb-3">
              Patient: <span className="text-slate-200 font-semibold">{transferTargetAdmission.patient.name}</span> | Current Room:{" "}
              <span className="text-slate-200 font-mono">{transferTargetAdmission.bed.room.roomNumber} - Bed {transferTargetAdmission.bed.bedNumber}</span>
            </p>

            <form onSubmit={handleBedTransferSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400">Select Available Bed Location *</label>
                <select
                  required
                  value={transferBedId}
                  onChange={(e) => setTransferBedId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                >
                  <option value="">Select Target Bed (Vacant only)</option>
                  {rooms.map((room) => {
                    const vacantBeds = room.beds.filter((b) => b.status === "AVAILABLE");
                    if (vacantBeds.length === 0) return null;
                    return (
                      <optgroup
                        key={room.id}
                        label={`Room ${room.roomNumber} - Floor ${room.floor} (${room.roomType}) - ₹${Number(room.chargePerDay).toFixed(0)}/Day`}
                      >
                        {vacantBeds.map((bed) => (
                          <option key={bed.id} value={bed.id}>
                            Bed {bed.bedNumber}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400">Transfer Reason Description</label>
                <textarea
                  rows={2}
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl p-2.5 outline-none"
                  placeholder="e.g. Clinical deterioration, ICU upgrade request..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="bg-slate-850 text-zinc-300 px-4 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={savingTransfer}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {savingTransfer ? "Transferring..." : "Complete Bed Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {successMsg && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="mx-auto w-12 h-12 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center">
              <CheckCircle size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-100">
              Action Succeeded!
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {successMsg}
            </p>
            <button
              onClick={() => setSuccessMsg(null)}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* PRINT SLIPS POPUP MODAL */}
      {activePrintAdmission && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setActivePrintAdmission(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2 mb-4">
              Discharge & Print Options
            </h3>
            <p className="text-[10px] text-slate-400 mb-4">
              Inpatient: <span className="text-slate-200 font-semibold">{activePrintAdmission.patient.name} ({activePrintAdmission.ipdId})</span>
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Link
                  href={`/ipd/${activePrintAdmission.id}/discharge-summary`}
                  target="_blank"
                  onClick={() => setActivePrintAdmission(null)}
                  className="flex flex-col items-center justify-center p-4 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-2xl transition-all cursor-pointer text-center text-xs"
                >
                  <FileText size={24} className="text-emerald-450 mb-2" />
                  <span className="font-bold text-slate-200">1. Discharge Summary</span>
                  <span className="text-[9px] text-slate-500 mt-1">A4 Standard clinical record</span>
                </Link>

                <Link
                  href={`/ipd/${activePrintAdmission.id}/discharge-card`}
                  target="_blank"
                  onClick={() => setActivePrintAdmission(null)}
                  className="flex flex-col items-center justify-center p-4 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-2xl transition-all cursor-pointer text-center text-xs"
                >
                  <Printer size={24} className="text-blue-400 mb-2" />
                  <span className="font-bold text-slate-200">2. Discharge Card</span>
                  <span className="text-[9px] text-slate-500 mt-1">A5 Compact summary card</span>
                </Link>
              </div>

              <div className="border-t border-slate-850 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-300">3. Inpatient Billing Charges</h4>
                  <button
                    onClick={handlePrintCharges}
                    disabled={loadingPrintCharges || printModalCharges.length === 0}
                    className="flex items-center space-x-1 bg-slate-850 hover:bg-slate-800 text-[10px] text-emerald-450 border border-slate-800 px-2 py-1 rounded-lg cursor-pointer"
                  >
                    <Printer size={10} />
                    <span>Print Charges Slip</span>
                  </button>
                </div>

                {loadingPrintCharges ? (
                  <div className="flex items-center justify-center py-6 text-[10px] text-slate-500">
                    <Loader2 size={12} className="animate-spin text-emerald-500 mr-2" />
                    <span>Extracting clinical charges...</span>
                  </div>
                ) : printModalCharges.length === 0 ? (
                  <p className="text-[10px] text-slate-500 italic py-2 text-center bg-slate-950 rounded-xl border border-slate-850">
                    No charges billed to this encounter.
                  </p>
                ) : (
                  <div className="bg-slate-950 rounded-xl border border-slate-850 p-3 max-h-40 overflow-y-auto space-y-2 text-[10px] font-mono text-zinc-400">
                    {printModalCharges.map((c) => (
                      <div key={c.id} className="flex justify-between items-center py-1 border-b border-slate-900 last:border-0">
                        <span>
                          • {c.chargeCatalog.name} x {c.quantity} is total charge for that
                        </span>
                        <span className="font-bold text-slate-350">
                          ₹{Number(c.totalAmount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 font-bold text-slate-200">
                      <span>Grand Total:</span>
                      <span>
                        ₹{printModalCharges.reduce((acc, c) => acc + Number(c.totalAmount), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-850 mt-4">
              <button
                onClick={() => setActivePrintAdmission(null)}
                className="bg-slate-850 hover:bg-slate-800 text-zinc-300 px-4 py-2 rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
