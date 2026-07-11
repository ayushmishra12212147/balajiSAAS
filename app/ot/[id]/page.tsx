"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Printer,
  User,
  Activity,
  Plus,
  DollarSign,
  AlertTriangle,
  History,
  CheckCircle,
  FileText,
  Trash2,
  Edit,
} from "lucide-react";
import Link from "next/link";

type OTDetailsType = {
  id: string;
  otId: string;
  operationType: string;
  operationName: string;
  diagnosis: string;
  remarks: string | null;
  scheduledDate: string;
  completedAt: string | null;
  completedBy: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  patient: {
    id: string;
    uhid: string;
    name: string;
    gender: string;
    dob: string;
    phone: string;
  };
  department: {
    id: string;
    name: string;
  };
  procedureCatalogId?: string | null;
  procedureCatalog?: {
    id: string;
    name: string;
    rate: string;
  } | null;
  primarySurgeon: {
    id: string;
    employee: { designation: string };
  };
  assistantSurgeon?: {
    id: string;
    employee: { designation: string };
  } | null;
  revisions: {
    id: string;
    revisionNumber: number;
    operationName: string;
    diagnosis: string;
    remarks: string | null;
    editedAt: string;
  }[];
  charges: {
    id: string;
    chargeCatalogId: string;
    chargeCatalog: { name: string; category: string };
    quantity: number;
    rate: string;
    totalAmount: string;
  }[];
};

type DoctorDropdown = {
  id: string;
  employee: { designation: string };
};

type DepartmentDropdown = {
  id: string;
  name: string;
  isDeleted?: boolean;
};

type ChargeCatalogDropdown = {
  id: string;
  name: string;
  category: string;
  rate: string;
};

export default function OTDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const otId = params.id as string;

  const [ot, setOt] = useState<OTDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionSaving, setActionSaving] = useState(false);

  // Metadata dropdowns
  const [doctors, setDoctors] = useState<DoctorDropdown[]>([]);
  const [departments, setDepartments] = useState<DepartmentDropdown[]>([]);
  const [catalogs, setCatalogs] = useState<ChargeCatalogDropdown[]>([]);

  // Modals state
  const [chargeModal, setChargeModal] = useState(false);
  const [chargeCatalogId, setChargeCatalogId] = useState("");
  const [chargeQty, setChargeQty] = useState(1);
  const [chargeRate, setChargeRate] = useState("");
  const [isCustomCharge, setIsCustomCharge] = useState(false);
  const [customChargeName, setCustomChargeName] = useState("");
  const [customChargeRate, setCustomChargeRate] = useState("");

  // Post OT procedure charge states
  const [customRateInput, setCustomRateInput] = useState("");

  const [closeModal, setCloseModal] = useState(false);

  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [revisionModal, setRevisionModal] = useState(false);
  const [revOpName, setRevOpName] = useState("");
  const [revDiagnosis, setRevDiagnosis] = useState("");
  const [revPrimarySurgeonId, setRevPrimarySurgeonId] = useState("");
  const [revAssistantSurgeonId, setRevAssistantSurgeonId] = useState("");
  const [revDeptId, setRevDeptId] = useState("");
  const [revRemarks, setRevRemarks] = useState("");

  const hasProcedureCharge = React.useMemo(() => {
    if (!ot) return false;
    return ot.charges.some((c) => {
      if (ot.procedureCatalogId) {
        return c.chargeCatalogId === ot.procedureCatalogId;
      } else {
        return c.chargeCatalog.name === ot.operationName;
      }
    });
  }, [ot]);

  const loadOTData = async () => {
    setLoading(true);
    try {
      const data = await apiClient<OTDetailsType>(`/api/ot/${otId}`);
      setOt(data);
      // Pre-populate revision inputs
      setRevOpName(data.operationName);
      setRevDiagnosis(data.diagnosis);
      setRevPrimarySurgeonId(data.primarySurgeon.id);
      setRevAssistantSurgeonId(data.assistantSurgeon?.id || "");
      setRevDeptId(data.department.id);
      setRevRemarks(data.remarks || "");
    } catch {
      toast.error("Failed to load Operation Theatre record chart.");
      router.push("/ot");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOTData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otId]);

  const loadMetadata = async () => {
    try {
      const docs = await apiClient<DoctorDropdown[]>("/api/admin/doctors");
      setDoctors(docs);
      const depts = await apiClient<DepartmentDropdown[]>("/api/admin/departments");
      setDepartments(depts.filter((d) => !d.isDeleted));
      const cats = await apiClient<ChargeCatalogDropdown[]>("/api/opd/catalogs");
      setCatalogs(cats);
    } catch {
      // fail silently
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  const handleChargeAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCustomCharge && !chargeCatalogId) {
      toast.error("Please select a catalog item.");
      return;
    }
    if (isCustomCharge && !customChargeName) {
      toast.error("Please enter a custom charge name.");
      return;
    }
    setActionSaving(true);
    try {
      await apiClient(`/api/ot/${otId}/assign-charge`, {
        method: "POST",
        body: JSON.stringify({
          chargeCatalogId: isCustomCharge ? null : chargeCatalogId,
          customName: isCustomCharge ? customChargeName : null,
          quantity: chargeQty,
          rate: isCustomCharge
            ? (customChargeRate ? Number(customChargeRate) : 0)
            : (chargeRate ? Number(chargeRate) : null),
        }),
      });
      toast.success("Charge assigned successfully.");
      setChargeModal(false);
      setChargeQty(1);
      setChargeRate("");
      setCustomChargeName("");
      setCustomChargeRate("");
      setIsCustomCharge(false);
      loadOTData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Allocation failed.";
      toast.error(msg);
    } finally {
      setActionSaving(false);
    }
  };

  const handlePostProcedureCharge = async () => {
    setActionSaving(true);
    try {
      const payload: any = {
        quantity: 1,
      };
      if (ot?.procedureCatalogId) {
        payload.chargeCatalogId = ot.procedureCatalogId;
        payload.rate = Number(ot.procedureCatalog?.rate || 0);
      } else {
        if (!customRateInput) {
          toast.error("Please enter a custom rate amount.");
          setActionSaving(false);
          return;
        }
        payload.customName = ot?.operationName;
        payload.rate = Number(customRateInput);
      }
      
      await apiClient(`/api/ot/${otId}/assign-charge`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success("Procedure charge posted to ledger successfully!");
      setCustomRateInput("");
      loadOTData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Posting failed.";
      toast.error(msg);
    } finally {
      setActionSaving(false);
    }
  };

  const handleCloseOperation = async () => {
    setActionSaving(true);
    try {
      await apiClient(`/api/ot/${otId}/close`, { method: "POST" });
      toast.success("Surgical operation clinically closed successfully!");
      setCloseModal(false);
      loadOTData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Closure failed.";
      toast.error(msg);
    } finally {
      setActionSaving(false);
    }
  };

  const handleCancelOT = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cancelReason.trim().length < 5) {
      toast.error("Cancellation reason must be at least 5 characters.");
      return;
    }
    setActionSaving(true);
    try {
      await apiClient(`/api/ot/${otId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: cancelReason }),
      });
      toast.success("Scheduled surgery booking cancelled.");
      setCancelModal(false);
      setCancelReason("");
      loadOTData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cancellation failed.";
      toast.error(msg);
    } finally {
      setActionSaving(false);
    }
  };

  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (revOpName.trim().length < 3 || revDiagnosis.trim().length < 3) {
      toast.error("Name and Diagnosis must be at least 3 characters.");
      return;
    }
    setActionSaving(true);
    try {
      await apiClient(`/api/ot/${otId}`, {
        method: "PATCH",
        body: JSON.stringify({
          operationName: revOpName,
          diagnosis: revDiagnosis,
          primarySurgeonId: revPrimarySurgeonId,
          assistantSurgeonId: revAssistantSurgeonId || null,
          departmentId: revDeptId,
          remarks: revRemarks || null,
        }),
      });
      toast.success("Surgical parameters correction recorded successfully!");
      setRevisionModal(false);
      loadOTData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Correction failed.";
      toast.error(msg);
    } finally {
      setActionSaving(false);
    }
  };

  const handlePrint = async (type: string) => {
    try {
      const printData = await apiClient<Record<string, unknown>>(
        `/api/ot/${otId}/print?type=${type}`
      );

      const printResult = await apiClient<{ renderedPayload: string }>("/api/print", {
        method: "POST",
        body: JSON.stringify({
          templateId: type === "slip" ? "OT_BOOKING_SLIP" : "OT_SUMMARY",
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
            <title>OT ${type.toUpperCase()} Certificate Slip</title>
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
      toast.success("Print job compiled.");
    } catch {
      toast.error("Printing failed.");
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-400 text-sm font-mono">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-3" />
        <span>Synchronizing Operation Theatre chart dashboards...</span>
      </div>
    );
  }

  if (!ot) return null;
  const isClosed = !!ot.completedAt;
  const isCancelled = !!ot.cancelledAt;
  const isActive = !isClosed && !isCancelled;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <Link
            href={`/ot?type=${ot.operationType}`}
            className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-bold text-slate-100 tracking-tight">Surgical Console Chart</h1>
              <span
                className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full uppercase ${
                  isCancelled
                    ? "bg-red-950/30 text-red-400 border border-red-900/30"
                    : isClosed
                    ? "bg-emerald-950/20 text-emerald-450 border border-emerald-900/30"
                    : "bg-blue-950/20 text-blue-400 border border-blue-900/30"
                }`}
              >
                {isCancelled ? "Cancelled" : isClosed ? "Closed" : "Scheduled"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              OT Ref: <strong className="text-slate-200 font-mono">#{ot.otId}</strong>
            </p>
          </div>
        </div>

        {/* Dynamic Action Buttons */}
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => handlePrint("slip")}
            className="flex items-center space-x-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-350 hover:text-white font-semibold text-[11px] py-1.5 px-3 rounded-lg cursor-pointer transition-all"
          >
            <Printer size={12} />
            <span>Registration Slip</span>
          </button>

          {isClosed && (
            <>
              <button
                onClick={() => handlePrint("summary")}
                className="flex items-center space-x-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-350 hover:text-white font-semibold text-[11px] py-1.5 px-3 rounded-lg cursor-pointer transition-all"
              >
                <Printer size={12} />
                <span>Procedure Summary</span>
              </button>
              <button
                onClick={() => setRevisionModal(true)}
                className="flex items-center space-x-1 bg-purple-950/25 hover:bg-purple-950/40 border border-purple-900/30 text-purple-400 font-semibold text-[11px] py-1.5 px-3 rounded-lg cursor-pointer transition-all"
              >
                <Edit size={12} />
                <span>Correction Summary</span>
              </button>
            </>
          )}

          {isActive && (
            <>
              <button
                onClick={() => setCancelModal(true)}
                className="flex items-center space-x-1 bg-red-950/20 hover:bg-red-950/30 border border-red-900/30 text-red-400 font-semibold text-[11px] py-1.5 px-3 rounded-lg cursor-pointer transition-all"
              >
                <Trash2 size={12} />
                <span>Cancel Surgery</span>
              </button>
              <button
                onClick={() => setCloseModal(true)}
                className="flex items-center space-x-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-[11px] py-1.5 px-3 rounded-lg cursor-pointer transition-all"
              >
                <CheckCircle size={12} />
                <span>Close Operation</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Cancellation Banner */}
      {isCancelled && (
        <div className="bg-red-950/20 border border-red-900/40 p-4 rounded-2xl flex items-start space-x-3 text-red-400 text-xs animate-in fade-in duration-200">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-red-500" />
          <div>
            <h4 className="font-bold">Surgical Booking Cancelled</h4>
            <p className="italic text-zinc-400 mt-1">Reason: &ldquo;{ot.cancellationReason}&rdquo;</p>
          </div>
        </div>
      )}

      {/* Grid Dashboard Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Demographics & Surgeon info */}
        <div className="md:col-span-1 space-y-6">
          {/* Patient demographics */}
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-3.5 backdrop-blur-sm shadow">
            <h3 className="text-xs font-bold text-emerald-450 flex items-center space-x-2 uppercase border-b border-slate-800 pb-2">
              <User size={14} />
              <span>Patient Profile</span>
            </h3>
            <div className="space-y-2 text-xs text-zinc-300">
              <div className="flex justify-between"><span className="text-zinc-550">Name:</span> <span className="font-bold text-slate-200">{ot.patient.name}</span></div>
              <div className="flex justify-between"><span className="text-zinc-550">UHID:</span> <span className="font-mono text-slate-200">{ot.patient.uhid}</span></div>
              <div className="flex justify-between"><span className="text-zinc-550">Phone:</span> <span className="font-mono text-slate-200">{ot.patient.phone}</span></div>
              <div className="flex justify-between">
                <span className="text-zinc-550">Age / Gender:</span>
                <span className="text-slate-200">
                  {new Date().getFullYear() - new Date(ot.patient.dob).getFullYear()} Y / {ot.patient.gender}
                </span>
              </div>
            </div>
          </div>

          {/* Clinicians & surgeons */}
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-3.5 backdrop-blur-sm shadow">
            <h3 className="text-xs font-bold text-emerald-450 flex items-center space-x-2 uppercase border-b border-slate-800 pb-2">
              <Activity size={14} />
              <span>Surgical Staff Team</span>
            </h3>
            <div className="space-y-3.5 text-xs text-zinc-300">
              <div>
                <span className="text-zinc-550 block text-[10px] uppercase">Primary Surgeon</span>
                <span className="font-semibold text-slate-200 mt-0.5 block">{ot.primarySurgeon.employee.designation}</span>
              </div>
              {ot.assistantSurgeon && (
                <div>
                  <span className="text-zinc-550 block text-[10px] uppercase">Assistant Surgeon</span>
                  <span className="font-semibold text-slate-200 mt-0.5 block">{ot.assistantSurgeon.employee.designation}</span>
                </div>
              )}
              <div>
                <span className="text-zinc-550 block text-[10px] uppercase">Department Scope</span>
                <span className="text-slate-200 mt-0.5 block">{ot.department.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Ledger, Details & Revisions */}
        <div className="md:col-span-2 space-y-6">
          {/* Procedure details */}
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4 backdrop-blur-sm shadow">
            <h3 className="text-xs font-bold text-emerald-450 flex items-center space-x-2 uppercase border-b border-slate-800 pb-2">
              <FileText size={14} />
              <span>Operation Details</span>
            </h3>
            <div className="space-y-3 text-xs text-zinc-300">
              <div>
                <span className="text-zinc-550 block text-[10px] uppercase">Procedure Name</span>
                <p className="font-semibold text-slate-200 mt-1">{ot.operationName}</p>
              </div>
              <div>
                <span className="text-zinc-550 block text-[10px] uppercase">Clinical Diagnosis</span>
                <p className="text-slate-200 mt-1 leading-relaxed font-mono whitespace-pre-wrap">{ot.diagnosis}</p>
              </div>
              {ot.remarks && (
                <div>
                  <span className="text-zinc-550 block text-[10px] uppercase">Remarks / Post-Op Notes</span>
                  <p className="text-slate-400 mt-1 italic leading-relaxed">{ot.remarks}</p>
                </div>
              )}
            </div>
          </div>

          {/* Post-Operation Procedure Billing Banner */}
          {isClosed && !hasProcedureCharge && (
            <div className="bg-emerald-950/15 border border-emerald-900/30 p-5 rounded-2xl space-y-3 animate-in fade-in duration-200">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-emerald-450 uppercase tracking-wider flex items-center space-x-1">
                    <DollarSign size={14} />
                    <span>Post-Operation Procedure Billing</span>
                  </h4>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    The clinical operation has been closed. Apply the surgical procedure charge to post it to the inpatient's billing ledger.
                  </p>
                </div>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Scheduled Procedure:</span>
                  <span className="font-semibold text-slate-200">{ot.operationName}</span>
                </div>
                {ot.procedureCatalog ? (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Registered Standard Rate:</span>
                    <span className="font-mono font-bold text-emerald-450">₹{Number(ot.procedureCatalog.rate).toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[10px] text-slate-500 block">Custom Procedure Rate (₹) *</label>
                    <input
                      type="number"
                      value={customRateInput}
                      onChange={(e) => setCustomRateInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                      placeholder="Enter amount"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end pt-1">
                <button
                  onClick={handlePostProcedureCharge}
                  disabled={actionSaving}
                  className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-4 rounded-xl cursor-pointer transition-all disabled:opacity-50"
                >
                  <DollarSign size={13} />
                  <span>{actionSaving ? "Posting..." : "Post Procedure Charge"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Assigned Charges Ledger */}
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4 backdrop-blur-sm shadow">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-emerald-450 flex items-center space-x-2 uppercase">
                <DollarSign size={14} />
                <span>Operation Assigned Charges Ledger</span>
              </h3>
              {(isActive || isClosed) && (
                <button
                  onClick={() => setChargeModal(true)}
                  className="flex items-center space-x-1 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-200 text-[10px] font-semibold py-1 px-2.5 rounded-lg cursor-pointer"
                >
                  <Plus size={11} />
                  <span>Assign Charge</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-500 uppercase border-b border-slate-850/60 pb-1 block w-full table-fixed">
                    <th className="w-2/5 py-1">Charge Name</th>
                    <th className="w-1/5 py-1 text-center">Qty</th>
                    <th className="w-1/5 py-1 text-right">Rate</th>
                    <th className="w-1/5 py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/40 text-slate-300 block max-h-48 overflow-y-auto">
                  {ot.charges.map((chg) => (
                    <tr key={chg.id} className="py-2 flex items-center justify-between table-fixed">
                      <td className="w-2/5 font-semibold text-slate-200 truncate">
                        {chg.chargeCatalog.name}
                        <span className="text-[9px] text-zinc-550 block">{chg.chargeCatalog.category}</span>
                      </td>
                      <td className="w-1/5 text-center font-mono">{chg.quantity}</td>
                      <td className="w-1/5 text-right font-mono">₹{Number(chg.rate).toFixed(2)}</td>
                      <td className="w-1/5 text-right font-mono font-bold text-emerald-450">₹{Number(chg.totalAmount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historical Revisions Log Accordion */}
          {ot.revisions && ot.revisions.length > 0 && (
            <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4 backdrop-blur-sm shadow">
              <h3 className="text-xs font-bold text-purple-405 flex items-center space-x-2 uppercase border-b border-slate-800 pb-2">
                <History size={14} />
                <span>Historical Parameter Revisions</span>
              </h3>

              <div className="space-y-3">
                {ot.revisions.map((rev) => (
                  <div key={rev.id} className="bg-slate-950/20 border border-slate-850 p-4 rounded-xl text-xs text-zinc-300 space-y-2">
                    <div className="flex justify-between items-center border-b border-slate-850 pb-1.5">
                      <span className="font-bold text-purple-450">Revision #{rev.revisionNumber}</span>
                      <span className="text-[10px] text-zinc-550 font-mono">
                        Edited At: {new Date(rev.editedAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-1 bg-slate-950/40 p-2.5 rounded-lg border border-slate-900/50 text-[11px] leading-relaxed">
                      <p><span className="text-slate-500">Procedure:</span> <strong className="text-slate-200">{rev.operationName}</strong></p>
                      <p className="mt-1"><span className="text-slate-500">Diagnosis:</span> <span className="font-mono text-zinc-300 block bg-slate-950/80 p-2 rounded border border-slate-900 mt-0.5">{rev.diagnosis}</span></p>
                      {rev.remarks && <p className="italic text-zinc-500 mt-1">Remarks: {rev.remarks}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =======================================================
          MODALS IMPLEMENTATIONS
          ======================================================= */}

      {/* 1. ASSIGN CHARGE DIALOG */}
      {chargeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button onClick={() => setChargeModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer">✕</button>
            <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2 mb-4">Assign Surgical Charge</h3>
            <form onSubmit={handleChargeAllocation} className="space-y-4">
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
                      placeholder="e.g. Surgical Materials, Consumables Fee"
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
                    <label className="text-[10px] font-semibold text-slate-400">Select Catalog Item *</label>
                    <select
                      required
                      value={chargeCatalogId}
                      onChange={(e) => setChargeCatalogId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2.5 outline-none"
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
                      <label className="text-[10px] font-semibold text-slate-400">Quantity *</label>
                      <input
                        type="number"
                        min={1}
                        required
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

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => { setChargeModal(false); setIsCustomCharge(false); }} className="bg-slate-850 text-zinc-300 px-4 py-2 rounded-xl text-xs cursor-pointer">Close</button>
                <button type="submit" disabled={actionSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer">
                  {actionSaving ? "Saving..." : "Assign Charge Ledger"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. CLOSE OPERATION DIALOG */}
      {closeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2 mb-3">Close Surgical Operation</h3>
            <p className="text-xs text-slate-400 leading-normal mb-4">
              Closing freezes all procedure records. No further surgeon modifications or manual billable charges can be allocated.
            </p>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setCloseModal(false)} className="bg-slate-850 text-zinc-300 px-4 py-2 rounded-xl text-xs cursor-pointer">Close</button>
              <button onClick={handleCloseOperation} disabled={actionSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer">
                {actionSaving ? "Saving..." : "Confirm & Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CANCEL SURGERY DIALOG */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button onClick={() => setCancelModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer">✕</button>
            <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2 mb-4">Cancel Scheduled Surgery</h3>
            <form onSubmit={handleCancelOT} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400">Cancellation Reason *</label>
                <textarea
                  rows={3}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl p-2.5 outline-none placeholder-slate-655"
                  placeholder="Document reason for cancelling surgery..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setCancelModal(false)} className="bg-slate-850 text-zinc-300 px-4 py-2 rounded-xl text-xs cursor-pointer">Close</button>
                <button type="submit" disabled={actionSaving} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer">
                  {actionSaving ? "Saving..." : "Confirm Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. REVISION CORRECTION DIALOG */}
      {revisionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button onClick={() => setRevisionModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer">✕</button>
            <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2 mb-4">Correction: Edit Completed Surgical Details</h3>
            <form onSubmit={handleRevisionSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400">Procedure Name *</label>
                  <input
                    type="text"
                    required
                    value={revOpName}
                    onChange={(e) => setRevOpName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400">Department Scope *</label>
                  <select
                    required
                    value={revDeptId}
                    onChange={(e) => setRevDeptId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400">Primary Surgeon *</label>
                  <select
                    required
                    value={revPrimarySurgeonId}
                    onChange={(e) => setRevPrimarySurgeonId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                  >
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>{d.employee.designation}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400">Assistant Surgeon</label>
                  <select
                    value={revAssistantSurgeonId}
                    onChange={(e) => setRevAssistantSurgeonId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                  >
                    <option value="">Select Assistant</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>{d.employee.designation}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400">Clinical Diagnosis *</label>
                <textarea
                  rows={3}
                  required
                  value={revDiagnosis}
                  onChange={(e) => setRevDiagnosis(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl p-3 outline-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400">Remarks / Post-Op Notes</label>
                <textarea
                  rows={2}
                  value={revRemarks}
                  onChange={(e) => setRevRemarks(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl p-2.5 outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setRevisionModal(false)} className="bg-slate-850 text-zinc-300 px-4 py-2 rounded-xl text-xs cursor-pointer">Close</button>
                <button type="submit" disabled={actionSaving} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer">
                  {actionSaving ? "Saving..." : "Record Correction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
