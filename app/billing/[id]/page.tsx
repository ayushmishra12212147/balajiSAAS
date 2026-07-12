"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Printer,
  Heart,
  DollarSign,
  Activity,
  AlertTriangle,
  Loader2,
  Trash2,
  Undo2,
  CheckCircle,
  Plus,
  X,
  CreditCard,
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";
import { PrintData } from "@/print-engine/types";

type PaymentItem = {
  id: string;
  amountPaid: number;
  paymentMode: string;
  transactionReference: string | null;
  transactionGroupId: string | null;
  receivedAt: string;
  recipient: {
    employeeCode: string;
    designation: string;
  };
};

type RefundItem = {
  id: string;
  amountRefunded: number;
  refundReason: string;
  refundedAt: string;
  manager: {
    employeeCode: string;
    designation: string;
  };
};

type InvoiceDetailsType = {
  id: string;
  invoiceNumber: string;
  patientId: string;
  totalAmount: number;
  discountAmount: number;
  discountPercentage: number | null;
  discountReason: string | null;
  discountApprovedBy: string | null;
  payableAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  version: number;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  patient: {
    id: string;
    name: string;
    uhid: string;
    gender: string;
    dob: string;
    phone: string;
  };
  canceller: {
    designation: string;
  } | null;
  payments: PaymentItem[];
  refunds: RefundItem[];
  depositAllocations: {
    id: string;
    amountAllocated: number;
    transactionDate: string;
    deposit: {
      amount: number;
    };
  }[];
  charges: {
    id: string;
    billableCharge: {
      id: string;
      quantity: number;
      rate: number;
      totalAmount: number;
      sourceModule: string;
      createdAt: string;
      chargeCatalog: {
        name: string;
        code: string;
        category: string;
      };
    };
  }[];
};

type ModeBreakdown = {
  mode: "CASH" | "UPI" | "CARD" | "CHEQUE" | "BANK_TRANSFER";
  amount: number;
  reference: string;
};

export default function InvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceDetailsType | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals visibility states
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);

  // Payment checkout states
  const [submitAmount, setSubmitAmount] = useState(0);
  const [modesBreakdown, setModesBreakdown] = useState<ModeBreakdown[]>([
    { mode: "CASH", amount: 0, reference: "" },
  ]);
  const [checkoutDiscount, setCheckoutDiscount] = useState<number>(0);
  const [checkoutDiscountReason, setCheckoutDiscountReason] = useState<string>("");

  const handleDiscountChange = (discountVal: number) => {
    setCheckoutDiscount(discountVal);
    const balance = invoice ? Number(invoice.balanceAmount) : 0;
    const remaining = Math.max(0, balance - discountVal);
    setSubmitAmount(remaining);
    setModesBreakdown([{ mode: "CASH", amount: remaining, reference: "" }]);
  };

  // Refund states
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState("");

  // Cancellation states
  const [cancelReason, setCancelReason] = useState("");

  const loadInvoice = async () => {
    setLoading(true);
    try {
      const data = await apiClient<InvoiceDetailsType>(`/api/billing/invoices/${invoiceId}`);
      setInvoice(data);
      setSubmitAmount(Number(data.balanceAmount));
      setModesBreakdown([{ mode: "CASH", amount: Number(data.balanceAmount), reference: "" }]);
      setCheckoutDiscount(0);
      setCheckoutDiscountReason("");
      setRefundAmount(0);
      setRefundReason("");
      setCancelReason("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load invoice statements.";
      toast.error(msg);
      router.push("/billing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  // Multi-mode Payment actions
  const handleAddMode = () => {
    setModesBreakdown((prev) => [...prev, { mode: "UPI", amount: 0, reference: "" }]);
  };

  const handleRemoveMode = (idx: number) => {
    setModesBreakdown((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleModeChange = (idx: number, field: keyof ModeBreakdown, val: string | number) => {
    setModesBreakdown((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sumBreakdown = modesBreakdown.reduce((acc, curr) => acc + Number(curr.amount), 0);
    
    if (Math.abs(sumBreakdown - submitAmount) > 0.01) {
      toast.error(`The sum of payment modes (₹${sumBreakdown.toFixed(2)}) must equal the total submitted amount (₹${submitAmount.toFixed(2)}).`);
      return;
    }

    if (checkoutDiscount > 0 && !checkoutDiscountReason.trim()) {
      toast.error("Please enter a discount reason when applying a discount.");
      return;
    }

    setActionSaving(true);
    try {
      await apiClient(`/api/billing/invoices/${invoiceId}/pay`, {
        method: "POST",
        body: JSON.stringify({
          invoiceId,
          version: invoice!.version,
          totalAmount: submitAmount,
          discountAmount: Number(checkoutDiscount),
          discountReason: checkoutDiscountReason || null,
          payments: modesBreakdown.map((pm) => ({
            amount: Number(pm.amount),
            mode: pm.mode,
            reference: pm.reference || null,
          })),
        }),
      });

      toast.success("Payment received successfully!");
      setPayModalOpen(false);
      loadInvoice();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register payment.";
      toast.error(msg);
    } finally {
      setActionSaving(false);
    }
  };

  // Refund actions
  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (refundReason.trim().length < 5) {
      toast.error("Refund reason description must be at least 5 characters.");
      return;
    }
    
    setActionSaving(true);
    try {
      await apiClient(`/api/billing/invoices/${invoiceId}/refund`, {
        method: "POST",
        body: JSON.stringify({
          invoiceId,
          amount: Number(refundAmount),
          reason: refundReason,
        }),
      });

      toast.success("Refund processed successfully.");
      setRefundModalOpen(false);
      loadInvoice();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process refund.";
      toast.error(msg);
    } finally {
      setActionSaving(false);
    }
  };

  // Cancellation actions
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cancelReason.trim().length < 5) {
      toast.error("Cancellation reason description must be at least 5 characters.");
      return;
    }

    setActionSaving(true);
    try {
      await apiClient(`/api/billing/invoices/${invoiceId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: cancelReason }),
      });

      toast.success("Invoice cancelled. Pending charges restored.");
      setCancelModalOpen(false);
      loadInvoice();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel invoice.";
      toast.error(msg);
    } finally {
      setActionSaving(false);
    }
  };

  // Printing helpers
  const handlePrint = async (type: "invoice" | "receipt" | "nodue") => {
    try {
      if (type === "nodue") {
        // Enforce Patient-Wide No Due verification check
        toast.info("Verifying patient-wide outstanding account balances...");
        const eligibility = await apiClient<{ isNoDueEligible: boolean }>(
          `/api/billing/patients/${invoice!.patientId}/pending-charges`
        );
        if (!eligibility.isNoDueEligible) {
          toast.error("Cannot issue No Due certificate. Patient has pending charges or unpaid invoices.");
          return;
        }
      }

      // Fetch print data
      const printData = await apiClient<PrintData>(`/api/billing/invoices/${invoiceId}/print?type=${type}`);

      // Compile payload on server using centralized print endpoint
      const printResult = await apiClient<{ renderedPayload: string }>("/api/print", {
        method: "POST",
        body: JSON.stringify({
          templateId: type === "nodue" ? "NO_DUE_CERTIFICATE" : type === "receipt" ? "PAYMENT_RECEIPT" : "HOSPITAL_INVOICE",
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
            <title>${type.toUpperCase()} Print View</title>
            <style>
              body { background: #fff; margin: 0; padding: 20px; font-family: sans-serif; }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body onload="window.print()">
            ${printResult.renderedPayload}
          </body>
        </html>
      `);
      printWindow.document.close();
      toast.success(`${type.toUpperCase()} print slip triggered.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to compile print slip.";
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-400 text-sm font-mono">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-3" />
        <span>Loading Billing Details...</span>
      </div>
    );
  }

  if (!invoice) return null;

  // Ledger Calculations
  const totalPaidSum = invoice.payments.reduce((acc, curr) => acc + Number(curr.amountPaid), 0);
  const totalRefundedSum = invoice.refunds.reduce((acc, curr) => acc + Number(curr.amountRefunded), 0);
  const totalDepositApplied = invoice.depositAllocations.reduce((acc, curr) => acc + Number(curr.amountAllocated), 0);

  const effectiveNetPaid = totalPaidSum - totalRefundedSum;
  const isCancellable = totalPaidSum === 0 && totalRefundedSum === 0 && invoice.paymentStatus !== "CANCELLED";

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <Link
            href="/billing"
            className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-bold text-slate-100 tracking-tight">Invoice Details Summary</h1>
              <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full uppercase ${
                invoice.paymentStatus === "PAID"
                  ? "bg-emerald-950/25 text-emerald-400 border border-emerald-900/30"
                  : invoice.paymentStatus === "PARTIALLY_PAID"
                  ? "bg-amber-950/20 text-amber-400 border border-amber-900/30"
                  : invoice.paymentStatus === "CANCELLED"
                  ? "bg-red-950/20 text-red-400 border border-red-900/30"
                  : "bg-slate-950/20 text-slate-450 border border-slate-900/30"
              }`}>
                {invoice.paymentStatus}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Statement Ref: <strong className="text-slate-200 font-mono">{invoice.invoiceNumber}</strong>
            </p>
          </div>
        </div>

        {/* Action Triggers */}
        <div className="flex flex-wrap items-center gap-2">
          {invoice.paymentStatus !== "CANCELLED" && Number(invoice.balanceAmount) > 0 && (
            <button
              onClick={() => setPayModalOpen(true)}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-xs py-2 px-4 rounded-xl cursor-pointer"
            >
              <DollarSign size={13} />
              <span>Collect Payment</span>
            </button>
          )}

          {totalPaidSum > 0 && totalRefundedSum < totalPaidSum && (
            <button
              onClick={() => setRefundModalOpen(true)}
              className="flex items-center space-x-1.5 bg-purple-900/60 hover:bg-purple-800/80 text-purple-200 border border-purple-800/40 font-semibold text-xs py-2 px-4 rounded-xl cursor-pointer"
            >
              <Undo2 size={13} />
              <span>Process Refund</span>
            </button>
          )}

          {isCancellable && (
            <button
              onClick={() => setCancelModalOpen(true)}
              className="flex items-center space-x-1.5 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/30 font-semibold text-xs py-2 px-4 rounded-xl cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Cancel Invoice</span>
            </button>
          )}

          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-1 py-1">
            <button
              onClick={() => handlePrint("invoice")}
              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-[10px] font-semibold flex items-center space-x-1 cursor-pointer"
              title="Print Summary Statement"
            >
              <Printer size={12} />
              <span>Summary</span>
            </button>
            <button
              onClick={() => handlePrint("receipt")}
              disabled={totalPaidSum === 0}
              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-[10px] font-semibold flex items-center space-x-1 cursor-pointer disabled:opacity-40"
              title="Print Receipt"
            >
              <FileSpreadsheet size={12} />
              <span>Receipt</span>
            </button>
            <button
              onClick={() => handlePrint("nodue")}
              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-[10px] font-semibold flex items-center space-x-1 cursor-pointer"
              title="Print No Due Certificate"
            >
              <CheckCircle size={12} />
              <span>No Due</span>
            </button>
          </div>
        </div>
      </div>

      {/* Invoice cancellation reason notification */}
      {invoice.cancelledAt && (
        <div className="bg-red-950/20 border border-red-900/40 p-4 rounded-2xl flex items-start space-x-3 text-red-400 text-xs animate-in fade-in duration-200">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-red-500" />
          <div className="space-y-1">
            <h4 className="font-bold">Invoice Cancelled</h4>
            <p>
              Date: <span className="font-mono text-slate-200">{new Date(invoice.cancelledAt).toLocaleString()}</span>
              {invoice.canceller && (
                <> by <span className="font-semibold text-slate-200">{invoice.canceller.designation}</span></>
              )}
            </p>
            <p className="italic text-zinc-400 mt-1">Reason: &ldquo;{invoice.cancellationReason}&rdquo;</p>
          </div>
        </div>
      )}

      {/* Demographic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Patient Details */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4 backdrop-blur-sm shadow-md">
          <h3 className="text-xs font-bold text-emerald-400 flex items-center space-x-2 uppercase border-b border-slate-800 pb-2">
            <Heart size={14} />
            <span>Patient demographic</span>
          </h3>
          <div className="space-y-2.5 text-xs text-zinc-300">
            <div className="flex justify-between"><span className="text-zinc-550">Name:</span> <span className="font-semibold text-slate-200">{invoice.patient.name}</span></div>
            <div className="flex justify-between"><span className="text-zinc-550">UHID:</span> <span className="font-mono text-slate-200">{invoice.patient.uhid}</span></div>
            <div className="flex justify-between"><span className="text-zinc-550">Phone:</span> <span className="font-mono text-slate-200">{invoice.patient.phone}</span></div>
            <div className="flex justify-between">
              <span className="text-zinc-550">Age / Gender:</span>
              <span className="text-slate-200">
                {new Date().getFullYear() - new Date(invoice.patient.dob).getFullYear()} Y / {invoice.patient.gender}
              </span>
            </div>
          </div>
        </div>

        {/* Invoice details */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4 backdrop-blur-sm shadow-md">
          <h3 className="text-xs font-bold text-emerald-400 flex items-center space-x-2 uppercase border-b border-slate-800 pb-2">
            <DollarSign size={14} />
            <span>Invoice ledger balance</span>
          </h3>
          <div className="space-y-2.5 text-xs text-zinc-300">
            <div className="flex justify-between"><span className="text-zinc-550">Gross Charges Total:</span> <span className="font-mono text-slate-200">₹{Number(invoice.totalAmount).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-550">Discount Applied:</span> <span className="font-mono text-red-400">₹{Number(invoice.discountAmount).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-550">Deposits Adjusted:</span> <span className="font-mono text-emerald-450">₹{totalDepositApplied.toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-slate-850 pt-2"><span className="text-zinc-400 font-semibold">Net Payable:</span> <span className="font-mono font-bold text-slate-200">₹{Number(invoice.payableAmount).toFixed(2)}</span></div>
          </div>
        </div>

        {/* Ledger adjustments totals */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4 backdrop-blur-sm shadow-md">
          <h3 className="text-xs font-bold text-emerald-400 flex items-center space-x-2 uppercase border-b border-slate-800 pb-2">
            <span>Outstanding Statement Balance</span>
          </h3>
          <div className="space-y-2.5 text-xs text-zinc-300">
            <div className="flex justify-between"><span className="text-zinc-550">Payments Received:</span> <span className="font-mono text-emerald-400">₹{totalPaidSum.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-550">Refunds Processed:</span> <span className="font-mono text-purple-400">₹{totalRefundedSum.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-550">Net Dynamic Paid:</span> <span className="font-mono text-slate-200">₹{effectiveNetPaid.toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-slate-850 pt-2 bg-emerald-950/10 p-1.5 rounded-lg"><span className="text-emerald-400 font-bold">Balance Due:</span> <span className="font-mono font-bold text-emerald-300">₹{Number(invoice.balanceAmount).toFixed(2)}</span></div>
          </div>
        </div>
      </div>

      {/* Itemized charges table list */}
      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-3 backdrop-blur-sm shadow-md">
        <h3 className="text-xs font-bold text-slate-350 flex items-center space-x-2 border-b border-slate-800 pb-2 uppercase">
          <Activity size={13} />
          <span>Itemized Charges</span>
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {invoice.charges.map((c) => {
            const charge = c.billableCharge;
            return (
              <div key={c.id} className="bg-slate-950/20 border border-slate-850 p-3 rounded-lg flex items-center justify-between text-xs text-zinc-300">
                <div>
                  <span className="font-semibold text-slate-200">{charge.chargeCatalog.name}</span>
                  <span className="text-[9px] text-zinc-550 font-mono ml-2">
                    ({charge.sourceModule} | Date: {new Date(charge.createdAt).toLocaleDateString()})
                  </span>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold text-slate-250">₹{Number(charge.totalAmount).toFixed(2)}</span>
                  <div className="text-[9px] text-zinc-550 font-mono">₹{Number(charge.rate).toFixed(0)} x {charge.quantity}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mapped deposit allocations ledgers if applied */}
      {invoice.depositAllocations.length > 0 && (
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-3 backdrop-blur-sm shadow-md">
          <h3 className="text-xs font-bold text-emerald-455 flex items-center space-x-2 border-b border-slate-800 pb-2 uppercase">
            <span>Deposit Ledger Adjustments</span>
          </h3>
          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {invoice.depositAllocations.map((alloc) => (
              <div key={alloc.id} className="bg-slate-950/10 border border-slate-850/60 p-2.5 rounded-lg flex items-center justify-between text-xs text-zinc-300">
                <div>
                  <span className="font-medium text-slate-350">Adjusted from Patient Deposit Ledger</span>
                  <span className="text-[9px] text-zinc-550 font-mono ml-2">
                    (Date: {new Date(alloc.transactionDate).toLocaleDateString()})
                  </span>
                </div>
                <span className="font-mono text-emerald-400">- ₹{Number(alloc.amountAllocated).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payments History log (Immutable table) */}
      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-3 backdrop-blur-sm shadow-md">
        <h3 className="text-xs font-bold text-emerald-400 flex items-center space-x-2 border-b border-slate-800 pb-2 uppercase">
          <CreditCard size={13} />
          <span>Immutable Payments History</span>
        </h3>
        
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {invoice.payments.map((p) => (
            <div key={p.id} className="bg-slate-950/30 border border-slate-850 p-3 rounded-lg flex justify-between items-center text-xs">
              <div>
                <span className="font-bold text-slate-200">{p.paymentMode}</span>
                <span className="text-[10px] text-zinc-550 font-mono ml-2">
                  (Ref: {p.transactionReference || "None"} | Group: {p.transactionGroupId || "--"})
                </span>
                <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                  Cashier: {p.recipient.designation} | Received At: {new Date(p.receivedAt).toLocaleString()}
                </div>
              </div>
              <span className="font-bold font-mono text-emerald-400">₹{Number(p.amountPaid).toFixed(2)}</span>
            </div>
          ))}
          {invoice.payments.length === 0 && (
            <p className="text-center p-4 text-zinc-600 font-mono text-[11px]">No checkout transactions recorded.</p>
          )}
        </div>
      </div>

      {/* Refunds History log */}
      {invoice.refunds.length > 0 && (
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-3 backdrop-blur-sm shadow-md">
          <h3 className="text-xs font-bold text-purple-400 flex items-center space-x-2 border-b border-slate-800 pb-2 uppercase">
            <span>Ledger Refunds logs</span>
          </h3>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {invoice.refunds.map((r) => (
              <div key={r.id} className="bg-slate-950/20 border border-purple-950/20 p-3 rounded-lg flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-purple-400">Refund</span>
                  <p className="text-[10px] text-zinc-550 mt-1 italic">&ldquo;{r.refundReason}&rdquo;</p>
                  <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                    Authorized: {r.manager.designation} | Date: {new Date(r.refundedAt).toLocaleString()}
                  </div>
                </div>
                <span className="font-bold font-mono text-purple-400">₹{Number(r.amountRefunded).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECEIVE PAYMENT MODAL */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setPayModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              <X size={18} />
            </button>
            <div className="flex items-center space-x-2 text-emerald-400 mb-3 pb-2 border-b border-slate-800">
              <DollarSign size={20} />
              <h3 className="text-base font-bold text-slate-100">Collect Outstanding Payment</h3>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400">Discount (in ₹ / Money)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={invoice ? Number(invoice.balanceAmount) : 0}
                    value={checkoutDiscount || ""}
                    onChange={(e) => handleDiscountChange(Number(e.target.value))}
                    placeholder="Enter discount amount"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400">Total Paid Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={submitAmount}
                    onChange={(e) => setSubmitAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                  />
                </div>
              </div>

              {checkoutDiscount > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400">Discount Reason *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSR Waiver, Staff Discount, Round off"
                    value={checkoutDiscountReason}
                    onChange={(e) => setCheckoutDiscountReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                  <span className="text-[10px] font-semibold text-slate-400">Payment Modes Breakdown</span>
                  <button
                    type="button"
                    onClick={handleAddMode}
                    className="text-[10px] text-emerald-400 hover:underline flex items-center"
                  >
                    <Plus size={12} className="mr-0.5" /> Add Payment Mode
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {modesBreakdown.map((pm, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        value={pm.mode}
                        onChange={(e) => handleModeChange(idx, "mode", e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg px-2 py-1 outline-none"
                      >
                        <option value="CASH">CASH</option>
                        <option value="UPI">UPI</option>
                        <option value="CARD">CARD</option>
                        <option value="CHEQUE">CHEQUE</option>
                        <option value="BANK_TRANSFER">BANK TRANSFER</option>
                      </select>

                      <input
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        value={pm.amount || ""}
                        onChange={(e) => handleModeChange(idx, "amount", Number(e.target.value))}
                        className="bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg px-2 py-1 outline-none font-mono flex-1"
                      />

                      <input
                        type="text"
                        placeholder="Ref (Opt)"
                        value={pm.reference}
                        onChange={(e) => handleModeChange(idx, "reference", e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg px-2 py-1 outline-none w-24"
                      />

                      {modesBreakdown.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMode(idx)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="bg-slate-850 hover:bg-slate-800 text-zinc-300 px-4 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionSaving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs flex items-center space-x-1 cursor-pointer font-semibold"
                >
                  {actionSaving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  <span>Receive Payments</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROCESS REFUND MODAL */}
      {refundModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setRefundModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              <X size={18} />
            </button>
            <div className="flex items-center space-x-2 text-purple-400 mb-3 pb-2 border-b border-slate-800">
              <Undo2 size={20} />
              <h3 className="text-base font-bold text-slate-100">Process Invoice Refund</h3>
            </div>

            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400">
                  Refund Amount (Max: ₹{effectiveNetPaid.toFixed(2)}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={refundAmount || ""}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400">Reason for Refund *</label>
                <textarea
                  required
                  rows={2}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl p-2.5 outline-none placeholder-slate-655"
                  placeholder="Explain why this refund is issued..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRefundModalOpen(false)}
                  className="bg-slate-850 hover:bg-slate-800 text-zinc-300 px-4 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionSaving}
                  className="bg-purple-700 hover:bg-purple-650 text-white px-4 py-2 rounded-xl text-xs flex items-center space-x-1 cursor-pointer font-semibold"
                >
                  {actionSaving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  <span>Authorize Refund</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL INVOICE MODAL */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setCancelModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              <X size={18} />
            </button>
            <div className="flex items-center space-x-2 text-red-400 mb-3 pb-2 border-b border-slate-800">
              <AlertTriangle size={20} />
              <h3 className="text-base font-bold text-slate-100">Cancel Generated Invoice</h3>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Cancelling this invoice will release all mapped billable charges back to PENDING. This action is allowed only because no payment details have been recorded.
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400">Reason for Cancellation *</label>
                <textarea
                  required
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl p-2.5 outline-none placeholder-slate-655"
                  placeholder="Explain why this invoice is cancelled..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="bg-slate-850 hover:bg-slate-800 text-zinc-300 px-4 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionSaving}
                  className="bg-red-650 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs flex items-center space-x-1 cursor-pointer font-semibold"
                >
                  {actionSaving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  <span>Confirm Cancellation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
