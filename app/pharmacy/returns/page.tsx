"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SalesReturnSchema, SalesReturnFormInput } from "@/modules/pharmacy/schemas";
import {
  Search,
  Plus,
  Loader2,
  Trash2,
  Save,
  Printer,
  FileText,
  AlertTriangle,

} from "lucide-react";

type InvoiceItem = {
  id: string;
  medicineId: string;
  batchNumber: string;
  quantitySold: number;
  unitPrice: string;
  totalPrice: string;
  medicine: {
    name: string;
    code: string;
  };
};

type InvoiceDetails = {
  id: string;
  pharmacyInvoiceNumber: string;
  customerName: string;
  payableAmount: string;
  status: string;
  items: InvoiceItem[];
  returns: {
    id: string;
    returnNumber: string;
    refundAmount: string;
    reason: string;
    createdAt: string;
    items: {
      medicineId: string;
      batchNumber: string;
      quantityReturned: number;
      refundRate: string;
      totalAmount: string;
    }[];
  }[];
};

type ReturnLogType = {
  id: string;
  returnNumber: string;
  refundAmount: string;
  createdAt: string;
  pharmacyInvoice: {
    pharmacyInvoiceNumber: string;
    customerName: string;
  };
};

export default function SalesReturnsPage() {
  const [activeTab, setActiveTab] = useState<"NEW" | "LOGS">("NEW");

  // Search invoice
  const [invoiceSearchNo, setInvoiceSearchNo] = useState("");
  const [searchingInvoice, setSearchingInvoice] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetails | null>(null);

  // Return logs
  const [returnLogs, setReturnLogs] = useState<ReturnLogType[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [filterReturnNo, setFilterReturnNo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SalesReturnFormInput>({
    resolver: zodResolver(SalesReturnSchema),
    defaultValues: {
      pharmacyInvoiceId: "",
      reason: "",
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const handleInvoiceSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceSearchNo.trim()) return;
    setSearchingInvoice(true);
    setSelectedInvoice(null);
    reset({
      pharmacyInvoiceId: "",
      reason: "",
      items: [],
    });
    try {
      // Find matching invoice (we fetch using lists query first then fetch full details)
      const listRes = await apiClient<{ invoices: { id: string }[] }>(
        `/api/pharmacy/sales?invoiceNumber=${encodeURIComponent(invoiceSearchNo.trim())}`
      );
      if (!listRes.invoices || listRes.invoices.length === 0) {
        toast.error("Pharmacy Invoice not found.");
        return;
      }
      // Fetch full details
      const fullRes = await apiClient<InvoiceDetails>(`/api/pharmacy/sales/${listRes.invoices[0].id}`);
      setSelectedInvoice(fullRes);
      setValue("pharmacyInvoiceId", fullRes.id);
    } catch {
      toast.error("Failed to load invoice details.");
    } finally {
      setSearchingInvoice(false);
    }
  };

  const handleAddItemToReturn = (item: InvoiceItem) => {
    // Check if item is already added
    const alreadyAdded = fields.some(
      (f) => f.medicineId === item.medicineId && f.batchNumber === item.batchNumber
    );
    if (alreadyAdded) {
      toast.warning("This item is already added to the return list.");
      return;
    }

    // Calculate maximum returnable quantity
    let previouslyReturned = 0;
    if (selectedInvoice?.returns) {
      selectedInvoice.returns.forEach((ret) => {
        const line = ret.items.find(
          (lineItem) => lineItem.medicineId === item.medicineId && lineItem.batchNumber === item.batchNumber
        );
        if (line) {
          previouslyReturned += line.quantityReturned;
        }
      });
    }
    const maxReturnable = item.quantitySold - previouslyReturned;
    if (maxReturnable <= 0) {
      toast.error("This item has already been fully returned.");
      return;
    }

    append({
      medicineId: item.medicineId,
      batchNumber: item.batchNumber,
      quantityReturned: 1,
    });
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const query = new URLSearchParams({
        returnNumber: filterReturnNo,
        page: page.toString(),
        limit: "10",
      });
      const res = await apiClient<{
        returns: ReturnLogType[];
        pagination: { pages: number };
      }>(`/api/pharmacy/returns?${query.toString()}`);
      setReturnLogs(res.returns);
      setTotalPages(res.pagination.pages || 1);
    } catch {
      toast.error("Failed to load return logs.");
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === "LOGS") {
      fetchLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page]);

  const onReturnFormSubmit = async (data: SalesReturnFormInput) => {
    setSaving(true);
    try {
      const retObj = await apiClient<{ id: string; returnNumber: string }>("/api/pharmacy/returns", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success(`Return receipt processed successfully: ${retObj.returnNumber}`);
      // Trigger print
      handlePrint(retObj.id);

      setSelectedInvoice(null);
      reset({
        pharmacyInvoiceId: "",
        reason: "",
        items: [],
      });
      setInvoiceSearchNo("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Return processing failed.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async (returnId: string) => {
    try {
      const printData = await apiClient<Record<string, unknown>>(`/api/pharmacy/returns/${returnId}/print`);
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
          <head><title>Pharmacy Return Print</title></head>
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
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Sales Returns Terminal</h1>
          <p className="text-xs text-slate-500 mt-1">
            Process partial/full sales returns, update batch inventory counts, and print refund slips.
          </p>
        </div>

        <div className="flex space-x-1.5 shrink-0 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab("NEW")}
            className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "NEW"
                ? "bg-white text-slate-800 shadow"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Process Return
          </button>
          <button
            onClick={() => setActiveTab("LOGS")}
            className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "LOGS"
                ? "bg-white text-slate-800 shadow"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Return Logs
          </button>
        </div>
      </div>

      {/* Main Switch panel */}
      {activeTab === "NEW" ? (
        <div className="space-y-6 text-xs">
          {/* Invoice search input */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-blue-600 uppercase flex items-center space-x-2">
              <Search size={14} className="text-blue-600" />
              <span>1. Find Sales Invoice Reference</span>
            </h3>

            <form onSubmit={handleInvoiceSearchSubmit} className="flex items-end gap-3 max-w-md">
              <div className="space-y-1 flex-1">
                <input
                  type="text"
                  required
                  value={invoiceSearchNo}
                  onChange={(e) => setInvoiceSearchNo(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-mono"
                  placeholder="Enter Pharmacy Invoice No (e.g. PHM260001)"
                />
              </div>

              <button
                type="submit"
                disabled={searchingInvoice}
                className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg cursor-pointer transition-all h-[34px]"
              >
                {searchingInvoice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Search</span>}
              </button>
            </form>
          </div>

          {/* Return items configuration sheet */}
          {selectedInvoice && (
            <form onSubmit={handleSubmit(onReturnFormSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left Column: Items details lookup */}
              <div className="lg:col-span-2 space-y-6">
                {/* Invoice overview and items selector */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-bold text-blue-600 uppercase flex items-center space-x-2">
                      <FileText size={14} />
                      <span>2. Select Return Items from Invoice</span>
                    </h3>
                    <div className="text-right font-mono">
                      <span className="text-slate-400 block text-[9px]">Invoice Payable</span>
                      <strong className="text-slate-700">₹{Number(selectedInvoice.payableAmount).toFixed(2)}</strong>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-bold text-slate-500 uppercase border-b border-slate-100 pb-1">
                          <th className="py-1">Medicine Name</th>
                          <th className="py-1">Batch</th>
                          <th className="py-1 text-center">Sold Qty</th>
                          <th className="py-1 text-right">Unit Rate</th>
                          <th className="py-1 text-right">Total Price</th>
                          <th className="py-1 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-slate-650">
                        {selectedInvoice.items.map((item) => (
                          <tr key={item.id} className="py-2">
                            <td className="py-2 font-semibold text-slate-800">{item.medicine.name}</td>
                            <td className="py-2 font-mono text-slate-700">{item.batchNumber}</td>
                            <td className="py-2 text-center font-mono">{item.quantitySold}</td>
                            <td className="py-2 text-right font-mono">₹{Number(item.unitPrice).toFixed(2)}</td>
                            <td className="py-2 text-right font-mono">₹{Number(item.totalPrice).toFixed(2)}</td>
                            <td className="py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleAddItemToReturn(item)}
                                className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-250 transition-all text-[9px] cursor-pointer"
                              >
                                <Plus size={9} />
                                <span>Add to Return</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Return quantities setup */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-blue-600 uppercase flex items-center space-x-2 border-b border-slate-100 pb-2">
                    <Trash2 size={14} className="text-blue-600" />
                    <span>3. Config Return Quantities</span>
                  </h3>

                  {fields.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                            <th className="py-2 px-3">Medicine</th>
                            <th className="py-2 px-3 w-32">Batch No</th>
                            <th className="py-2 px-3 w-28 text-center">Return Qty *</th>
                            <th className="py-2 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                          {fields.map((field, index) => {
                            return (
                              <tr key={field.id} className="hover:bg-slate-50/20">
                                <td className="py-2 px-3 font-sans font-semibold text-slate-800">
                                  Line #{index + 1}
                                  <input
                                    type="hidden"
                                    {...register(`items.${index}.medicineId` as const)}
                                  />
                                </td>

                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    disabled
                                    {...register(`items.${index}.batchNumber` as const)}
                                    className="bg-slate-50 border border-slate-200 text-slate-500 rounded px-2 py-0.5 outline-none font-mono"
                                  />
                                </td>

                                <td className="py-2 px-3">
                                  <input
                                    type="number"
                                    required
                                    min={1}
                                    {...register(`items.${index}.quantityReturned` as const, { valueAsNumber: true })}
                                    className="w-full bg-white border border-slate-300 text-slate-800 rounded px-2 py-0.5 text-center outline-none font-mono"
                                  />
                                </td>

                                <td className="py-2 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    className="text-red-500 p-1"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No items added to return cart yet.</p>
                  )}
                </div>
              </div>

              {/* Right Column: Return details validation */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-blue-600 uppercase flex items-center space-x-2 border-b border-slate-100 pb-2">
                    <Save size={14} className="text-blue-600" />
                    <span>4. Finalize Return</span>
                  </h3>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Return Reason *</label>
                      <textarea
                        rows={3}
                        required
                        {...register("reason")}
                        className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg p-2 outline-none focus:border-blue-500 placeholder-slate-400"
                        placeholder="Document reason for return checkout (e.g. Incorrect dosage returned)..."
                      />
                      {errors.reason && <p className="text-red-500 text-[9px]">{errors.reason.message}</p>}
                    </div>

                    {errors.items && (
                      <p className="text-red-500 text-[9px] bg-red-50 border border-red-200 p-2 rounded-lg">
                        {errors.items.message}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={saving || fields.length === 0}
                      className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl shadow active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing returns...</span>
                        </>
                      ) : (
                        <>
                          <Save size={14} />
                          <span>Finalize Return Transaction</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      ) : (
        /* Return Logs tab */
        <div className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              fetchLogs();
            }}
            className="bg-slate-50 border border-slate-200 p-4 rounded-2xl gap-3 flex flex-wrap items-end shadow-sm text-xs"
          >
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Search Return No</label>
              <input
                type="text"
                value={filterReturnNo}
                onChange={(e) => setFilterReturnNo(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 font-mono"
                placeholder="PRT000000"
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

          {loadingLogs ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm font-mono">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-3" />
              <span>Synchronizing returns historical logs...</span>
            </div>
          ) : returnLogs.length === 0 ? (
            <div className="h-64 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 space-y-2">
              <AlertTriangle size={28} className="text-slate-400" />
              <p className="text-xs font-mono">No pharmacy return records logged.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold tracking-wider text-slate-600 uppercase">
                    <th className="py-3 px-4">Return Number</th>
                    <th className="py-3 px-4">Customer Info</th>
                    <th className="py-3 px-4">Invoice Number</th>
                    <th className="py-3 px-4 text-center">Return Date</th>
                    <th className="py-3 px-4 text-right">Refund Total (₹)</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {returnLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {log.returnNumber}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {log.pharmacyInvoice.customerName}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {log.pharmacyInvoice.pharmacyInvoiceNumber}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-red-600">
                        ₹{Number(log.refundAmount).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handlePrint(log.id)}
                          className="inline-flex items-center space-x-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                        >
                          <Printer size={11} />
                          <span>Print Receipt</span>
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
