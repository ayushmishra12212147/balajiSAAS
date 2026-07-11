"use client";

import React, { useEffect, useState, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { OPDRegistrationSchema, OPDRegistrationFormInput } from "@/modules/opd/schemas";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/modules/auth/hooks/use-auth-store";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Save,
  Search,
  UserPlus,
  Heart,
  Stethoscope,
  Printer,
  X,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QuickPatientForm from "@/components/quick-patient-form";

type PatientSearchType = {
  id: string;
  uhid: string;
  name: string;
  phone?: string;
  gender?: string;
  dob?: string;
  isRevisit?: boolean;
  address?: any;
};

type DepartmentType = {
  id: string;
  name: string;
  code: string;
  isDeleted: boolean;
};

type DoctorType = {
  id: string;
  consultationFee: number;
  roomNumber: string | null;
  specialization: string;
  qualification: string;
  employee: {
    name: string;
    designation: string;
    email: string;
    employeeCode: string;
  };
};

type CatalogType = {
  id: string;
  code: string;
  name: string;
  category: string;
  standardRate: number;
};

function calculateAge(dobString: string): number {
  if (!dobString) return 0;
  const birth = new Date(dobString);
  if (isNaN(birth.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age < 0 ? 0 : age;
}

export default function RegisterOPDPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const preselectedPatientId = searchParams.get("patientId");
  const [saving, setSaving] = useState(false);
  const [showQuickForm, setShowQuickForm] = useState(false);

  // Data fetching states
  const [departments, setDepartments] = useState<DepartmentType[]>([]);
  const [doctors, setDoctors] = useState<DoctorType[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);

  // Patient lookup states
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<PatientSearchType[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchType | null>(null);
  const [searchingPatients, setSearchingPatients] = useState(false);

  // Visit Type state
  const [visitType, setVisitType] = useState<"New" | "Revisit">("New");

  // Print Preview state
  const [printPreviewHtml, setPrintPreviewHtml] = useState<string | null>(null);
  const [slipHtml, setSlipHtml] = useState<string | null>(null);
  const [consultHtml, setConsultHtml] = useState<string | null>(null);
  const [activePreviewType, setActivePreviewType] = useState<"slip" | "consult">("slip");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<OPDRegistrationFormInput>({
    resolver: zodResolver(OPDRegistrationSchema),
    defaultValues: {
      patientId: "",
      doctorId: "",
      departmentId: "",
      originalFee: 0,
      appliedFee: 0,
      overrideReason: "",
      depositAmount: 0,
      symptoms: "",
      assignedLabTests: [],
      assignedRadiologyTests: [],
    },
  });

  // Watch inputs
  const watchDoctorId = useWatch({ control, name: "doctorId" });
  const watchOriginalFee = useWatch({ control, name: "originalFee" });
  const watchAppliedFee = useWatch({ control, name: "appliedFee" });

  // Load departments and doctors metadata
  useEffect(() => {
    async function loadFormMetadata() {
      try {
        const [deptsData, docsData] = await Promise.all([
          apiClient<DepartmentType[]>("/api/admin/departments"),
          apiClient<DoctorType[]>("/api/admin/doctors"),
        ]);
        setDepartments(deptsData.filter((d) => !d.isDeleted));
        setDoctors(docsData);
      } catch {
        toast.error("Failed to load department or doctor listings.");
      } finally {
        setLoadingCatalogs(false);
      }
    }
    loadFormMetadata();
  }, []);

  // Sync patient autocomplete search
  useEffect(() => {
    if (patientSearch.trim().length < 2) {
      setPatientResults([]);
      return;
    }
    const handler = setTimeout(async () => {
      setSearchingPatients(true);
      try {
        const res = await apiClient<{ patients: PatientSearchType[] }>(
          `/api/patients?search=${encodeURIComponent(patientSearch.trim())}`
        );
        setPatientResults(res.patients);
      } catch {
        // Suppress search warnings silently
      } finally {
        setSearchingPatients(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [patientSearch]);

  // Sync consultation fees when doctor is selected
  useEffect(() => {
    if (!watchDoctorId) return;
    const doc = doctors.find((d) => d.id === watchDoctorId);
    if (doc) {
      const fee = Number(doc.consultationFee);
      setValue("originalFee", fee);
      setValue("appliedFee", fee);
    }
  }, [watchDoctorId, doctors, setValue]);

  // Handle selected patient change to check prior visits count
  const handleSelectPatient = async (patient: PatientSearchType) => {
    setSelectedPatient(patient);
    setValue("patientId", patient.id);
    setPatientResults([]);
    setPatientSearch("");
    setShowQuickForm(false);

    try {
      const details = await apiClient<PatientSearchType>(
        `/api/patients/${patient.id}`
      );
      setSelectedPatient(details);
    } catch {
      // silent fail
    }
    // Don't auto-detect revisit, keep it as New
    setVisitType("New");
  };

  useEffect(() => {
    if (preselectedPatientId && doctors.length > 0) {
      async function loadPreselected() {
        try {
          const details = await apiClient<PatientSearchType>(`/api/patients/${preselectedPatientId}`);
          handleSelectPatient(details);
        } catch {
          toast.error("Failed to load preselected patient.");
        }
      }
      loadPreselected();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedPatientId, doctors]);

  const onSubmit = async (data: OPDRegistrationFormInput) => {
    if (!selectedPatient) {
      toast.error("Please select or register a patient first.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...data,
        patientId: selectedPatient.id,
      };

      const res = await apiClient<{ id: string; opdId: string; tokenNumber: number; invoiceId?: string }>("/api/opd", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success(`OPD Consultation registered! ID: ${res.opdId}`);

      // Call central Print Engine API to compile the opd-slip
      const printResult = await apiClient<{ renderedPayload: string }>("/api/print", {
        method: "POST",
        body: JSON.stringify({
          templateId: "OPD_REGISTRATION_SLIP",
          printData: {
            title: "OPD Registration Slip",
            timestamp: new Date().toLocaleString("en-IN"),
            hospitalName: user?.hospitalName || "Shree Ganesha Hospital",
            content: {
              "OPD ID": res.opdId,
              "Token Number": res.tokenNumber,
              "UHID": selectedPatient.uhid,
              "Patient Name": selectedPatient.name,
              "Age": calculateAge(selectedPatient.dob || ""),
              "Gender": selectedPatient.gender || "--",
              "Doctor": doctors.find((d) => d.id === data.doctorId)?.employee.name || "Physician",
              "Department": departments.find((d) => d.id === data.departmentId)?.name || "General",
              "Visit Type": visitType,
              "Consultation Fee": data.appliedFee,
              "Symptoms / Remarks": data.symptoms || "N/A",
              "Date": new Date().toLocaleDateString("en-IN"),
            },
            footer: "Please wait outside the doctor's room. Retain this slip.",
          },
          options: {
            format: "A5",
          },
        }),
      });

      // Save consultation slip
      setSlipHtml(printResult.renderedPayload);
      setPrintPreviewHtml(printResult.renderedPayload);
      setActivePreviewType("slip");

      // Compile consultation prescription slip instantly
      try {
        const consultResult = await apiClient<{ renderedPayload: string }>("/api/print", {
          method: "POST",
          body: JSON.stringify({
            templateId: "OPD_PRESCRIPTION",
            printData: {
              title: "OPD Consultation Slip",
              timestamp: new Date().toLocaleString("en-IN"),
              hospitalName: user?.hospitalName || "Shree Ganesha Hospital",
              content: {
                "OPD ID": res.opdId,
                "Token Number": res.tokenNumber,
                "UHID": selectedPatient.uhid,
                "Patient Name": selectedPatient.name,
                "Age": calculateAge(selectedPatient.dob || ""),
                "Gender": selectedPatient.gender || "--",
                "Doctor": doctors.find((d) => d.id === data.doctorId)?.employee.name || "Physician",
                "Department": departments.find((d) => d.id === data.departmentId)?.name || "General",
                "Visit Type": visitType,
                "Consultation Fee": data.appliedFee,
                "Symptoms / Remarks": data.symptoms || "N/A",
                "Date": new Date().toLocaleDateString("en-IN"),
                "Mobile": selectedPatient.phone || "--",
                "Address": selectedPatient.address || "--",
              },
              footer: "Please carry this slip during your visit.",
            },
            options: {
              format: "A4",
            },
          }),
        });
        setConsultHtml(consultResult.renderedPayload);
      } catch (consultErr) {
        console.error("Failed to compile auto-generated consultation slip layout", consultErr);
        setConsultHtml(null);
      }

      // Reset form and states to clean data
      reset({
        patientId: "",
        doctorId: "",
        departmentId: "",
        originalFee: 0,
        appliedFee: 0,
        overrideReason: "",
        depositAmount: 0,
        symptoms: "",
        assignedLabTests: [],
        assignedRadiologyTests: [],
      });
      setSelectedPatient(null);
      setPatientSearch("");
      setVisitType("New");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register OPD encounter.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (!printPreviewHtml) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocker prevented printing. Please allow popups.");
      return;
    }
    printWindow.document.write(printPreviewHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const isFeeOverridden = watchOriginalFee !== watchAppliedFee;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <Link
            href="/opd/queue"
            className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <span>Register Patient & Visit</span>
              <Sparkles size={16} className="text-emerald-400 animate-pulse" />
            </h1>
            <p className="text-xs text-slate-400">Search patient, schedule doctor consulting, and print token slip</p>
          </div>
        </div>
      </div>

      {loadingCatalogs ? (
        <div className="h-64 flex items-center justify-center text-zinc-400 font-mono text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-3" />
          <span>Synchronizing Medical Directories...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SIDE: PATIENT SEARCH / QUICK REGISTER */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center">
                <Heart size={14} className="mr-2" />
                <span>1. Patient Assignment</span>
              </h3>

              {selectedPatient ? (
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3 relative overflow-hidden">
                  <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-emerald-500 to-teal-500" />
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm">{selectedPatient.name}</h4>
                    <p className="text-[10px] text-zinc-400 font-mono mt-1">
                      UHID: <strong className="text-slate-200">{selectedPatient.uhid}</strong>
                    </p>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      Phone: {selectedPatient.phone || "--"} | Age: {selectedPatient.dob ? calculateAge(selectedPatient.dob) : "--"} Yrs | Gender: {selectedPatient.gender || "--"}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      visitType === "Revisit" 
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }`}>
                      {visitType} Visit (Auto-Detected)
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPatient(null);
                        setValue("patientId", "");
                      }}
                      className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-red-400 text-xs px-2.5 py-1.5 rounded-lg transition-all cursor-pointer font-semibold"
                    >
                      Change Patient
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {!showQuickForm ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 h-full" size={16} />
                        <input
                          type="text"
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl pl-10 pr-4 py-3 outline-none transition-all placeholder-slate-600"
                          placeholder="Search patient name, UHID, Phone..."
                        />
                        {searchingPatients && (
                          <div className="absolute right-3 top-3">
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                          </div>
                        )}
                      </div>

                      {/* Autocomplete Results */}
                      {patientResults.length > 0 && (
                        <div className="border border-slate-850 bg-slate-950 divide-y divide-slate-850 rounded-xl overflow-hidden shadow-xl max-h-48 overflow-y-auto">
                          {patientResults.map((pat) => (
                            <div
                              key={pat.id}
                              onClick={() => handleSelectPatient(pat)}
                              className="p-3 text-xs flex justify-between items-center hover:bg-slate-900 cursor-pointer transition-colors"
                            >
                              <div>
                                <span className="font-semibold text-slate-200">{pat.name}</span>
                                <span className="text-[10px] text-zinc-500 font-mono ml-2">({pat.uhid})</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">{pat.phone}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {patientSearch.trim().length >= 2 && patientResults.length === 0 && !searchingPatients && (
                        <p className="text-[10px] text-zinc-500 italic font-mono">No matching patient records found.</p>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[10px] text-slate-500">Patient not in registry?</span>
                        <button
                          type="button"
                          onClick={() => setShowQuickForm(true)}
                          className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 hover:border-slate-750 text-emerald-400 hover:text-emerald-350 text-xs py-2 px-3.5 rounded-xl cursor-pointer transition-all"
                        >
                          <UserPlus size={13} />
                          <span>Quick Register Patient</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <QuickPatientForm
                      onSuccess={(pat) => handleSelectPatient(pat)}
                      onCancel={() => setShowQuickForm(false)}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE: OPD SCHEDULING FORM */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Encounter Details */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center">
                  <Stethoscope size={14} className="mr-2" />
                  <span>2. Consultation Assignment</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Select Department */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Department *</label>
                    <select
                      {...register("departmentId")}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none transition-all"
                    >
                      <option value="">Select Department...</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    {errors.departmentId && <p className="text-red-400 text-[10px]">{errors.departmentId.message}</p>}
                  </div>

                  {/* Select Doctor */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Consulting Physician *</label>
                    <select
                      {...register("doctorId")}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none transition-all"
                    >
                      <option value="">Select Doctor...</option>
                      {doctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.employee.name} [{doc.specialization}] (Fee: ₹{Number(doc.consultationFee).toFixed(0)})
                        </option>
                      ))}
                    </select>
                    {errors.doctorId && <p className="text-red-400 text-[10px]">{errors.doctorId.message}</p>}
                  </div>

                  {/* Visit Type */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Visit Type</label>
                    <select
                      value={visitType}
                      onChange={(e) => setVisitType(e.target.value as "New" | "Revisit")}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                    >
                      <option value="New">New Visit</option>
                      <option value="Revisit">Revisit</option>
                    </select>
                  </div>

                  {/* Symptoms */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Symptoms / Complaints</label>
                    <input
                      type="text"
                      {...register("symptoms")}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none transition-all placeholder-slate-655"
                      placeholder="e.g. Fever, cough, follow up"
                    />
                  </div>
                </div>
              </div>

              {/* Consultation Fees & Override details */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                  <span>3. Financial Setup</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Standard doctor fee */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Standard Doctor Fee</label>
                    <div className="w-full bg-slate-950/40 border border-slate-800 text-slate-400 text-xs rounded-xl px-3 py-2 font-mono select-none">
                      ₹{Number(watchOriginalFee || 0).toFixed(2)}
                    </div>
                  </div>

                  {/* Applied Fee */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Applied Consultation Fee *</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register("appliedFee", { valueAsNumber: true })}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none transition-all font-mono"
                    />
                    {errors.appliedFee && <p className="text-red-400 text-[10px]">{errors.appliedFee.message}</p>}
                  </div>

                  {/* Deposit Amount */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Optional Deposit Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register("depositAmount", { valueAsNumber: true })}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none transition-all font-mono"
                    />
                    {errors.depositAmount && <p className="text-red-400 text-[10px]">{errors.depositAmount.message}</p>}
                  </div>
                </div>

                {isFeeOverridden && (
                  <div className="space-y-1 animate-in slide-in-from-top-1 duration-200">
                    <label className="text-xs font-semibold text-amber-400">Override Reason Description *</label>
                    <textarea
                      {...register("overrideReason")}
                      rows={2}
                      className="w-full bg-slate-950 border border-amber-900/50 hover:border-amber-855 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-100 text-xs rounded-xl p-3 outline-none"
                      placeholder="Explain fee differences..."
                    />
                    {errors.overrideReason && (
                      <p className="text-red-400 text-[10px]">{errors.overrideReason.message}</p>
                    )}
                  </div>
                )}
              </div>


              {/* Form Submission */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving || !selectedPatient}
                  className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-xs py-2.5 px-6 rounded-xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-40 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Registering encounter...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Register Outpatient & Issue Slip</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CENTRAL PRINT ENGINE IFRAME PREVIEW MODAL */}
      {printPreviewHtml && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
                  <Printer size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Print Preview - OPD Consultation Slip</h3>
                  <p className="text-[10px] text-zinc-500 font-mono">Verify slip layout compile before printer trigger</p>
                </div>
              </div>

              <button
                onClick={() => setPrintPreviewHtml(null)}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Print Selection Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950 px-4 py-2 space-x-2">
              <button
                type="button"
                onClick={() => {
                  setActivePreviewType("slip");
                  setPrintPreviewHtml(slipHtml);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activePreviewType === "slip"
                    ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                1. Registration Slip (Landscape A5)
              </button>
              {consultHtml && (
                <button
                  type="button"
                  onClick={() => {
                    setActivePreviewType("consult");
                    setPrintPreviewHtml(consultHtml);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activePreviewType === "consult"
                      ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  2. Consultation Slip (Portrait A4)
                </button>
              )}
            </div>

            {/* Modal Iframe body */}
            <div className="flex-1 bg-slate-900/40 p-4 overflow-auto flex justify-center items-center">
              <div 
                className="bg-white shadow-xl border border-slate-800 rounded-xl overflow-hidden transition-all duration-300"
                style={{
                  width: activePreviewType === "slip" ? "700px" : "495px",
                  height: activePreviewType === "slip" ? "495px" : "700px",
                }}
              >
                <iframe
                  ref={iframeRef}
                  title="OPD Slip Print Preview"
                  srcDoc={printPreviewHtml || ""}
                  className="w-full h-full border-0"
                />
              </div>
            </div>

            {/* Modal Footer controls */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end space-x-2">
              <button
                onClick={() => setPrintPreviewHtml(null)}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-zinc-300 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Preview
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer"
              >
                <Printer size={13} />
                <span>Trigger Print Job</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {saving && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col items-center space-y-4 shadow-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-xs font-mono text-slate-350">Finalizing OPD Visit registration, please wait...</p>
          </div>
        </div>
      )}
    </div>
  );
}
