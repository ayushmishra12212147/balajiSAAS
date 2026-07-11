"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PharmacySalesSchema, PharmacySalesFormInput } from "@/modules/pharmacy/schemas";

import {
  Search,

  Loader2,
  Trash2,
  Save,
  Printer,
  DollarSign,
  User,
  ShoppingBag,

  AlertTriangle,
} from "lucide-react";

type MedicineOption = {
  id: string;
  name: string;
  code: string;
  sellingPrice: string;
  gstPercentage: string;
};

type BatchOption = {
  id: string;
  batchNumber: string;
  expiryDate: string | null;
  currentQuantity: number;
  sellingRate: string;
  gstPercentage: string;
};

type SalesHistoryInvoice = {
  id: string;
  pharmacyInvoiceNumber: string;
  customerName: string;
  customerPhone: string | null;
  payableAmount: string;
  createdAt: string;
  status: string;
};

export default function SalesBillingPage() {
  const [activeTab, setActiveTab] = useState<"BILLING" | "INVOICES">("BILLING");

  // Invoices search list
  const [invoices, setInvoices] = useState<SalesHistoryInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [searchInvoiceNo, setSearchInvoiceNo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Medicine autocomplete search
  const [medSearchText, setMedSearchText] = useState("");
  const [medMatches, setMedMatches] = useState<MedicineOption[]>([]);
  const [searchingMed, setSearchingMed] = useState(false);

  // Selected lines batches mapping
  const [medicineBatches, setMedicineBatches] = useState<Record<string, BatchOption[]>>({});
  const [loadingBatches, setLoadingBatches] = useState<Record<string, boolean>>({});

  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PharmacySalesFormInput>({
    resolver: zodResolver(PharmacySalesSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      items: [],
      paymentModes: [{ paymentMode: "CASH", amount: 0 }],
    },
  });

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control,
    name: "items",
  });

  const { fields: payFields, append: appendPay, remove: removePay } = useFieldArray({
    control,
    name: "paymentModes",
  });

  const itemsWatched = watch("items");
  const paymentsWatched = watch("paymentModes");

  // 1. Calculate totals dynamically
  let subtotal = 0;
  let taxTotal = 0;
  let netPayable = 0;

  itemsWatched.forEach((item) => {
    // Lookup selected batch price & tax details
    const batchList = medicineBatches[item.medicineId] || [];
    const selectedBatch = batchList.find((b) => b.batchNumber === item.batchNumber);
    if (selectedBatch) {
      const rate = Number(selectedBatch.sellingRate);
      const qty = item.quantity || 0;
      const lineSub = rate * qty;
      const discAmt = 0; // We keep discountPercentage at 0 default
      const lineTax = ((lineSub - discAmt) * Number(selectedBatch.gstPercentage)) / 100;
      subtotal += lineSub;
      taxTotal += lineTax;
    }
  });
  netPayable = subtotal + taxTotal;

  const totalPaymentsCollected = paymentsWatched.reduce((sum, p) => sum + (p.amount || 0), 0);

  const fetchInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const query = new URLSearchParams({
        invoiceNumber: searchInvoiceNo,
        page: page.toString(),
        limit: "10",
      });
      const res = await apiClient<{
        invoices: SalesHistoryInvoice[];
        pagination: { pages: number };
      }>(`/api/pharmacy/sales?${query.toString()}`);
      setInvoices(res.invoices);
      setTotalPages(res.pagination.pages || 1);
    } catch {
      toast.error("Failed to load invoice history.");
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    if (activeTab === "INVOICES") {
      fetchInvoices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page]);

  const triggerMedicineSearch = async (val: string) => {
    setMedSearchText(val);
    if (val.trim().length < 2) {
      setMedMatches([]);
      return;
    }
    setSearchingMed(true);
    try {
      const res = await apiClient<{ medicines: MedicineOption[] }>(
        `/api/pharmacy/medicines?name=${encodeURIComponent(val)}&isActive=true&limit=5`
      );
      setMedMatches(res.medicines || []);
    } catch {
      // silent fail
    } finally {
      setSearchingMed(false);
    }
  };

  // Resolve batches (FEFO suggestion) for a medicine
  const loadMedicineBatches = async (medId: string, index: number) => {
    setLoadingBatches((prev) => ({ ...prev, [medId]: true }));
    try {
      const batches = await apiClient<BatchOption[]>(`/api/pharmacy/inventory/batches?medicineId=${medId}`);
      setMedicineBatches((prev) => ({ ...prev, [medId]: batches }));

      // Suggest the first batch (earliest expiry date - FEFO suggest)
      const firstAvailable = batches.find((b) => b.currentQuantity > 0);
      if (firstAvailable) {
        setValue(`items.${index}.batchNumber`, firstAvailable.batchNumber);
      }
    } catch {
      toast.error("Failed to load medicine batch stock levels.");
    } finally {
      setLoadingBatches((prev) => ({ ...prev, [medId]: false }));
    }
  };

  const handleSelectItem = (med: MedicineOption) => {
    const newIndex = itemFields.length;
    appendItem({
      medicineId: med.id,
      batchNumber: "",
      quantity: 1,
      discountPercentage: 0,
    });
    setMedMatches([]);
    setMedSearchText("");

    loadMedicineBatches(med.id, newIndex);
  };

  const onSalesSubmit = async (data: PharmacySalesFormInput) => {
    // Split payments total validation before POSTing
    if (Math.abs(totalPaymentsCollected - netPayable) > 0.01) {
      toast.error(
        `Split payments mismatch: Sum of payments (₹${totalPaymentsCollected.toFixed(
          2
        )}) must equal Payable Total (₹${netPayable.toFixed(2)}).`
      );
      return;
    }

    setSaving(true);
    try {
      const invoice = await apiClient<{ id: string; pharmacyInvoiceNumber: string }>("/api/pharmacy/sales", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success(`Sales invoice ${invoice.pharmacyInvoiceNumber} recorded!`);
      // Trigger print job
      handlePrint(invoice.id);

      reset({
        customerName: "",
        customerPhone: "",
        items: [],
        paymentModes: [{ paymentMode: "CASH", amount: 0 }],
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sales billing failed.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async (invoiceId: string) => {
    try {
      const printData = await apiClient<Record<string, unknown>>(`/api/pharmacy/sales/${invoiceId}/print`);
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
        toast.error("Allow popups to trigger print receipts.");
        return;
      }
      printWindow.document.write(`
        <html>
          <head><title>Pharmacy Invoice Print</title></head>
          <body onload="window.print()">${printResult.renderedPayload}</body>
        </html>
      `);
      printWindow.document.close();
      toast.success("Print receipt compiled.");
    } catch {
      toast.error("Printing receipt failed.");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Sales Cashier Terminal</h1>
          <p className="text-xs text-slate-500 mt-1">
            Dispense medicine, suggest batches sorted by FEFO rules, split payments, and trigger receipts.
          </p>
        </div>

        <div className="flex space-x-1.5 shrink-0 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab("BILLING")}
            className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "BILLING"
                ? "bg-white text-slate-800 shadow"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Billing Screen
          </button>
          <button
            onClick={() => setActiveTab("INVOICES")}
            className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "INVOICES"
                ? "bg-white text-slate-800 shadow"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Sales Invoices List
          </button>
        </div>
      </div>

      {/* Main Switch panel */}
      {activeTab === "BILLING" ? (
        <form onSubmit={handleSubmit(onSalesSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start text-xs">
          {/* Left panel: Cart items search & patient info */}
          <div className="lg:col-span-2 space-y-6 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            {/* Customer Demographics card */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-blue-600 uppercase flex items-center space-x-2 border-b border-slate-100 pb-2">
                <User size={14} />
                <span>1. Customer Demographics</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase">Customer Name *</label>
                  <input
                    type="text"
                    required
                    {...register("customerName")}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="e.g. Ayush Sharma"
                  />
                  {errors.customerName && <p className="text-red-500 text-[9px]">{errors.customerName.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase">Customer Phone (Optional)</label>
                  <input
                    type="text"
                    {...register("customerPhone")}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-mono"
                    placeholder="Phone"
                  />
                </div>
              </div>
            </div>

            {/* Shopping cart items list */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-blue-600 uppercase flex items-center space-x-2">
                <ShoppingBag size={14} />
                <span>2. Cart Items</span>
              </h3>

              {/* Autocomplete medicine search input */}
              <div className="relative max-w-md">
                <div className="flex items-center bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3 py-2">
                  <Search size={15} className="text-slate-400 mr-2" />
                  <input
                    type="text"
                    value={medSearchText}
                    onChange={(e) => triggerMedicineSearch(e.target.value)}
                    className="bg-transparent text-slate-800 text-xs w-full outline-none placeholder-slate-400"
                    placeholder="Search medicine by name or generic formula..."
                  />
                  {searchingMed && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                </div>

                {medMatches.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {medMatches.map((med) => (
                      <button
                        key={med.id}
                        type="button"
                        onClick={() => handleSelectItem(med)}
                        className="w-full text-left p-2.5 hover:bg-slate-50 transition-colors flex justify-between items-center text-xs"
                      >
                        <div>
                          <span className="font-semibold text-slate-800">{med.name}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Code: {med.code}</span>
                        </div>
                        <span className="bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded text-[9px] uppercase">
                          Add
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Items checkout lines */}
              {itemFields.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden mt-3">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                        <th className="py-2.5 px-3">Medicine</th>
                        <th className="py-2.5 px-3 w-40">Select Batch (FEFO suggested) *</th>
                        <th className="py-2.5 px-3 w-20 text-center">Qty *</th>
                        <th className="py-2.5 px-3 w-24 text-right">Selling Rate (₹)</th>
                        <th className="py-2.5 px-3 w-20 text-right">Tax GST %</th>
                        <th className="py-2.5 px-3 text-right">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itemFields.map((field, index) => {
                        const medId = field.medicineId;
                        const batchList = medicineBatches[medId] || [];
                        const selectedBatchVal = watch(`items.${index}.batchNumber`);
                        const matchedBatch = batchList.find((b) => b.batchNumber === selectedBatchVal);

                        return (
                          <tr key={field.id} className="hover:bg-slate-50/20">
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              Item #{index + 1}
                              <input
                                type="hidden"
                                {...register(`items.${index}.medicineId` as const)}
                              />
                            </td>

                            <td className="py-2.5 px-3">
                              {loadingBatches[medId] ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                              ) : (
                                <select
                                  required
                                  {...register(`items.${index}.batchNumber` as const)}
                                  className="w-full bg-white border border-slate-300 text-slate-800 rounded px-2 py-1 outline-none font-mono"
                                >
                                  <option value="">Choose Batch</option>
                                  {batchList.map((batch) => (
                                    <option key={batch.id} value={batch.batchNumber}>
                                      {batch.batchNumber} (Stock: {batch.currentQuantity} | Exp: {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : "No Exp"})
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>

                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                required
                                min={1}
                                {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                                className="w-full bg-white border border-slate-300 text-slate-800 rounded px-2 py-1 text-center outline-none font-mono"
                              />
                            </td>

                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700">
                              ₹{matchedBatch ? Number(matchedBatch.sellingRate).toFixed(2) : "0.00"}
                            </td>

                            <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                              {matchedBatch ? `${Number(matchedBatch.gstPercentage)}%` : "0%"}
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="p-1 text-red-500 hover:bg-red-550/10 rounded"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">No checkout items added to cart yet.</p>
              )}
            </div>
          </div>

          {/* Right panel: split payment modes collector & total totals summary */}
          <div className="lg:col-span-1 space-y-6">
            {/* Split payments calculator widget */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-blue-600 uppercase flex items-center space-x-2 border-b border-slate-100 pb-2">
                <DollarSign size={14} />
                <span>3. Split Payment Modes</span>
              </h3>

              <div className="space-y-3">
                {payFields.map((field, index) => {
                  return (
                    <div key={field.id} className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <select
                        required
                        {...register(`paymentModes.${index}.paymentMode` as const)}
                        className="bg-white border border-slate-300 text-slate-800 rounded px-2 py-1 outline-none text-xs flex-1"
                      >
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="CARD">Card</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                      </select>

                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="Amount"
                        {...register(`paymentModes.${index}.amount` as const, { valueAsNumber: true })}
                        className="bg-white border border-slate-300 text-slate-850 rounded px-2 py-1 outline-none text-xs w-28 font-mono text-right"
                      />

                      {payFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePay(index)}
                          className="text-red-500 p-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => appendPay({ paymentMode: "UPI", amount: 0 })}
                  className="w-full text-center py-2 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 rounded-xl font-semibold text-[11px] cursor-pointer"
                >
                  Add Payment Mode
                </button>
              </div>
            </div>

            {/* Checkout Pricing summaries */}
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl text-slate-800 shadow space-y-4">
              <h3 className="text-xs font-bold text-emerald-700 uppercase flex items-center space-x-2 border-b border-slate-200 pb-2">
                <ShoppingBag size={14} />
                <span>Sales Invoice Summary</span>
              </h3>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-650">Subtotal:</span>
                  <span className="text-slate-900 font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-650">GST Tax total:</span>
                  <span className="text-slate-900 font-semibold">₹{taxTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm">
                  <span className="text-slate-900 font-bold">Net Payable:</span>
                  <strong className="text-slate-950 font-extrabold text-base">₹{netPayable.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm">
                  <span className="text-slate-900 font-bold">Collected:</span>
                  <strong className={`font-bold ${Math.abs(totalPaymentsCollected - netPayable) < 0.01 ? "text-emerald-700" : "text-orange-700"}`}>
                    ₹{totalPaymentsCollected.toFixed(2)}
                  </strong>
                </div>
              </div>

              {errors.items && (
                <p className="text-red-400 text-[10px] bg-red-950/20 border border-red-900/30 p-2 rounded-lg">
                  {errors.items.message}
                </p>
              )}

              <button
                type="submit"
                disabled={saving || itemFields.length === 0}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5 cursor-pointer text-xs"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing billing checkout...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Complete Sale Invoicing</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* Invoice lookup directory */
        <div className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              fetchInvoices();
            }}
            className="bg-slate-50 border border-slate-200 p-4 rounded-2xl gap-3 flex flex-wrap items-end shadow-sm"
          >
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-900 uppercase">Search Invoice No</label>
              <input
                type="text"
                value={searchInvoiceNo}
                onChange={(e) => setSearchInvoiceNo(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 font-mono"
                placeholder="PHM000000"
              />
            </div>

            <button
              type="submit"
              className="flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold py-1.5 px-4 rounded-lg cursor-pointer h-[32px] transition-all"
            >
              <Search size={13} />
              <span>Apply</span>
            </button>
          </form>

          {loadingInvoices ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm font-mono">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-3" />
              <span>Synchronizing sales invoices lists...</span>
            </div>
          ) : invoices.length === 0 ? (
            <div className="h-64 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 space-y-2">
              <AlertTriangle size={28} className="text-slate-400" />
              <p className="text-xs font-mono">No checkout invoices compiled.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold tracking-wider text-slate-600 uppercase">
                    <th className="py-3 px-4">Invoice No</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4 text-center">Date & Time</th>
                    <th className="py-3 px-4 text-right">Net Paid (₹)</th>
                    <th className="py-3 px-4 text-right">Receipts Printing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {inv.pharmacyInvoiceNumber}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {inv.customerName}
                        {inv.customerPhone && (
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Phone: {inv.customerPhone}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">
                        {new Date(inv.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-650">
                        ₹{Number(inv.payableAmount).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handlePrint(inv.id)}
                          className="inline-flex items-center space-x-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                        >
                          <Printer size={11} />
                          <span>Print Slip</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Footer */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center border-t border-slate-200 p-4 bg-slate-50 text-[11px] font-mono">
                  <span className="text-slate-500">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex space-x-1.5">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      className="bg-white border border-slate-350 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg disabled:opacity-40 cursor-pointer"
                    >
                      Prev
                    </button>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                      className="bg-white border border-slate-350 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg disabled:opacity-40 cursor-pointer"
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
    </div>
  );
}
