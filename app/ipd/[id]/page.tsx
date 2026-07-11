"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Printer,
  Bed,
  User,
  Activity,
  Plus,
  DollarSign,
  Heart,
  Skull,
  Edit,
  History,
  FileText,
  Upload,
  Calendar,
  AlertTriangle,
  FileSpreadsheet,
  Users,
  CheckCircle,
  XCircle,
  HelpCircle,
  CheckSquare
} from "lucide-react";
import Link from "next/link";

type PatientDetailsType = {
  id: string;
  ipdId: string;
  admissionDate: string;
  dischargeDate: string | null;
  dischargeSummary: string | null;
  dischargeType: string | null;
  finalDiagnosis: string | null;
  treatmentSummary: string | null;
  conditionAtDischarge: string | null;
  followUpInstructions: string | null;
  isDeceased: boolean;
  status: string;
  codeStatus: string | null;
  isolationStatus: string | null;
  referredByDoctorId: string | null;
  isMLC: boolean;
  mlcNumber: string | null;
  admissionSource: string | null;
  admissionCategory: string | null;
  expectedLengthOfStayDays: number | null;
  initialDepositRequired: number | null;
  admissionReason: string | null;
  patient: {
    id: string;
    uhid: string;
    name: string;
    gender: string;
    dob: string;
    bloodGroup?: string | null;
    phone: string;
  };
  bed: {
    id: string;
    bedNumber: string;
    room: {
      roomNumber: string;
      roomType: string;
      chargePerDay: string;
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
  referredByDoctor?: {
    employee: {
      name: string;
    };
  } | null;
  doctorAssignments: {
    id: string;
    assignedDoctor: { employee: { name: string; designation: string } };
    effectiveFrom: string;
    effectiveTo: string | null;
    reason: string | null;
  }[];
  bedTransfers: {
    id: string;
    newBed: { bedNumber: string; room: { roomNumber: string } };
    transferDate: string;
    transferReason: string | null;
  }[];
  dischargeSummaryRevisions: {
    id: string;
    revisionNumber: number;
    summary: string;
    editedAt: string;
  }[];
  births: { id: string; certificateNumber: string; babyName: string | null }[];
  deaths: { id: string; certificateNumber: string; causeOfDeath: string }[];
  attendants: {
    id: string;
    name: string;
    relationship: string;
    mobile: string;
    isActive: boolean;
  }[];
  timelineEvents: {
    id: string;
    eventType: string;
    description: string;
    recordedBy: string;
    createdAt: string;
  }[];
  vitals: {
    id: string;
    temperature: number | null;
    pulse: number | null;
    systolicBP: number | null;
    diastolicBP: number | null;
    spo2: number | null;
    respiratoryRate: number | null;
    weight: number | null;
    height: number | null;
    bloodSugar: number | null;
    recordedBy: string;
    createdAt: string;
  }[];
  rounds: {
    id: string;
    condition: string;
    findings: string;
    recommendations: string;
    recordedBy: string;
    createdAt: string;
    doctor: { employee: { name: string } };
  }[];
  progressNotes: {
    id: string;
    noteType: string;
    content: string;
    version: number;
    isAmended: boolean;
    amendmentReason: string | null;
    recordedBy: string;
    createdAt: string;
  }[];
  treatmentOrders: {
    id: string;
    orderType: string;
    priority: string;
    description: string;
    status: string;
    isVerified: boolean;
    verifiedBy: string | null;
    verifiedAt: string | null;
    recordedBy: string;
    createdAt: string;
  }[];
  intakeOutputs: {
    id: string;
    intakeMl: number | null;
    intakeType: string | null;
    outputMl: number | null;
    outputType: string | null;
    remarks: string | null;
    recordedBy: string;
    createdAt: string;
  }[];
  consultations: {
    id: string;
    reason: string;
    urgency: string;
    status: string;
    completionNotes: string | null;
    recordedBy: string;
    createdAt: string;
    targetDepartment: { name: string };
    targetDoctor?: { employee: { name: string } } | null;
  }[];
  handovers: {
    id: string;
    conditionSummary: string;
    checklist: string;
    remarks: string | null;
    recordedBy: string;
    createdAt: string;
    recipientUser: { employeeCode: string; designation: string };
  }[];
  nursingTasks: {
    id: string;
    description: string;
    scheduledTime: string;
    status: string;
    recordedBy: string;
    createdAt: string;
  }[];
  attachments: {
    id: string;
    documentType: string;
    fileUrl: string;
    description: string | null;
    recordedBy: string;
    createdAt: string;
  }[];
  charges: {
    id: string;
    chargeCatalog: { name: string; category: string };
    quantity: number;
    rate: string;
    totalAmount: string;
    createdAt: string;
  }[];
};

type DoctorDropdown = {
  id: string;
  employee: { name: string; designation: string };
  specialization: string;
};

type BedDropdown = {
  id: string;
  roomNumber: string;
  roomType: string;
  floor: string;
  beds: { id: string; bedNumber: string; status: string }[];
};

type EmployeeLookup = {
  id: string;
  employeeCode: string;
  designation: string;
};

type DepartmentDropdown = {
  id: string;
  name: string;
};

export default function IPDDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const admissionId = params.id as string;

  const [admission, setAdmission] = useState<PatientDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionSaving, setActionSaving] = useState(false);

  // Tabs workspace navigation
  const tabsList = [
    "Overview",
    "Vitals",
    "Doctor Rounds",
    "Progress Notes",
    "Treatment Orders",
    "Intake/Output",
    "Consults",
    "Handovers",
    "Nursing Tasks",
    "Timeline",
    "Billing"
  ];
  const [activeTab, setActiveTab] = useState("Overview");

  // Metadata lookups
  const [doctors, setDoctors] = useState<DoctorDropdown[]>([]);
  const [departments, setDepartments] = useState<DepartmentDropdown[]>([]);
  const [systemUsers, setSystemUsers] = useState<EmployeeLookup[]>([]);
  const [beds, setBeds] = useState<BedDropdown[]>([]);

  // Modals state
  const [transferModal, setTransferModal] = useState(false);
  const [transferBedId, setTransferBedId] = useState("");
  const [transferReason, setTransferReason] = useState("");

  const [swapAttendantModal, setSwapAttendantModal] = useState(false);
  const [newAttendantName, setNewAttendantName] = useState("");
  const [newAttendantRelation, setNewAttendantRelation] = useState("");
  const [newAttendantMobile, setNewAttendantMobile] = useState("");

  // Attachments Upload State
  const [uploadDocType, setUploadDocType] = useState("ECG");
  const [uploadFileBase64, setUploadFileBase64] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");

  // Vitals State
  const [vitalTemp, setVitalTemp] = useState("");
  const [vitalPulse, setVitalPulse] = useState("");
  const [vitalSys, setVitalSys] = useState("");
  const [vitalDia, setVitalDia] = useState("");
  const [vitalSpo2, setVitalSpo2] = useState("");
  const [vitalRr, setVitalRr] = useState("");
  const [vitalWeight, setVitalWeight] = useState("");
  const [vitalHeight, setVitalHeight] = useState("");
  const [vitalSugar, setVitalSugar] = useState("");

  // Doctor Round State
  const [roundDocId, setRoundDocId] = useState("");
  const [roundCondition, setRoundCondition] = useState("");
  const [roundFindings, setRoundFindings] = useState("");
  const [roundRecommendations, setRoundRecommendations] = useState("");

  // Progress Notes State
  const [noteType, setNoteType] = useState("DOCTOR");
  const [noteContent, setNoteContent] = useState("");
  // Progress Note Amendment State
  const [amendNoteModal, setAmendNoteModal] = useState(false);
  const [amendTargetNoteId, setAmendTargetNoteId] = useState("");
  const [amendContentText, setAmendContentText] = useState("");
  const [amendReasonText, setAmendReasonText] = useState("");

  // Treatment Orders State
  const [orderType, setOrderType] = useState("MEDICATION");
  const [orderPriority, setOrderPriority] = useState("ROUTINE");
  const [orderDescription, setOrderDescription] = useState("");

  // Intake/Output State
  const [intakeMl, setIntakeMl] = useState("");
  const [intakeType, setIntakeType] = useState("ORAL");
  const [outputMl, setOutputMl] = useState("");
  const [outputType, setOutputType] = useState("URINE");
  const [fluidRemarks, setFluidRemarks] = useState("");

  // Consult Request State
  const [consultDeptId, setConsultDeptId] = useState("");
  const [consultDocId, setConsultDocId] = useState("");
  const [consultReason, setConsultReason] = useState("");
  const [consultUrgency, setConsultUrgency] = useState("ROUTINE");

  // Handovers State
  const [handoverRecipientId, setHandoverRecipientId] = useState("");
  const [handoverCondition, setHandoverCondition] = useState("");
  const [handoverChecklist, setHandoverChecklist] = useState("");
  const [handoverRemarks, setHandoverRemarks] = useState("");

  // Nursing Tasks State
  const [taskDesc, setTaskDesc] = useState("");
  const [taskScheduledTime, setTaskScheduledTime] = useState(
    new Date().toISOString().substring(0, 16)
  );

  // Load Inpatient Chart
  const loadAdmissionData = async () => {
    setLoading(true);
    try {
      const data = await apiClient<PatientDetailsType>(`/api/ipd/admissions/${admissionId}`);
      setAdmission(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load inpatient record chart.");
      router.push("/ipd");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmissionData();
  }, [admissionId]);

  // Load metadata lookups for modals
  const loadModalLookups = async () => {
    try {
      const [docs, depts, users, bds] = await Promise.all([
        apiClient<DoctorDropdown[]>("/api/admin/doctors"),
        apiClient<DepartmentDropdown[]>("/api/admin/departments"),
        apiClient<EmployeeLookup[]>("/api/admin/employees/lookup"),
        apiClient<BedDropdown[]>("/api/ipd/beds")
      ]);
      setDoctors(docs);
      setDepartments(depts);
      setSystemUsers(users);
      setBeds(bds);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    loadModalLookups();
  }, []);

  // Filtered doctors based on selected department for Consults
  const filteredDoctorsForConsult = useMemo(() => {
    if (!consultDeptId) return [];
    return doctors.filter((doc) => {
      // Simple filter logic, since doctor holds direct assignments. If doctors have deptId we can filter.
      // Otherwise list all as fallback.
      return true;
    });
  }, [consultDeptId, doctors]);

  // Header status field patch updates
  const handleHeaderStatusUpdate = async (field: "codeStatus" | "isolationStatus", value: string) => {
    try {
      await apiClient(`/api/ipd/admissions/${admissionId}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value }),
      });
      toast.success(`${field === "codeStatus" ? "Code Status" : "Isolation Protocol"} updated.`);
      loadAdmissionData();
    } catch (err: any) {
      toast.error(err.message || "Failed to record protocol modifications.");
    }
  };

  // ACTIONS POST SUBMITTERS
  const handleBedTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferBedId || !transferReason.trim()) {
      toast.error("Please fill in target bed and reason for transfer.");
      return;
    }
    setActionSaving(true);
    try {
      await apiClient(`/api/ipd/admissions/${admissionId}/transfer-bed`, {
        method: "POST",
        body: JSON.stringify({ newBedId: transferBedId, transferReason }),
      });
      toast.success("Bed transfer completed successfully.");
      setTransferModal(false);
      setTransferReason("");
      loadAdmissionData();
    } catch (err: any) {
      toast.error(err.message || "Transfer failed.");
    } finally {
      setActionSaving(false);
    }
  };



  // Tab Action Handlers
  const handleAttendantSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttendantName.trim() || newAttendantName.length < 2) return;
    if (!newAttendantRelation.trim() || !newAttendantMobile.trim()) return;

    setActionSaving(true);
    try {
      await apiClient(`/api/ipd/admissions/${admissionId}/attendant`, {
        method: "POST",
        body: JSON.stringify({
          name: newAttendantName,
          relationship: newAttendantRelation,
          mobile: newAttendantMobile,
        }),
      });
      toast.success("Attendant swapped successfully.");
      setSwapAttendantModal(false);
      setNewAttendantName("");
      setNewAttendantRelation("");
      setNewAttendantMobile("");
      loadAdmissionData();
    } catch (err: any) {
      toast.error(err.message || "Attendant swap failed.");
    } finally {
      setActionSaving(false);
    }
  };

  const handleAttachmentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileBase64) {
      toast.error("Please choose a file to upload.");
      return;
    }
    setActionSaving(true);
    try {
      await apiClient(`/api/ipd/admissions/${admissionId}/attachments`, {
        method: "POST",
        body: JSON.stringify({
          documentType: uploadDocType,
          fileUrl: uploadFileBase64,
          description: uploadDescription || null,
        }),
      });
      toast.success("Clinical document uploaded.");
      setUploadDescription("");
      setUploadFileBase64("");
      loadAdmissionData();
    } catch (err: any) {
      toast.error(err.message || "Upload failed.");
    } finally {
      setActionSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVitalSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSaving(true);
    try {
      await apiClient(`/api/ipd/admissions/${admissionId}/vitals`, {
        method: "POST",
        body: JSON.stringify({
          temperature: vitalTemp ? Number(vitalTemp) : null,
          pulse: vitalPulse ? Number(vitalPulse) : null,
          systolicBP: vitalSys ? Number(vitalSys) : null,
          diastolicBP: vitalDia ? Number(vitalDia) : null,
          spo2: vitalSpo2 ? Number(vitalSpo2) : null,
          respiratoryRate: vitalRr ? Number(vitalRr) : null,
          weight: vitalWeight ? Number(vitalWeight) : null,
          height: vitalHeight ? Number(vitalHeight) : null,
          bloodSugar: vitalSugar ? Number(vitalSugar) : null,
        }),
      });
      toast.success("Vitals entry recorded.");
      setVitalTemp("");
      setVitalPulse("");
      setVitalSys("");
      setVitalDia("");
      setVitalSpo2("");
      setVitalRr("");
      setVitalWeight("");
      setVitalHeight("");
      setVitalSugar("");
      loadAdmissionData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save vitals.");
    } finally {
      setActionSaving(false);
    }
  };

  const handleRoundSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roundDocId || !roundCondition.trim() || !roundFindings.trim() || !roundRecommendations.trim()) {
      toast.error("All rounds fields are mandatory.");
      return;
    }
    setActionSaving(true);
    try {
      await apiClient(`/api/ipd/admissions/${admissionId}/rounds`, {
        method: "POST",
        body: JSON.stringify({
          doctorId: roundDocId,
          condition: roundCondition,
          findings: roundFindings,
          recommendations: roundRecommendations,
        }),
      });
      toast.success("Doctor rounds summary updated.");
      setRoundCondition("");
      setRoundFindings("");
      setRoundRecommendations("");
      loadAdmissionData();
    } catch (err: any) {
      toast.error(err.message || "Failed to record round summary.");
    } finally {
      setActionSaving(false);
    }
  };

  const handleNoteSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setActionSaving(true);
    try {
      await apiClient(`/api/ipd/admissions/${admissionId}/progress-notes`, {
        method: "POST",
        body: JSON.stringify({
          noteType,
          content: noteContent,
        }),
      });
      toast.success("Progress note appended.");
      setNoteContent("");
      loadAdmissionData();
    } catch (err: any) {
      toast.error(err.message || "Note append failed.");
    } finally {
      setActionSaving(false);
    }
  };

  const handleAmendNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amendContentText.trim() || !amendReasonText.trim() || amendReasonText.length < 5) {
      toast.error("Amendment content and reason (min 5 chars) are required.");
      return;
    }
    setActionSaving(true);
    try {
      await apiClient(`/api/ipd/admissions/${admissionId}/progress-notes`, {
        method: "PATCH",
        body: JSON.stringify({
          noteId: amendTargetNoteId,
          amendedContent: amendContentText,
          amendmentReason: amendReasonText,
        }),
      });
      toast.success("Note amendment registered.");
      setAmendNoteModal(false);
      setAmendContentText("");
      setAmendReasonText("");
      loadAdmissionData();
    } catch (err: any) {
      toast.error(err.message || "Amendment failed.");
    } finally {
      setActionSaving(false);
    }
  };

  const handleOrderSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderDescription.trim()) return;
    setActionSaving(true);
    try {
      await apiClient(`/api/ipd/admissions/${admissionId}/treatment-orders`, {
        method: "POST",
        body: JSON.stringify({
          orderType,
          priority: orderPriority,
          description: orderDescription,
        }),
      });
      toast.success("Treatment order created.");
      setOrderDescription("");
      loadAdmissionData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save order.");
    } finally {
      setActionSaving(false);
    }
  };

  const handleOrderWorkflowAction = async (orderId: string, action: "VERIFY" | "UPDATE_STATUS", value?: string) => {
    try {
      await apiClient(`/api/ipd/admissions/${admissionId}/treatment-orders`, {
        method: "PATCH",
        body: JSON.stringify({
          orderId,
          action,
          status: value,
        }),
      });
      toast.success("Order status updated.");
      loadAdmissionData();
    } catch (err: any) {
      toast.error(err.message || "Status workflow update failed.");
    }
  };

  const handleFluidSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intakeMl && !outputMl) {
      toast.error("At least one of intake volume OR output volume is required.");
      return;
    }
    setActionSaving(true);
    try {
      await apiClient(`/api/ipd/admissions/${admissionId}/intake-output`, {
        method: "POST",
        body: JSON.stringify({
          intakeMl: intakeMl ? Number(intakeMl) : null,
          intakeType: intakeMl ? intakeType : null,
          outputMl: outputMl ? Number(outputMl) : null,
          outputType: outputMl ? outputType : null,
          remarks: fluidRemarks || null,
        }),
      });
      toast.success("Fluid charting recorded.");
      setIntakeMl("");
      setOutputMl("");
      setFluidRemarks("");
      loadAdmissionData();
    } catch (err: any) {
      toast.error(err.message || "Fluid charting failed.");
    } finally {
      setActionSaving(false);
    }
  };

  const handleConsultSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultDeptId || !consultReason.trim() || consultReason.length < 5) {
      toast.error("Department and Reason (min 5 chars) are required.");
      return;
    }
    setActionSaving(true);
    try {
      await apiClient(`/api/ipd/admissions/${admissionId}/consultations`, {
        method: "POST",
        body: JSON.stringify({
          targetDepartmentId: consultDeptId,
          targetDoctorId: consultDocId || null,
          reason: consultReason,
          urgency: consultUrgency,
        }),
      });
      toast.success("Consult referral requested.");
      setConsultReason("");
      loadAdmissionData();
    } catch (err: any) {
      toast.error(err.message || "Consult request failed.");
    } finally {
      setActionSaving(false);
    }
  };

  const handleConsultWorkflow = async (consultId: string, status: string) => {
    let notes = null;
    if (status === "COMPLETED" || status === "DECLINED") {
      const ans = window.prompt(`Enter notes/findings for marking this consult as ${status}:`);
      if (ans === null) return; // cancelled prompt
      notes = ans;
    }
    try {
      await apiClient(`/api/ipd/admissions/${admissionId}/consultations`, {
        method: "PATCH",
        body: JSON.stringify({
          consultId,
          status,
          completionNotes: notes,
        }),
      });
      toast.success(`Consult request is now ${status}.`);
      loadAdmissionData();
    } catch (err: any) {
      toast.error(err.message || "Status workflow change failed.");
    }
  };

  const handleHandoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverRecipientId || !handoverCondition.trim() || handoverCondition.length < 5 || !handoverChecklist.trim()) {
      toast.error("Recipient, patient summary (min 5 chars) and instructions checklist are required.");
      return;
    }
    setActionSaving(true);
    try {
      await apiClient(`/api/ipd/admissions/${admissionId}/handovers`, {
        method: "POST",
        body: JSON.stringify({
          recipientUserId: handoverRecipientId,
          conditionSummary: handoverCondition,
          checklist: handoverChecklist,
          remarks: handoverRemarks || null,
        }),
      });
      toast.success("Handover checklist registered.");
      setHandoverCondition("");
      setHandoverChecklist("");
      setHandoverRemarks("");
      loadAdmissionData();
    } catch (err: any) {
      toast.error(err.message || "Handover record failed.");
    } finally {
      setActionSaving(false);
    }
  };

  const handleTaskSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskDesc.trim() || !taskScheduledTime) return;
    setActionSaving(true);
    try {
      await apiClient(`/api/ipd/admissions/${admissionId}/nursing-tasks`, {
        method: "POST",
        body: JSON.stringify({
          description: taskDesc,
          scheduledTime: taskScheduledTime,
        }),
      });
      toast.success("Nursing task scheduled.");
      setTaskDesc("");
      loadAdmissionData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save task.");
    } finally {
      setActionSaving(false);
    }
  };

  const handleTaskToggle = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "PENDING" ? "COMPLETED" : "PENDING";
    try {
      await apiClient(`/api/ipd/admissions/${admissionId}/nursing-tasks`, {
        method: "PATCH",
        body: JSON.stringify({
          taskId,
          status: nextStatus,
        }),
      });
      toast.success(`Task status changed to ${nextStatus}.`);
      loadAdmissionData();
    } catch (err: any) {
      toast.error(err.message || "Task status toggle failed.");
    }
  };

  const handleTaskCancel = async (taskId: string) => {
    try {
      await apiClient(`/api/ipd/admissions/${admissionId}/nursing-tasks`, {
        method: "PATCH",
        body: JSON.stringify({
          taskId,
          status: "CANCELLED",
        }),
      });
      toast.success("Task cancelled.");
      loadAdmissionData();
    } catch (err: any) {
      toast.error(err.message || "Task cancel failed.");
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        <p className="text-xs text-slate-400 font-mono">Retrieving active clinical chart...</p>
      </div>
    );
  }

  if (!admission) return null;

  const isDischarged = admission.status !== "ADMITTED" && admission.status !== "TRANSFERRED";

  // Critical alerts calculation
  const latestVitals = admission.vitals[0];
  const hasVitalsAlert = latestVitals && (
    (latestVitals.spo2 !== null && latestVitals.spo2 < 90) ||
    (latestVitals.pulse !== null && latestVitals.pulse > 130) ||
    (latestVitals.temperature !== null && latestVitals.temperature > 103) ||
    (latestVitals.systolicBP !== null && latestVitals.systolicBP < 80)
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* 1. CLINICAL HEADER & PROTOCOLS BAR */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link
              href="/ipd?tab=active"
              className="p-2.5 bg-slate-950 border border-slate-850 text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              <ArrowLeft size={15} />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-slate-100">{admission.patient.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[10px] font-mono text-emerald-400">
                  {admission.ipdId}
                </span>
                {admission.isMLC && (
                  <span className="px-2 py-0.5 rounded bg-red-950/80 border border-red-800 text-[8px] font-bold text-red-400 uppercase tracking-wider animate-pulse">
                    MLC: {admission.mlcNumber || "Yes"}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                UHID: {admission.patient.uhid} | {admission.patient.gender} | Age: {new Date().getFullYear() - new Date(admission.patient.dob).getFullYear()} yrs | Blood: {admission.patient.bloodGroup || "Unknown"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Code Status */}
            <div className="flex flex-col space-y-0.5">
              <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Code Status</span>
              <select
                value={admission.codeStatus || "FULL_CODE"}
                onChange={(e) => handleHeaderStatusUpdate("codeStatus", e.target.value)}
                className={`text-[10px] font-bold border rounded-lg px-2.5 py-1 outline-none ${
                  admission.codeStatus === "DNR"
                    ? "bg-red-950 border-red-800 text-red-400"
                    : "bg-slate-950 border-slate-800 text-slate-300"
                }`}
              >
                <option value="FULL_CODE">Full Code</option>
                <option value="DNR">DNR (Do Not Resuscitate)</option>
              </select>
            </div>

            {/* Isolation Status */}
            <div className="flex flex-col space-y-0.5">
              <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Isolation Status</span>
              <select
                value={admission.isolationStatus || "NONE"}
                onChange={(e) => handleHeaderStatusUpdate("isolationStatus", e.target.value)}
                className={`text-[10px] font-bold border rounded-lg px-2.5 py-1 outline-none ${
                  admission.isolationStatus !== "NONE" && admission.isolationStatus !== null
                    ? "bg-amber-950 border-amber-800 text-amber-400"
                    : "bg-slate-950 border-slate-800 text-slate-300"
                }`}
              >
                <option value="NONE">None</option>
                <option value="CONTACT">Contact Isolation</option>
                <option value="DROPLET">Droplet Isolation</option>
                <option value="AIRBORNE">Airborne Isolation</option>
              </select>
            </div>

            {/* Bed Transfer Header Action */}
            {!isDischarged && (
              <button
                type="button"
                onClick={() => setTransferModal(true)}
                className="mt-3 sm:mt-0 p-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-[10px] font-bold transition-all flex items-center space-x-1 cursor-pointer"
              >
                <Bed size={12} />
                <span>Transfer Bed</span>
              </button>
            )}

            {isDischarged && (
              <div className="flex space-x-2">
                <Link
                  href={`/ipd/${admissionId}/discharge-summary`}
                  target="_blank"
                  className="px-3 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300 hover:text-slate-100 rounded-xl transition-all"
                >
                  Discharge Summary (A4)
                </Link>
                <Link
                  href={`/ipd/${admissionId}/discharge-card`}
                  target="_blank"
                  className="px-3 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300 hover:text-slate-100 rounded-xl transition-all"
                >
                  Discharge Card (A5)
                </Link>
                <span className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-bold text-slate-400 select-none uppercase tracking-wider">
                  Discharged ({admission.status})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Info Grid summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-850 text-xs">
          <div>
            <span className="block text-[8px] uppercase tracking-wider text-slate-500">Location Allocation</span>
            <span className="font-semibold text-slate-200">
              Ward: {admission.bed.room.roomType} | Bed: {admission.bed.bedNumber} (Rm {admission.bed.room.roomNumber})
            </span>
          </div>
          <div>
            <span className="block text-[8px] uppercase tracking-wider text-slate-500">Clinician Department</span>
            <span className="font-semibold text-slate-200">
              {admission.department.name} | Attending: Dr. {admission.primaryDoctor.employee.name}
            </span>
          </div>
          <div>
            <span className="block text-[8px] uppercase tracking-wider text-slate-500">Admission Details</span>
            <span className="font-semibold text-slate-200">
              {new Date(admission.admissionDate).toLocaleString()} ({admission.admissionSource})
            </span>
          </div>
          <div>
            <span className="block text-[8px] uppercase tracking-wider text-slate-500">Active Attendant</span>
            <span className="font-semibold text-slate-200">
              {admission.attendants.find((a) => a.isActive)?.name || "None Registered"}
            </span>
          </div>
        </div>

        {/* Critical vitals alert strip */}
        {hasVitalsAlert && (
          <div className="bg-red-950/60 border border-red-800 p-3 rounded-xl flex items-center space-x-2 text-[10px] font-mono text-red-400 animate-pulse">
            <AlertTriangle size={14} className="text-red-400" />
            <span>CRITICAL METRICS WARNING: Patient's latest vitals show indicators of instabilty! (SpO2: {latestVitals.spo2}%, Pulse: {latestVitals.pulse} bpm, Temp: {latestVitals.temperature}°F)</span>
          </div>
        )}
      </div>

      {/* 2. TAB WORKSPACE SELECTION ROW */}
      <div className="border-b border-slate-800 overflow-x-auto flex scrollbar-none">
        {tabsList.map((tab) => {
          const isSelected = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 border-b-2 text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                isSelected
                  ? "border-emerald-500 text-emerald-400 bg-emerald-500/5 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* 3. TABS WORKSPACE CONTENTS */}
      <div className="w-full bg-slate-950/30 border border-slate-800 rounded-2xl p-6 shadow-md min-height-[400px]">
        
        {/* T1: OVERVIEW TAB */}
        {activeTab === "Overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Demographics Card */}
              <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-slate-850 pb-2">
                  Patient Demographics
                </h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-slate-500">Full Name</span>
                    <span className="font-semibold text-slate-200">{admission.patient.name}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-slate-500">UHID Reference</span>
                    <span className="font-mono text-slate-200">{admission.patient.uhid}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-slate-500">Gender / Age</span>
                    <span className="text-slate-200">{admission.patient.gender} | {new Date().getFullYear() - new Date(admission.patient.dob).getFullYear()} Years</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-slate-500">Blood Group</span>
                    <span className="text-slate-200">{admission.patient.bloodGroup || "N/A"}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-slate-500">Admission Date</span>
                    <span className="text-slate-200">{new Date(admission.admissionDate).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-slate-500">Contact Number</span>
                    <span className="text-slate-200 font-mono">{admission.patient.phone}</span>
                  </div>
                </div>
              </div>

              {/* Bed allocation info Card */}
              <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-slate-850 pb-2">
                  Target Bed Allocation
                </h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-slate-500">Ward Name</span>
                    <span className="font-semibold text-slate-200">{admission.bed.room.roomType}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-slate-500">Room Number</span>
                    <span className="font-semibold text-slate-200">Room {admission.bed.room.roomNumber}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-slate-500">Allocated Bed</span>
                    <span className="font-mono text-slate-200">Bed No. {admission.bed.bedNumber}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-slate-500">Ward Charge (Daily)</span>
                    <span className="font-mono text-slate-200">₹{admission.bed.room.chargePerDay}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendants swapped lists */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-5 space-y-4 md:col-span-2">
                <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Primary Attendant Details
                  </h3>
                  {!isDischarged && (
                    <button
                      type="button"
                      onClick={() => setSwapAttendantModal(true)}
                      className="px-2 py-1 bg-slate-900 border border-slate-800 text-[10px] font-bold text-emerald-400 rounded-lg hover:bg-slate-850 cursor-pointer"
                    >
                      Swap Attendant
                    </button>
                  )}
                </div>
                
                <div className="divide-y divide-slate-850 text-xs">
                  {admission.attendants.map((att) => (
                    <div key={att.id} className="py-2.5 flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-slate-200">{att.name} ({att.relationship})</span>
                        <span className="block text-[10px] text-slate-400 font-mono">Mobile: {att.mobile}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                        att.isActive
                          ? "bg-emerald-950 border border-emerald-800 text-emerald-400"
                          : "bg-slate-950 border border-slate-900 text-slate-600"
                      }`}>
                        {att.isActive ? "Active" : "Archived"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attachments Section */}
              <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-slate-850 pb-2">
                  Clinical Attachments
                </h3>
                
                {!isDischarged && (
                  <form onSubmit={handleAttachmentUpload} className="space-y-3 bg-slate-900/30 p-3 rounded-lg border border-slate-850">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase font-semibold text-slate-400">Doc Type</span>
                        <select
                          value={uploadDocType}
                          onChange={(e) => setUploadDocType(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-[10px] rounded px-2 py-1 outline-none text-slate-200"
                        >
                          <option value="ECG">ECG</option>
                          <option value="WOUND_PHOTO">Wound Photo</option>
                          <option value="REFERRAL_NOTE">Referral Note</option>
                          <option value="OUTSIDE_PRESCRIPTION">Outside Rx</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase font-semibold text-slate-400">File</span>
                        <input
                          type="file"
                          onChange={handleFileChange}
                          accept="image/*,application/pdf"
                          className="w-full text-[9px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-slate-950 file:text-slate-300 hover:file:bg-slate-850"
                        />
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-semibold text-slate-400">Description</span>
                      <input
                        type="text"
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-[10px] rounded px-2 py-1 outline-none text-slate-200"
                        placeholder="ECG scan, Referral..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={actionSaving}
                      className="w-full py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded text-[10px] flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Upload size={10} />
                      <span>Upload Document</span>
                    </button>
                  </form>
                )}

                <div className="space-y-2 max-h-40 overflow-y-auto divide-y divide-slate-850 text-[10px]">
                  {admission.attachments.length === 0 ? (
                    <p className="text-slate-500 font-mono text-center pt-2">No attachments uploaded.</p>
                  ) : (
                    admission.attachments.map((file) => (
                      <div key={file.id} className="pt-2 flex justify-between items-start">
                        <div>
                          <span className="font-semibold text-slate-200 block">{file.documentType}</span>
                          <span className="text-slate-400">{file.description || "No description"}</span>
                          <span className="block text-[8px] text-slate-500 font-mono">{new Date(file.createdAt).toLocaleString()}</span>
                        </div>
                        <a
                          href={file.fileUrl}
                          download={`IPD-${admission.ipdId}-${file.documentType}`}
                          className="text-emerald-400 hover:underline font-bold font-mono"
                        >
                          View/Get
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* T2: VITALS TAB */}
        {activeTab === "Vitals" && (
          <div className="space-y-6">
            {!isDischarged && (
              <form onSubmit={handleVitalSave} className="bg-slate-950/40 border border-slate-850 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Log Vitals Record</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3.5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Temp (°F)</span>
                    <input
                      type="number"
                      step="0.1"
                      max="115"
                      value={vitalTemp}
                      onChange={(e) => setVitalTemp(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                      placeholder="e.g. 98.6"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Pulse (bpm)</span>
                    <input
                      type="number"
                      max="300"
                      value={vitalPulse}
                      onChange={(e) => setVitalPulse(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                      placeholder="e.g. 72"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Systolic BP</span>
                    <input
                      type="number"
                      max="300"
                      value={vitalSys}
                      onChange={(e) => setVitalSys(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                      placeholder="e.g. 120"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Diastolic BP</span>
                    <input
                      type="number"
                      max="200"
                      value={vitalDia}
                      onChange={(e) => setVitalDia(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                      placeholder="e.g. 80"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">SpO2 (%)</span>
                    <input
                      type="number"
                      max="100"
                      value={vitalSpo2}
                      onChange={(e) => setVitalSpo2(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                      placeholder="e.g. 98"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Resp Rate</span>
                    <input
                      type="number"
                      max="100"
                      value={vitalRr}
                      onChange={(e) => setVitalRr(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                      placeholder="e.g. 18"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Weight (kg)</span>
                    <input
                      type="number"
                      max="500"
                      value={vitalWeight}
                      onChange={(e) => setVitalWeight(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                      placeholder="e.g. 70"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Height (cm)</span>
                    <input
                      type="number"
                      max="300"
                      value={vitalHeight}
                      onChange={(e) => setVitalHeight(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                      placeholder="e.g. 175"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Random Blood Sugar</span>
                    <input
                      type="number"
                      max="1000"
                      value={vitalSugar}
                      onChange={(e) => setVitalSugar(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                      placeholder="e.g. 110"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={actionSaving}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Activity size={13} />
                    <span>Save Vitals Entry</span>
                  </button>
                </div>
              </form>
            )}

            {/* Vitals History */}
            <div className="bg-slate-900/20 border border-slate-850 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-850 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Vitals Log Chart</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead>
                    <tr className="bg-slate-950/20 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="py-2.5 px-4">Recorded At</th>
                      <th className="py-2.5 px-4">Temp</th>
                      <th className="py-2.5 px-4">Pulse</th>
                      <th className="py-2.5 px-4">BP (mmHg)</th>
                      <th className="py-2.5 px-4">SpO2</th>
                      <th className="py-2.5 px-4">Resp Rate</th>
                      <th className="py-2.5 px-4">RBS</th>
                      <th className="py-2.5 px-4">Staff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {admission.vitals.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500 font-mono">No vitals charted yet.</td>
                      </tr>
                    ) : (
                      admission.vitals.map((v) => {
                        const isTempAlert = v.temperature !== null && v.temperature > 103;
                        const isSpo2Alert = v.spo2 !== null && v.spo2 < 90;
                        const isPulseAlert = v.pulse !== null && v.pulse > 130;
                        const isBpAlert = v.systolicBP !== null && v.systolicBP < 80;

                        return (
                          <tr key={v.id} className="hover:bg-slate-950/25">
                            <td className="py-2.5 px-4 font-mono text-[10px] text-slate-400">
                              {new Date(v.createdAt).toLocaleString()}
                            </td>
                            <td className={`py-2.5 px-4 font-semibold ${isTempAlert ? "text-red-400 font-bold" : ""}`}>
                              {v.temperature ? `${v.temperature}°F` : "—"}
                            </td>
                            <td className={`py-2.5 px-4 font-semibold ${isPulseAlert ? "text-red-400 font-bold" : ""}`}>
                              {v.pulse ? `${v.pulse} bpm` : "—"}
                            </td>
                            <td className={`py-2.5 px-4 font-semibold ${isBpAlert ? "text-red-400 font-bold" : ""}`}>
                              {v.systolicBP && v.diastolicBP ? `${v.systolicBP}/${v.diastolicBP}` : "—"}
                            </td>
                            <td className={`py-2.5 px-4 font-semibold ${isSpo2Alert ? "text-red-400 font-bold" : ""}`}>
                              {v.spo2 ? `${v.spo2}%` : "—"}
                            </td>
                            <td className="py-2.5 px-4">{v.respiratoryRate ? `${v.respiratoryRate}/min` : "—"}</td>
                            <td className="py-2.5 px-4">{v.bloodSugar ? `${v.bloodSugar} mg/dL` : "—"}</td>
                            <td className="py-2.5 px-4 text-slate-400">{v.recordedBy}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* T3: DOCTOR ROUNDS TAB */}
        {activeTab === "Doctor Rounds" && (
          <div className="space-y-6">
            {!isDischarged && (
              <form onSubmit={handleRoundSave} className="bg-slate-950/40 border border-slate-850 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Record Round Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Attending Doctor</span>
                    <select
                      value={roundDocId}
                      onChange={(e) => setRoundDocId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                    >
                      <option value="">Choose physician...</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          Dr. {d.employee.name} ({d.specialization})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Patient Condition</span>
                    <input
                      type="text"
                      value={roundCondition}
                      onChange={(e) => setRoundCondition(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                      placeholder="e.g. Stable, Critically guarded"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Clinical Findings</span>
                    <textarea
                      value={roundFindings}
                      onChange={(e) => setRoundFindings(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                      placeholder="Stethoscope findings, physical parameters..."
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Recommendations & Directives</span>
                    <textarea
                      value={roundRecommendations}
                      onChange={(e) => setRoundRecommendations(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                      placeholder="Therapy updates, change of diet..."
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={actionSaving}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Submit Rounds Log</span>
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-200">Physician Rounds history</span>
              <div className="space-y-3">
                {admission.rounds.length === 0 ? (
                  <p className="text-xs text-slate-500 font-mono text-center py-6">No doctor rounds logged.</p>
                ) : (
                  admission.rounds.map((r) => (
                    <div key={r.id} className="bg-slate-950/20 border border-slate-850 rounded-xl p-4 space-y-3 text-xs">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-850 pb-1.5 font-mono">
                        <span className="font-semibold text-slate-200">Dr. {r.doctor.employee.name}</span>
                        <span>{new Date(r.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-slate-500">Condition</span>
                          <span className="text-slate-200">{r.condition}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-slate-500">Clinical Findings</span>
                          <p className="text-slate-300 whitespace-pre-wrap">{r.findings}</p>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-slate-500">Recommendations</span>
                          <p className="text-slate-300 whitespace-pre-wrap">{r.recommendations}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* T4: PROGRESS NOTES TAB */}
        {activeTab === "Progress Notes" && (
          <div className="space-y-6">
            {!isDischarged && (
              <form onSubmit={handleNoteSave} className="bg-slate-950/40 border border-slate-850 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Append Progress Notes</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Note Category</span>
                    <select
                      value={noteType}
                      onChange={(e) => setNoteType(e.target.value)}
                      className="w-full max-w-xs bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                    >
                      <option value="DOCTOR">Doctor Note</option>
                      <option value="NURSE">Nursing Observation Note</option>
                      <option value="CONSULTANT">Consultant Opinion Note</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Content details</span>
                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                      placeholder="Log ongoing observations, changes in condition..."
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={actionSaving}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Save Progress Note</span>
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-200">Inpatient Progress Chart</span>
              <div className="space-y-3">
                {admission.progressNotes.length === 0 ? (
                  <p className="text-xs text-slate-500 font-mono text-center py-6">No progress notes charted.</p>
                ) : (
                  admission.progressNotes.map((n) => (
                    <div key={n.id} className="bg-slate-950/20 border border-slate-850 rounded-xl p-4 space-y-2 text-xs">
                      <div className="flex justify-between items-center border-b border-slate-850 pb-1.5">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                            n.noteType === "DOCTOR"
                              ? "bg-emerald-950/60 border border-emerald-800 text-emerald-400"
                              : n.noteType === "NURSE"
                              ? "bg-blue-950/60 border border-blue-800 text-blue-400"
                              : "bg-purple-950/60 border border-purple-800 text-purple-400"
                          }`}>
                            {n.noteType}
                          </span>
                          {n.isAmended && (
                            <span className="text-[9px] text-amber-400 font-semibold font-mono">
                              Amended (v{n.version})
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          By: {n.recordedBy} | {new Date(n.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-300 whitespace-pre-wrap">{n.content}</p>
                      {n.isAmended && (
                        <div className="mt-2 bg-amber-950/20 border border-amber-900/60 p-2.5 rounded-lg text-[10px] font-mono text-amber-400">
                          <strong>Amendment Reason:</strong> {n.amendmentReason}
                        </div>
                      )}

                      {!isDischarged && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setAmendTargetNoteId(n.id);
                              setAmendContentText(n.content);
                              setAmendNoteModal(true);
                            }}
                            className="text-[10px] text-slate-400 hover:text-emerald-400 flex items-center space-x-1 hover:underline cursor-pointer"
                          >
                            <Edit size={10} />
                            <span>Amend note</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* T5: TREATMENT ORDERS TAB */}
        {activeTab === "Treatment Orders" && (
          <div className="space-y-6">
            {!isDischarged && (
              <form onSubmit={handleOrderSave} className="bg-slate-950/40 border border-slate-850 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Add Clinical Order</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Order Type</span>
                    <select
                      value={orderType}
                      onChange={(e) => setOrderType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                    >
                      <option value="MEDICATION">Medication</option>
                      <option value="LAB">Laboratory Investigation</option>
                      <option value="RADIOLOGY">Radiology Imaging Scan</option>
                      <option value="PROCEDURE">Procedure / Therapy</option>
                      <option value="DIET">Special Diet</option>
                      <option value="GENERAL">General directive</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Priority</span>
                    <select
                      value={orderPriority}
                      onChange={(e) => setOrderPriority(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                    >
                      <option value="ROUTINE">Routine</option>
                      <option value="URGENT">Urgent</option>
                      <option value="STAT">STAT (Immediate)</option>
                    </select>
                  </div>
                  <div className="space-y-1 md:col-span-3">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Order Prescription / Directions</span>
                    <input
                      type="text"
                      value={orderDescription}
                      onChange={(e) => setOrderDescription(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-emerald-500"
                      placeholder="e.g. Tab Paracetamol 650mg TDS for 3 days, Chest X-Ray..."
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={actionSaving}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Create Directive Order</span>
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-200">Treatment Directives Ledger</span>
              <div className="bg-slate-900/20 border border-slate-850 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead>
                    <tr className="bg-slate-950/20 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="py-2.5 px-4">Order Type</th>
                      <th className="py-2.5 px-4">Priority</th>
                      <th className="py-2.5 px-4">Prescription</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Verification</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {admission.treatmentOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 font-mono">No medical orders entered.</td>
                      </tr>
                    ) : (
                      admission.treatmentOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-950/25">
                          <td className="py-3 px-4 font-semibold">{ord.orderType}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              ord.priority === "STAT"
                                ? "bg-red-950 border border-red-800 text-red-400"
                                : ord.priority === "URGENT"
                                ? "bg-amber-950 border border-amber-800 text-amber-400"
                                : "bg-slate-950 border border-slate-850 text-slate-400"
                            }`}>
                              {ord.priority}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-200 max-w-sm whitespace-pre-wrap">{ord.description}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              ord.status === "COMPLETED"
                                ? "bg-emerald-950 border border-emerald-800 text-emerald-400"
                                : ord.status === "CANCELLED"
                                ? "bg-red-950 border border-red-800 text-red-400"
                                : "bg-slate-950 border border-slate-800 text-amber-400"
                            }`}>
                              {ord.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {ord.isVerified ? (
                              <span className="text-[10px] text-emerald-400 font-medium">
                                Verified by {ord.verifiedBy}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">Unverified</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {!isDischarged && (
                              <div className="flex justify-end gap-1.5">
                                {!ord.isVerified && (
                                  <button
                                    type="button"
                                    onClick={() => handleOrderWorkflowAction(ord.id, "VERIFY")}
                                    className="text-[9px] px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-emerald-400 hover:bg-slate-850 cursor-pointer"
                                  >
                                    Verify
                                  </button>
                                )}

                                {ord.status === "PENDING" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOrderWorkflowAction(ord.id, "UPDATE_STATUS", "COMPLETED")}
                                      className="text-[9px] px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-blue-400 hover:bg-slate-850 cursor-pointer"
                                    >
                                      Complete
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOrderWorkflowAction(ord.id, "UPDATE_STATUS", "CANCELLED")}
                                      className="text-[9px] px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-red-400 hover:bg-slate-850 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* T6: INTAKE/OUTPUT TAB */}
        {activeTab === "Intake/Output" && (
          <div className="space-y-6">
            {!isDischarged && (
              <form onSubmit={handleFluidSave} className="bg-slate-950/40 border border-slate-850 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Log Fluids Charting</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Intake column */}
                  <div className="bg-slate-950/30 p-4 border border-slate-850 rounded-xl space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Intake Fluids Intake</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase font-semibold text-slate-400">Volume (ml)</span>
                        <input
                          type="number"
                          value={intakeMl}
                          onChange={(e) => setIntakeMl(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-xs rounded px-2.5 py-1.5 outline-none font-mono"
                          placeholder="e.g. 200"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase font-semibold text-slate-400">Fluid Type</span>
                        <select
                          value={intakeType}
                          onChange={(e) => setIntakeType(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-xs rounded px-2.5 py-1.5 outline-none"
                        >
                          <option value="ORAL">Oral Fluid</option>
                          <option value="IV_FLUID">Intravenous (IV)</option>
                          <option value="TUBE_FEED">Ryles Tube Feed</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Output column */}
                  <div className="bg-slate-950/30 p-4 border border-slate-850 rounded-xl space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Output Fluids Output</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase font-semibold text-slate-400">Volume (ml)</span>
                        <input
                          type="number"
                          value={outputMl}
                          onChange={(e) => setOutputMl(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-xs rounded px-2.5 py-1.5 outline-none font-mono"
                          placeholder="e.g. 150"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase font-semibold text-slate-400">Fluid Type</span>
                        <select
                          value={outputType}
                          onChange={(e) => setOutputType(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-xs rounded px-2.5 py-1.5 outline-none"
                        >
                          <option value="URINE">Urine</option>
                          <option value="DRAIN">Surgical Drain</option>
                          <option value="VOMIT">Vomit</option>
                          <option value="STOOL">Stool</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Observations Remarks</span>
                    <input
                      type="text"
                      value={fluidRemarks}
                      onChange={(e) => setFluidRemarks(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-2 outline-none text-slate-200"
                      placeholder="Color, consistency, patient tolerance..."
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={actionSaving}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Log Fluid Record</span>
                  </button>
                </div>
              </form>
            )}

            <div className="bg-slate-900/20 border border-slate-850 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-850 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Fluid balance logs</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead>
                    <tr className="bg-slate-950/20 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="py-2.5 px-4">Charted At</th>
                      <th className="py-2.5 px-4">Intake Volume</th>
                      <th className="py-2.5 px-4">Intake Type</th>
                      <th className="py-2.5 px-4">Output Volume</th>
                      <th className="py-2.5 px-4">Output Type</th>
                      <th className="py-2.5 px-4">Remarks</th>
                      <th className="py-2.5 px-4 font-mono">Staff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {admission.intakeOutputs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 font-mono">No fluid charts logged.</td>
                      </tr>
                    ) : (
                      admission.intakeOutputs.map((i) => (
                        <tr key={i.id} className="hover:bg-slate-950/25">
                          <td className="py-2.5 px-4 text-slate-400 font-mono text-[10px]">
                            {new Date(i.createdAt).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-emerald-400 font-mono">
                            {i.intakeMl ? `${i.intakeMl} ml` : "—"}
                          </td>
                          <td className="py-2.5 px-4">{i.intakeType || "—"}</td>
                          <td className="py-2.5 px-4 font-semibold text-amber-400 font-mono">
                            {i.outputMl ? `${i.outputMl} ml` : "—"}
                          </td>
                          <td className="py-2.5 px-4">{i.outputType || "—"}</td>
                          <td className="py-2.5 px-4 max-w-xs">{i.remarks || "—"}</td>
                          <td className="py-2.5 px-4 text-slate-400">{i.recordedBy}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* T7: CONSULTS TAB */}
        {activeTab === "Consults" && (
          <div className="space-y-6">
            {!isDischarged && (
              <form onSubmit={handleConsultSave} className="bg-slate-950/40 border border-slate-850 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Request Consult Referral</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Target Department</span>
                    <select
                      value={consultDeptId}
                      onChange={(e) => setConsultDeptId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                    >
                      <option value="">Choose department...</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Target Doctor (Optional)</span>
                    <select
                      value={consultDocId}
                      onChange={(e) => setConsultDocId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                      disabled={!consultDeptId}
                    >
                      <option value="">Any available Doctor</option>
                      {filteredDoctorsForConsult.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          Dr. {doc.employee.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Urgency Priority</span>
                    <select
                      value={consultUrgency}
                      onChange={(e) => setConsultUrgency(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                    >
                      <option value="ROUTINE">Routine</option>
                      <option value="URGENT">Urgent</option>
                      <option value="STAT">STAT</option>
                    </select>
                  </div>
                  <div className="space-y-1 md:col-span-3">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Clinical Referral Reason</span>
                    <textarea
                      value={consultReason}
                      onChange={(e) => setConsultReason(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                      placeholder="Diagnostic support requested, evaluation notes..."
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={actionSaving}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Issue Consult Request</span>
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-200">Consult Referral Tickets</span>
              <div className="space-y-3">
                {admission.consultations.length === 0 ? (
                  <p className="text-xs text-slate-500 font-mono text-center py-6">No clinical referrals logged.</p>
                ) : (
                  admission.consultations.map((c) => (
                    <div key={c.id} className="bg-slate-950/20 border border-slate-850 rounded-xl p-4 space-y-3 text-xs">
                      <div className="flex justify-between items-center border-b border-slate-850 pb-1.5 font-mono text-[10px]">
                        <div>
                          <span className="font-semibold text-slate-200">{c.targetDepartment.name} Department</span>
                          <span className="text-slate-400 ml-1">
                            ({c.targetDoctor ? `Dr. ${c.targetDoctor.employee.name}` : "Any Doctor"})
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                            c.urgency === "STAT"
                              ? "bg-red-950 border border-red-800 text-red-400"
                              : "bg-slate-950 border border-slate-800 text-slate-400"
                          }`}>
                            {c.urgency}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                            c.status === "COMPLETED"
                              ? "bg-emerald-950 border border-emerald-800 text-emerald-400"
                              : c.status === "DECLINED"
                              ? "bg-red-950 border border-red-800 text-red-400"
                              : "bg-slate-950 border border-slate-800 text-amber-400"
                          }`}>
                            {c.status}
                          </span>
                        </div>
                      </div>

                      <p className="text-slate-300"><strong className="text-[10px] text-slate-400">Referral Reason:</strong> {c.reason}</p>

                      {c.completionNotes && (
                        <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-850 text-[10px] font-mono text-slate-300">
                          <strong>Physician Findings:</strong> {c.completionNotes}
                        </div>
                      )}

                      {!isDischarged && c.status === "REQUESTED" && (
                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleConsultWorkflow(c.id, "ACCEPTED")}
                            className="text-[9px] px-2.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-blue-400 hover:bg-slate-850 cursor-pointer"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConsultWorkflow(c.id, "DECLINED")}
                            className="text-[9px] px-2.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-red-400 hover:bg-slate-850 cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      )}

                      {!isDischarged && c.status === "ACCEPTED" && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleConsultWorkflow(c.id, "COMPLETED")}
                            className="text-[9px] px-2.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-emerald-400 hover:bg-slate-850 cursor-pointer"
                          >
                            Add Completion notes
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* T8: HANDOVERS TAB */}
        {activeTab === "Handovers" && (
          <div className="space-y-6">
            {!isDischarged && (
              <form onSubmit={handleHandoverSubmit} className="bg-slate-950/40 border border-slate-850 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Log Shift Handover</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Oncoming Recipient User</span>
                    <select
                      value={handoverRecipientId}
                      onChange={(e) => setHandoverRecipientId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                    >
                      <option value="">Select Recipient Staff...</option>
                      {systemUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.employeeCode} ({u.designation})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1 md:col-span-3">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Patient Condition Summary</span>
                    <textarea
                      value={handoverCondition}
                      onChange={(e) => setHandoverCondition(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                      placeholder="Present stability status, critical points..."
                    />
                  </div>
                  <div className="space-y-1 md:col-span-3">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Pending Checklist & Instructions</span>
                    <textarea
                      value={handoverChecklist}
                      onChange={(e) => setHandoverChecklist(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                      placeholder="List scheduled medications to give, upcoming scans..."
                    />
                  </div>
                  <div className="space-y-1 md:col-span-3">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Additional Remarks</span>
                    <input
                      type="text"
                      value={handoverRemarks}
                      onChange={(e) => setHandoverRemarks(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-2 outline-none text-slate-200"
                      placeholder="Remarks..."
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={actionSaving}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Save Handover Form</span>
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-200">Shift Handover ledger</span>
              <div className="space-y-3">
                {admission.handovers.length === 0 ? (
                  <p className="text-xs text-slate-500 font-mono text-center py-6">No shift handovers logged.</p>
                ) : (
                  admission.handovers.map((h) => (
                    <div key={h.id} className="bg-slate-950/20 border border-slate-850 rounded-xl p-4 space-y-2 text-xs">
                      <div className="flex justify-between items-center border-b border-slate-850 pb-1.5 font-mono text-[10px] text-slate-400">
                        <span>Outgoing: {h.recordedBy} ➔ Oncoming Recipient: {h.recipientUser.employeeCode} ({h.recipientUser.designation})</span>
                        <span>{new Date(h.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-300">
                        <strong className="text-[10px] uppercase text-slate-400 block mb-0.5">Condition Summary:</strong>
                        {h.conditionSummary}
                      </p>
                      <p className="text-slate-300 font-mono text-[11px] bg-slate-950/50 p-2 border border-slate-850 rounded-lg whitespace-pre-wrap">
                        <strong className="text-[9px] uppercase text-slate-400 block mb-1">Checklist Instructions:</strong>
                        {h.checklist}
                      </p>
                      {h.remarks && (
                        <p className="text-[10px] text-slate-400"><strong>Remarks:</strong> {h.remarks}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* T9: NURSING TASKS TAB */}
        {activeTab === "Nursing Tasks" && (
          <div className="space-y-6">
            {!isDischarged && (
              <form onSubmit={handleTaskSave} className="bg-slate-950/40 border border-slate-850 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Schedule Task</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1 md:col-span-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Duty Task description</span>
                    <input
                      type="text"
                      value={taskDesc}
                      onChange={(e) => setTaskDesc(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-2 outline-none text-slate-200"
                      placeholder="e.g. Check temperature hourly, Give Injection Paracetamol..."
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Scheduled Time</span>
                    <input
                      type="datetime-local"
                      value={taskScheduledTime}
                      onChange={(e) => setTaskScheduledTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-2 outline-none text-slate-200 font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={actionSaving}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add scheduled Task</span>
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-200">Scheduled nursing tasks</span>
              <div className="bg-slate-900/20 border border-slate-850 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead>
                    <tr className="bg-slate-950/20 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="py-2.5 px-4">Scheduled Time</th>
                      <th className="py-2.5 px-4">Task Description</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Staff</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {admission.nursingTasks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 font-mono">No tasks scheduled.</td>
                      </tr>
                    ) : (
                      admission.nursingTasks.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-950/25">
                          <td className="py-3 px-4 font-mono text-[10px]">
                            {new Date(t.scheduledTime).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-slate-200">{t.description}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              t.status === "COMPLETED"
                                ? "bg-emerald-950 border border-emerald-800 text-emerald-400"
                                : t.status === "CANCELLED"
                                ? "bg-red-950 border border-red-800 text-red-400"
                                : "bg-slate-950 border border-slate-800 text-amber-400 animate-pulse"
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400">{t.recordedBy}</td>
                          <td className="py-3 px-4 text-right">
                            {!isDischarged && t.status !== "CANCELLED" && (
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleTaskToggle(t.id, t.status)}
                                  className="text-[9px] px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-emerald-400 hover:bg-slate-850 cursor-pointer"
                                >
                                  {t.status === "PENDING" ? "Mark Done" : "Mark Pending"}
                                </button>
                                {t.status === "PENDING" && (
                                  <button
                                    type="button"
                                    onClick={() => handleTaskCancel(t.id)}
                                    className="text-[9px] px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-red-400 hover:bg-slate-850 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* T10: TIMELINE TAB */}
        {activeTab === "Timeline" && (
          <div className="space-y-6">
            <span className="text-xs font-bold text-slate-200">Patient Stay Timeline logs</span>
            
            <div className="relative border-l border-slate-800 pl-5 ml-2.5 space-y-6 text-xs text-slate-300">
              {admission.timelineEvents.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono pl-2 py-4">No events logged on timeline.</p>
              ) : (
                admission.timelineEvents.map((evt) => (
                  <div key={evt.id} className="relative group">
                    {/* Timeline bullet icon */}
                    <div className="absolute -left-[26px] top-1.5 w-3 h-3 rounded-full bg-emerald-500 border border-slate-950 group-hover:scale-125 transition-transform" />
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                          {evt.eventType}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(evt.createdAt).toLocaleString()} | Recorded by: {evt.recordedBy}
                        </span>
                      </div>
                      <p className="text-slate-200 leading-relaxed max-w-2xl">{evt.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* T11: BILLING TAB */}
        {activeTab === "Billing" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-200">Accumulated Billable Charges</span>
              <div className="flex space-x-2">
                <Link
                  href={`/ipd/${admissionId}/print-bill`}
                  target="_blank"
                  className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 rounded-xl text-[10px] font-bold transition-all flex items-center space-x-1"
                >
                  <Printer size={12} />
                  <span>Print Detailed Bill</span>
                </Link>
                {isDischarged && (
                  <Link
                    href={`/billing/no-due-slip?admissionId=${admissionId}`}
                    target="_blank"
                    className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 rounded-xl text-[10px] font-bold transition-all flex items-center space-x-1"
                  >
                    <CheckSquare size={12} />
                    <span>No Due Certificate</span>
                  </Link>
                )}
              </div>
            </div>

            <div className="bg-slate-900/20 border border-slate-850 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="bg-slate-950/20 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                    <th className="py-2.5 px-4">Charge Date</th>
                    <th className="py-2.5 px-4">Catalog Name</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4 text-right">Rate</th>
                    <th className="py-2.5 px-4 text-center">Qty</th>
                    <th className="py-2.5 px-4 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {admission.charges.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-mono">No billable charges mapped.</td>
                    </tr>
                  ) : (
                    admission.charges.map((chg) => (
                      <tr key={chg.id} className="hover:bg-slate-950/25">
                        <td className="py-2.5 px-4 text-slate-400 font-mono">
                          {new Date(chg.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-4 text-slate-100 font-semibold">{chg.chargeCatalog.name}</td>
                        <td className="py-2.5 px-4 text-slate-400">{chg.chargeCatalog.category}</td>
                        <td className="py-2.5 px-4 text-right font-mono">₹{Number(chg.rate).toFixed(2)}</td>
                        <td className="py-2.5 px-4 text-center font-mono">{chg.quantity}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400">
                          ₹{Number(chg.totalAmount).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Balance Card */}
            <div className="flex justify-end pt-2">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 w-72 text-xs space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Gross Total charges:</span>
                  <span className="font-mono">
                    ₹{admission.charges.reduce((acc, c) => acc + Number(c.totalAmount), 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 border-b border-slate-850 pb-2">
                  <span>Initial Deposits paid:</span>
                  <span className="font-mono text-emerald-400">
                    - ₹{Number(admission.initialDepositRequired || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-200 font-bold text-sm">
                  <span>Due Balance:</span>
                  <span className="font-mono text-amber-400">
                    ₹{Math.max(0, admission.charges.reduce((acc, c) => acc + Number(c.totalAmount), 0) - Number(admission.initialDepositRequired || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ====================================================
          MODALS & DRAWERS SECTIONS
          ==================================================== */}

      {/* M1: BED TRANSFER MODAL */}
      {transferModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleBedTransfer} className="bg-slate-950 border border-slate-800 p-6 rounded-2xl w-full max-w-md space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-1.5">
              <Bed size={15} />
              <span>Inpatient Ward/Bed Transfer</span>
            </h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Destination Room/Bed</span>
                <select
                  value={transferBedId}
                  onChange={(e) => setTransferBedId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                >
                  <option value="">Choose vacant bed...</option>
                  {beds.map((room) =>
                    room.beds
                      .filter((b) => b.status === "AVAILABLE")
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          Room {room.roomNumber} - Bed {b.bedNumber} ({room.roomType})
                        </option>
                      ))
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Reason for Transfer</span>
                <input
                  type="text"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                  placeholder="e.g. Patient requested private ward, clinical monitoring upgrade..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setTransferModal(false)}
                className="px-4 py-2 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionSaving}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
              >
                Execute Transfer
              </button>
            </div>
          </form>
        </div>
      )}



      {/* M3: SWAP ATTENDANT MODAL */}
      {swapAttendantModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAttendantSwap} className="bg-slate-950 border border-slate-800 p-6 rounded-2xl w-full max-w-md space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-1.5">
              <Users size={15} />
              <span>Swap Primary Attendant</span>
            </h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400">Attendant Name *</span>
                <input
                  type="text"
                  value={newAttendantName}
                  onChange={(e) => setNewAttendantName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400">Relationship *</span>
                <input
                  type="text"
                  value={newAttendantRelation}
                  onChange={(e) => setNewAttendantRelation(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                  placeholder="e.g. Mother, Brother"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400">Mobile *</span>
                <input
                  type="text"
                  value={newAttendantMobile}
                  onChange={(e) => setNewAttendantMobile(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500 font-mono"
                  placeholder="10-digit phone number"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSwapAttendantModal(false)}
                className="px-4 py-2 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionSaving}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
              >
                Commit Swap
              </button>
            </div>
          </form>
        </div>
      )}

      {/* M4: AMEND PROGRESS NOTE MODAL */}
      {amendNoteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAmendNoteSubmit} className="bg-slate-950 border border-slate-800 p-6 rounded-2xl w-full max-w-lg space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-100">Amend Progress Note</h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Amended Content</span>
                <textarea
                  value={amendContentText}
                  onChange={(e) => setAmendContentText(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Reason for Amendment * (Min 5 chars)</span>
                <input
                  type="text"
                  value={amendReasonText}
                  onChange={(e) => setAmendReasonText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                  placeholder="e.g. Corrected drug dose typo, added late vitals indicators..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAmendNoteModal(false)}
                className="px-4 py-2 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionSaving}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
              >
                Save Amendment (New version)
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
