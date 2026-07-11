"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RadiologyReportSchema, RadiologyReportFormInput } from "@/modules/diagnostics/schemas";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Printer,
  Save,
  AlertTriangle,
  Activity,
  Clock,
  User,
  Trash2,
} from "lucide-react";
import Link from "next/link";

type RadiologyRevision = {
  id: string;
  revisionNumber: number;
  findings: string;
  remarks: string | null;
  technicianId: string | null;
  verifiedById: string | null;
  completedAt: string;
  completedBy: string;
  editedAt: string;
  editedBy: string;
};

type RadiologyDetailsType = {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  completedBy: string | null;
  findings: string | null;
  remarks: string | null;
  technicianId: string | null;
  verifiedById: string | null;
  technicianDesignation: string;
  verifiedByDesignation: string;
  isPaid: boolean;
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
  scanCatalog: {
    name: string;
    code: string;
    category: string;
  };
  orderedByDoctor: {
    employee: {
      designation: string;
    };
  };
  revisions: RadiologyRevision[];
};

type EmployeeLookup = {
  id: string;
  employeeCode: string;
  designation: string;
};

export default function RadiologyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<RadiologyDetailsType | null>(null);
  const [employees, setEmployees] = useState<EmployeeLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionSaving, setActionSaving] = useState(false);

  // Cancellation Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RadiologyReportFormInput>({
    resolver: zodResolver(RadiologyReportSchema),
    defaultValues: {
      orderId: "",
      findings: "",
      remarks: "",
      technicianId: "",
      verifiedById: "",
    },
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const details = await apiClient<RadiologyDetailsType>(`/api/radiology/orders/${orderId}`);
      setOrder(details);

      // Fetch active staff lookups for Technician & Verifier selectors
      const staff = await apiClient<EmployeeLookup[]>("/api/admin/employees/lookup");
      setEmployees(staff);

      // Populate form defaults
      reset({
        orderId: details.id,
        findings: details.findings || "",
        remarks: details.remarks || "",
        technicianId: details.technicianId || "",
        verifiedById: details.verifiedById || "",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load radiology order details.";
      toast.error(msg);
      router.push("/radiology");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Actions
  const onFormSubmit = async (data: RadiologyReportFormInput) => {
    setActionSaving(true);
    try {
      await apiClient(`/api/radiology/orders/${orderId}/report`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Radiology findings report saved successfully!");
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save findings.";
      toast.error(msg);
    } finally {
      setActionSaving(false);
    }
  };

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cancelReason.trim().length < 5) {
      toast.error("Cancellation reason must be at least 5 characters.");
      return;
    }
    setActionSaving(true);
    try {
      await apiClient(`/api/radiology/orders/${orderId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: cancelReason }),
      });
      toast.success("Radiology scan cancelled successfully.");
      setCancelModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel order.";
      toast.error(msg);
    } finally {
      setActionSaving(false);
    }
  };

  const handlePrintReport = async () => {
    try {
      const printData = await apiClient<Record<string, unknown>>(`/api/radiology/orders/${orderId}/print`);

      // Request print compilation
      const printResult = await apiClient<{ renderedPayload: string }>("/api/print", {
        method: "POST",
        body: JSON.stringify({
          templateId: "OPD_SLIP",
          printData,
          options: { format: "A4" },
        }),
      });

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Popup blocker prevented printing. Please allow popups.");
        return;
      }
      printWindow.document.write(`
        <html>
          <head>
            <title>Radiology Scan Findings Report</title>
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
      toast.success("Print command triggered.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to print report.";
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-400 text-sm font-mono">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-3" />
        <span>Synchronizing diagnostics details...</span>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <Link
            href="/radiology"
            className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-bold text-slate-100 tracking-tight">Clinical Radiology Report</h1>
              <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full uppercase ${
                order.status === "COMPLETED"
                  ? "bg-emerald-950/25 text-emerald-450 border border-emerald-900/30"
                  : order.status === "CANCELLED"
                  ? "bg-red-950/20 text-red-400 border border-red-900/30"
                  : "bg-slate-950/20 text-slate-400 border border-slate-900/30"
              }`}>
                {order.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Scan Ref: <strong className="text-slate-200 font-mono">#{order.id.substring(0, 8).toUpperCase()}</strong>
            </p>
          </div>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center space-x-2 shrink-0">
          {order.status === "COMPLETED" && (
            <button
              onClick={handlePrintReport}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-xs py-2 px-4 rounded-xl cursor-pointer shadow"
            >
              <Printer size={13} />
              <span>Print Findings</span>
            </button>
          )}

          {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
            <button
              onClick={() => setCancelModalOpen(true)}
              className="flex items-center space-x-1.5 bg-red-950/20 hover:bg-red-950/40 text-red-455 border border-red-900/30 font-semibold text-xs py-2 px-4 rounded-xl cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Cancel Scan</span>
            </button>
          )}
        </div>
      </div>

      {/* Cancellation Notice */}
      {order.cancelledAt && (
        <div className="bg-red-950/20 border border-red-900/40 p-4 rounded-2xl flex items-start space-x-3 text-red-400 text-xs animate-in fade-in duration-200">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-red-500" />
          <div>
            <h4 className="font-bold">Scan Order Cancelled</h4>
            <p className="mt-1">Date: <span className="font-mono text-slate-200">{new Date(order.cancelledAt).toLocaleString()}</span></p>
            <p className="italic text-zinc-400 mt-1">Reason: &ldquo;{order.cancellationReason}&rdquo;</p>
          </div>
        </div>
      )}

      {/* Grid Layout Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Patient Details */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-3.5 backdrop-blur-sm shadow">
          <h3 className="text-xs font-bold text-emerald-400 flex items-center space-x-2 uppercase border-b border-slate-800 pb-2">
            <User size={14} />
            <span>Patient Info</span>
          </h3>
          <div className="space-y-2.5 text-xs text-zinc-300">
            <div className="flex justify-between"><span className="text-zinc-550">Name:</span> <span className="font-semibold text-slate-200">{order.patient.name}</span></div>
            <div className="flex justify-between"><span className="text-zinc-550">UHID:</span> <span className="font-mono text-slate-200">{order.patient.uhid}</span></div>
            <div className="flex justify-between"><span className="text-zinc-550">Phone:</span> <span className="font-mono text-slate-200">{order.patient.phone}</span></div>
            <div className="flex justify-between">
              <span className="text-zinc-550">Age / Gender:</span>
              <span className="text-slate-200">
                {new Date().getFullYear() - new Date(order.patient.dob).getFullYear()} Y / {order.patient.gender}
              </span>
            </div>
          </div>
        </div>

        {/* Diagnosis Scan Info */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-3.5 backdrop-blur-sm shadow">
          <h3 className="text-xs font-bold text-emerald-400 flex items-center space-x-2 uppercase border-b border-slate-800 pb-2">
            <Activity size={14} />
            <span>Scan Profile</span>
          </h3>
          <div className="space-y-2.5 text-xs text-zinc-300">
            <div className="flex justify-between"><span className="text-zinc-550">Scan Name:</span> <span className="font-semibold text-slate-200">{order.scanCatalog.name}</span></div>
            <div className="flex justify-between"><span className="text-zinc-550">Code:</span> <span className="font-mono text-slate-200">{order.scanCatalog.code}</span></div>
            <div className="flex justify-between"><span className="text-zinc-550">Category:</span> <span className="text-slate-200">{order.scanCatalog.category}</span></div>
            <div className="flex justify-between"><span className="text-zinc-550">Ordering Doctor:</span> <span className="text-slate-200">{order.orderedByDoctor.employee.designation}</span></div>
          </div>
        </div>

        {/* Payment & Audit Tracking */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-3.5 backdrop-blur-sm shadow">
          <h3 className="text-xs font-bold text-emerald-400 flex items-center space-x-2 uppercase border-b border-slate-800 pb-2">
            <Clock size={14} />
            <span>Diagnostics Tracking</span>
          </h3>
          <div className="space-y-2.5 text-xs text-zinc-300">
            <div className="flex justify-between">
              <span className="text-zinc-550">Billing Status:</span>
              <span className={`font-semibold font-mono ${order.isPaid ? "text-emerald-400" : "text-amber-400"}`}>
                {order.isPaid ? "PAID (NO OUTSTANDING)" : "UNPAID (OUTSTANDING BALANCE)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-550">Scan Date:</span>
              <span className="text-slate-200">
                {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "Pending"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-550">Original Completion:</span>
              <span className="text-slate-200">
                {order.completedAt ? new Date(order.completedAt).toLocaleDateString() : "Pending"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* REPORT FINDINGS FORM */}
      {order.status !== "CANCELLED" && (
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm space-y-4">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            Scan Findings & report entry
          </h3>

          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400">Radiology Clinical Findings Report *</label>
              <textarea
                required
                rows={8}
                {...register("findings")}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl p-3 outline-none placeholder-slate-655 font-mono leading-relaxed"
                placeholder="Type detailed imaging scan findings, diagnostic observations..."
              />
              {errors.findings && (
                <p className="text-red-400 text-[10px]">{errors.findings.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400">Recording Radiologist / Technician *</label>
                  <select
                    required
                    {...register("technicianId")}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                  >
                    <option value="">Select Recording Staff</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employeeCode} - {emp.designation}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400">Verified By Clinical Authority *</label>
                  <select
                    required
                    {...register("verifiedById")}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                  >
                    <option value="">Select Verifying Authority (Different Employee)</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employeeCode} - {emp.designation}
                      </option>
                    ))}
                  </select>
                  {errors.verifiedById && (
                    <p className="text-red-400 text-[10px]">{errors.verifiedById.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400">Additional Remarks (Optional)</label>
                <textarea
                  {...register("remarks")}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl p-2.5 outline-none placeholder-slate-655"
                  placeholder="Enter diagnostic summary comments..."
                />
              </div>
            </div>

            {/* Actions triggers */}
            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={actionSaving || (!order.isPaid && order.status !== "COMPLETED")}
                className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium text-sm py-2.5 px-6 rounded-xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              >
                {actionSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Scan Report...</span>
                  </>
                ) : !order.isPaid && order.status !== "COMPLETED" ? (
                  <span>Submit Findings (Blocked: Unpaid)</span>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save & Finalize Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REVISION HISTORY LOGS */}
      {order.revisions && order.revisions.length > 0 && (
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm space-y-4">
          <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            Historical Findings Revisions
          </h3>

          <div className="space-y-3">
            {order.revisions.map((rev) => (
              <div key={rev.id} className="bg-slate-950/20 border border-slate-850 p-4 rounded-xl text-xs text-zinc-300 space-y-2">
                <div className="flex justify-between items-center border-b border-slate-850 pb-1.5">
                  <span className="font-bold text-purple-450">Revision #{rev.revisionNumber}</span>
                  <span className="text-[10px] text-zinc-550 font-mono">
                    Edited At: {new Date(rev.editedAt).toLocaleString()}
                  </span>
                </div>

                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-900/50 font-mono text-[11px] whitespace-pre-wrap leading-relaxed text-zinc-300">
                  {rev.findings}
                </div>

                {rev.remarks && (
                  <p className="text-[11px] italic text-zinc-500 mt-1">Remarks: &ldquo;{rev.remarks}&rdquo;</p>
                )}

                <div className="flex justify-between text-[9px] text-zinc-550 border-t border-slate-850/45 pt-1.5">
                  <span>Original Technician: {rev.completedBy}</span>
                  <span>Snapshot Completed: {new Date(rev.completedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CANCEL SCAN MODAL */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setCancelModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
            <div className="flex items-center space-x-2 text-red-400 mb-3 pb-2 border-b border-slate-800">
              <AlertTriangle size={20} />
              <h3 className="text-base font-bold text-slate-100">Cancel Radiology Scan</h3>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Cancelling this investigation is a clinical action. Financial balances will be handled separately inside the Billing dashboard.
            </p>

            <form onSubmit={handleCancelOrder} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400">Reason for Cancellation *</label>
                <textarea
                  required
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl p-2.5 outline-none placeholder-slate-655"
                  placeholder="Explain the clinical reasons for cancelling this scan..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="bg-slate-850 hover:bg-slate-800 text-zinc-300 px-4 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={actionSaving}
                  className="bg-red-650 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs flex items-center space-x-1 cursor-pointer font-semibold"
                >
                  {actionSaving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  <span>Cancel Scan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
