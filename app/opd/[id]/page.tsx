"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Printer,
  Heart,
  Stethoscope,
  Activity,
  AlertTriangle,
  Loader2,
  DollarSign,
  Info,
} from "lucide-react";
import Link from "next/link";
import { PrintData } from "@/print-engine/types";

type EncounterDetailsType = {
  id: string;
  opdId: string;
  patientId: string;
  doctorId: string;
  departmentId: string;
  consultationDate: string;
  depositAmount: number;
  originalFee: number;
  appliedFee: number;
  overrideReason: string | null;
  tokenNumber: number;
  symptoms: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  patient: {
    name: string;
    uhid: string;
    gender: string;
    dob: string;
    phone: string;
  };
  doctor: {
    roomNumber: string | null;
    employee: {
      name: string;
      designation: string;
    };
  };
  department: {
    name: string;
  };
  canceller: {
    designation: string;
  } | null;
  deposits: {
    id: string;
    amount: number;
    transactionDate: string;
  }[];
  labOrders: {
    id: string;
    status: string;
    testCatalog: {
      name: string;
      code: string;
      standardRate: number;
    };
  }[];
  radiologyOrders: {
    id: string;
    status: string;
    scanCatalog: {
      name: string;
      code: string;
      standardRate: number;
    };
  }[];
  charges: {
    id: string;
    rate: number;
    totalAmount: number;
    billingStatus: string;
    chargeCatalog: {
      name: string;
      category: string;
    };
  }[];
};

export default function OPDDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const opdId = params.id as string;

  const [encounter, setEncounter] = useState<EncounterDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  const loadEncounter = async () => {
    setLoading(true);
    try {
      const data = await apiClient<EncounterDetailsType>(`/api/opd/${opdId}`);
      setEncounter(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load encounter log details.";
      toast.error(msg);
      router.push("/opd");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEncounter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opdId]);

  const handlePrintSlip = async () => {
    setPrinting(true);
    try {
      // 1. Fetch structured print data from API
      const printData = await apiClient<PrintData>(`/api/opd/${opdId}/print`);

      // 2. Compile layout on server to prevent client-side 'fs' dependencies
      const printResult = await apiClient<{ renderedPayload: string }>("/api/print", {
        method: "POST",
        body: JSON.stringify({
          templateId: "OPD_SLIP",
          printData,
          options: { format: "A4" },
        }),
      });

      // 3. Open print layout view popup
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Popup blocker prevented printing. Please allow popups.");
        return;
      }
      printWindow.document.write(`
        <html>
          <head>
            <title>OPD Slip Print View</title>
            <style>
              body { background: #fff; margin: 0; padding: 20px; font-family: sans-serif; }
              @media print {
                body { padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body onload="window.print()">
            ${printResult.renderedPayload}
          </body>
        </html>
      `);
      printWindow.document.close();
      toast.success("Encounter slip print triggered.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Printing slip failed.";
      toast.error(msg);
    } finally {
      setPrinting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-400 text-sm font-mono">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-3" />
        <span>Loading Encounter Log Details...</span>
      </div>
    );
  }

  if (!encounter) return null;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <Link
            href="/opd"
            className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-bold text-slate-100 tracking-tight">OPD Encounter Details</h1>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono px-2 py-0.5 rounded-full">
                Token #{encounter.tokenNumber}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Encounter ID: <strong className="text-slate-200 font-mono">{encounter.opdId}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={handlePrintSlip}
          disabled={printing}
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-xs py-2.5 px-5 rounded-xl shadow-lg active:scale-[0.98] transition-all cursor-pointer"
        >
          {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer size={15} />}
          <span>Print OPD Slip</span>
        </button>
      </div>

      {/* Cancellation Alerts */}
      {encounter.cancelledAt && (
        <div className="bg-red-950/20 border border-red-900/40 p-4 rounded-2xl flex items-start space-x-3 text-red-400 text-xs animate-in fade-in duration-200">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-red-500" />
          <div className="space-y-1">
            <h4 className="font-bold">Outpatient encounter was cancelled</h4>
            <p>
              Cancelled At: <span className="font-mono text-slate-200">{new Date(encounter.cancelledAt).toLocaleString()}</span>
              {encounter.canceller && (
                <>
                  {" "}
                  by <span className="font-semibold text-slate-200">{encounter.canceller.designation}</span>
                </>
              )}
            </p>
            <p className="italic text-zinc-400 mt-1">Reason: &ldquo;{encounter.cancellationReason}&rdquo;</p>
          </div>
        </div>
      )}

      {/* Main Grid content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Column 1: Patient Demographic Card */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4 backdrop-blur-sm shadow-md">
          <h3 className="text-xs font-bold text-emerald-400 flex items-center space-x-2 uppercase border-b border-slate-800 pb-2">
            <Heart size={14} />
            <span>Patient Info</span>
          </h3>
          <div className="space-y-2.5 text-xs text-zinc-300">
            <div className="flex justify-between"><span className="text-zinc-500">Name:</span> <span className="font-semibold text-slate-200">{encounter.patient.name}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">UHID:</span> <span className="font-mono text-slate-200">{encounter.patient.uhid}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Gender:</span> <span className="uppercase text-slate-200">{encounter.patient.gender}</span></div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Age:</span>
              <span className="text-slate-200">
                {new Date().getFullYear() - new Date(encounter.patient.dob).getFullYear()} Years
              </span>
            </div>
            <div className="flex justify-between"><span className="text-zinc-500">Mobile Phone:</span> <span className="font-mono text-slate-200">{encounter.patient.phone}</span></div>
          </div>
        </div>

        {/* Column 2: Physician & Department */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4 backdrop-blur-sm shadow-md">
          <h3 className="text-xs font-bold text-emerald-400 flex items-center space-x-2 uppercase border-b border-slate-800 pb-2">
            <Stethoscope size={14} />
            <span>Consultant Details</span>
          </h3>
          <div className="space-y-2.5 text-xs text-zinc-300">
            <div className="flex justify-between"><span className="text-zinc-500">Physician:</span> <span className="font-semibold text-slate-200">{encounter.doctor.employee.name}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Department:</span> <span className="text-slate-200">{encounter.department.name}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Consultation Date:</span> <span className="text-slate-200">{new Date(encounter.consultationDate).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Room Number:</span> <span className="font-mono text-slate-200">{encounter.doctor.roomNumber || "--"}</span></div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Registration Time:</span>
              <span className="font-mono text-slate-200">
                {new Date(encounter.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        </div>

        {/* Column 3: Ledger Details (Override & Deposits) */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4 backdrop-blur-sm shadow-md">
          <h3 className="text-xs font-bold text-emerald-400 flex items-center space-x-2 uppercase border-b border-slate-800 pb-2">
            <DollarSign size={14} />
            <span>Billing & Financials</span>
          </h3>
          <div className="space-y-2.5 text-xs text-zinc-300">
            <div className="flex justify-between"><span className="text-zinc-500">Standard Fee:</span> <span className="font-mono text-slate-200">₹{encounter.originalFee.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Applied Fee:</span> <span className="font-mono text-slate-200">₹{encounter.appliedFee.toFixed(2)}</span></div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Deposit Paid:</span>
              <span className="font-mono text-slate-200">
                ₹{encounter.deposits.reduce((acc, curr) => acc + Number(curr.amount), 0).toFixed(2)}
              </span>
            </div>
            {encounter.overrideReason && (
              <div className="border-t border-slate-800/80 pt-2 text-[10px] space-y-1">
                <span className="text-amber-400 block font-semibold">Override Reason:</span>
                <p className="text-slate-350 italic">&ldquo;{encounter.overrideReason}&rdquo;</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Diagnostics Assignments logs */}
      {(encounter.labOrders.length > 0 || encounter.radiologyOrders.length > 0) && (
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4 backdrop-blur-sm shadow-md">
          <h3 className="text-xs font-bold text-emerald-400 flex items-center space-x-2 uppercase border-b border-slate-800 pb-2">
            <Activity size={14} />
            <span>Assigned Diagnostic Procedures</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Lab tests list */}
            {encounter.labOrders.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-200 border-b border-slate-850 pb-1 text-[10px] uppercase text-slate-400">Laboratory Orders</h4>
                <div className="divide-y divide-slate-850 bg-slate-950/20 rounded-xl border border-slate-850 overflow-hidden">
                  {encounter.labOrders.map((o) => (
                    <div key={o.id} className="p-2.5 flex justify-between items-center text-[11px]">
                      <div>
                        <span className="font-medium text-slate-300">{o.testCatalog.name}</span>
                        <span className="text-[9px] text-zinc-500 font-mono ml-2">({o.testCatalog.code})</span>
                      </div>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${
                        o.status === "CANCELLED" ? "bg-red-950/25 text-red-400" : "bg-emerald-950/25 text-emerald-400"
                      }`}>{o.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Radiology tests list */}
            {encounter.radiologyOrders.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-200 border-b border-slate-850 pb-1 text-[10px] uppercase text-slate-400">Radiology Scans</h4>
                <div className="divide-y divide-slate-850 bg-slate-950/20 rounded-xl border border-slate-850 overflow-hidden">
                  {encounter.radiologyOrders.map((o) => (
                    <div key={o.id} className="p-2.5 flex justify-between items-center text-[11px]">
                      <div>
                        <span className="font-medium text-slate-300">{o.scanCatalog.name}</span>
                        <span className="text-[9px] text-zinc-500 font-mono ml-2">({o.scanCatalog.code})</span>
                      </div>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${
                        o.status === "CANCELLED" ? "bg-red-950/25 text-red-400" : "bg-emerald-950/25 text-emerald-400"
                      }`}>{o.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Billable Charges generated log details */}
      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-3 backdrop-blur-sm shadow-md">
        <h3 className="text-xs font-bold text-slate-350 flex items-center space-x-2 border-b border-slate-800 pb-2 uppercase">
          <Info size={13} />
          <span>Associated Billable Ledger Entries</span>
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {encounter.charges.map((c) => (
            <div key={c.id} className="bg-slate-950/20 border border-slate-850 p-2.5 rounded-lg flex items-center justify-between text-xs text-zinc-300">
              <div>
                <span className="font-medium text-slate-200">{c.chargeCatalog.name}</span>
                <span className="text-[9px] text-zinc-500 font-mono ml-2">({c.chargeCatalog.category})</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="font-mono text-slate-100">₹{Number(c.totalAmount).toFixed(2)}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-mono ${
                  c.billingStatus === "CANCELLED"
                    ? "bg-red-950/20 text-red-400 border border-red-900/20"
                    : c.billingStatus === "PENDING"
                    ? "bg-amber-950/20 text-amber-400 border border-amber-900/20"
                    : "bg-emerald-950/20 text-emerald-400 border border-emerald-900/20"
                }`}>
                  {c.billingStatus}
                </span>
              </div>
            </div>
          ))}
          {encounter.charges.length === 0 && (
            <p className="text-[10px] text-zinc-550 font-mono">No ledger entries created.</p>
          )}
        </div>
      </div>
    </div>
  );
}
