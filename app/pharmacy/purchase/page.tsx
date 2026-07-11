"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PurchaseEntrySchema, PurchaseEntryFormInput } from "@/modules/pharmacy/schemas";
import {
  Search,
  Plus,
  Loader2,
  Trash2,

  Save,
  FileText,
  AlertTriangle,
} from "lucide-react";

type MedicineOption = {
  id: string;
  name: string;
  code: string;
  gstPercentage: string;
  purchasePrice: string;
  sellingPrice: string;
};

type PurchaseHistoryType = {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  orderDate: string;
  totalCost: string;
  remarks: string | null;
  recipient: {
    employeeCode: string;
    designation: string;
  };
  items: {
    id: string;
    batchNumber: string;
    quantityReceived: number;
    purchaseRate: string;
    sellingRate: string;
    gstPercentage: string;
    medicine: {
      name: string;
      code: string;
    };
  }[];
};

export default function PurchaseEntriesPage() {
  const [purchases, setPurchases] = useState<PurchaseHistoryType[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Filters for history
  const [filterInvoice, setFilterInvoice] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [page, setPage] = useState(1);
  const [, setTotalPages] = useState(1);

  // Active view tabs
  const [activeTab, setActiveTab] = useState<"NEW" | "HISTORY">("NEW");

  // Autocomplete medicine selection
  const [searchMedicineText, setSearchMedicineText] = useState("");
  const [searchedMedicines, setSearchedMedicines] = useState<MedicineOption[]>([]);
  const [searchingMed, setSearchingMed] = useState(false);

  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PurchaseEntryFormInput>({
    resolver: zodResolver(PurchaseEntrySchema),
    defaultValues: {
      invoiceNumber: "",
      supplierName: "",
      orderDate: new Date().toISOString().substring(0, 10),
      remarks: "",
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const query = new URLSearchParams({
        invoiceNumber: filterInvoice,
        supplierName: filterSupplier,
        page: page.toString(),
        limit: "10",
      });
      const res = await apiClient<{
        purchases: PurchaseHistoryType[];
        pagination: { pages: number };
      }>(`/api/pharmacy/purchases?${query.toString()}`);

      setPurchases(res.purchases);
      setTotalPages(res.pagination.pages || 1);
    } catch {
      toast.error("Failed to load purchase history.");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === "HISTORY") {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page]);

  const searchMedicines = async (val: string) => {
    setSearchMedicineText(val);
    if (val.trim().length < 2) {
      setSearchedMedicines([]);
      return;
    }
    setSearchingMed(true);
    try {
      const res = await apiClient<{ medicines: MedicineOption[] }>(
        `/api/pharmacy/medicines?name=${encodeURIComponent(val)}&isActive=true&limit=5`
      );
      setSearchedMedicines(res.medicines || []);
    } catch {
      // silent fail
    } finally {
      setSearchingMed(false);
    }
  };

  const handleSelectMedicine = (med: MedicineOption) => {
    append({
      medicineId: med.id,
      batchNumber: "",
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      quantityReceived: 10,
      purchaseRate: Number(med.purchasePrice),
      sellingRate: Number(med.sellingPrice),
      gstPercentage: Number(med.gstPercentage),
    });
    setSearchedMedicines([]);
    setSearchMedicineText("");
  };

  const onFormSubmit = async (data: PurchaseEntryFormInput) => {
    setSaving(true);
    try {
      await apiClient("/api/pharmacy/purchases", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Purchase ledger entries recorded successfully!");
      reset({
        invoiceNumber: "",
        supplierName: "",
        orderDate: new Date().toISOString().substring(0, 10),
        remarks: "",
        items: [],
      });
      setActiveTab("HISTORY");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Supplier Purchase Entry</h1>
          <p className="text-xs text-slate-500 mt-1">
            Book supplier invoice receipts, batch quantities, expiries, and rates.
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
            New Entry Sheet
          </button>
          <button
            onClick={() => setActiveTab("HISTORY")}
            className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "HISTORY"
                ? "bg-white text-slate-800 shadow"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Purchase History
          </button>
        </div>
      </div>

      {/* Main Switch Panel */}
      {activeTab === "NEW" ? (
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-xs">
          <h3 className="text-xs font-bold text-blue-600 uppercase flex items-center space-x-2 border-b border-slate-100 pb-2.5">
            <FileText size={14} />
            <span>1. Supplier Invoice Header Metadata</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Invoice Number *</label>
              <input
                type="text"
                required
                {...register("invoiceNumber")}
                className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-mono"
                placeholder="e.g. INV-9908"
              />
              {errors.invoiceNumber && <p className="text-red-500 text-[9px]">{errors.invoiceNumber.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Supplier Name (Free Text) *</label>
              <input
                type="text"
                required
                {...register("supplierName")}
                className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                placeholder="e.g. Ganesha Pharma Distributor"
              />
              {errors.supplierName && <p className="text-red-500 text-[9px]">{errors.supplierName.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Purchase Date *</label>
              <input
                type="date"
                required
                {...register("orderDate")}
                className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-blue-600 uppercase flex items-center space-x-2">
              <Plus size={14} />
              <span>2. Add Medicine Batches</span>
            </h3>

            {/* Medicine autocomplete search */}
            <div className="relative max-w-md">
              <div className="flex items-center bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3 py-2">
                <Search size={15} className="text-slate-400 mr-2" />
                <input
                  type="text"
                  value={searchMedicineText}
                  onChange={(e) => searchMedicines(e.target.value)}
                  className="bg-transparent text-slate-800 text-xs w-full outline-none placeholder-slate-400"
                  placeholder="Type medicine name to add to ledger entry list..."
                />
                {searchingMed && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
              </div>

              {searchedMedicines.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {searchedMedicines.map((med) => (
                    <button
                      key={med.id}
                      type="button"
                      onClick={() => handleSelectMedicine(med)}
                      className="w-full text-left p-2.5 hover:bg-slate-50 transition-colors flex justify-between items-center text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{med.name}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Code: {med.code}</span>
                      </div>
                      <span className="bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded text-[9px] uppercase">
                        Select
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected batch items table forms */}
            {fields.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden mt-3">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                      <th className="py-2.5 px-3">Medicine</th>
                      <th className="py-2.5 px-3 w-28">Batch No *</th>
                      <th className="py-2.5 px-3 w-32">Expiry Date</th>
                      <th className="py-2.5 px-3 w-20">Qty Received *</th>
                      <th className="py-2.5 px-3 w-24">Purchase Rate (₹)</th>
                      <th className="py-2.5 px-3 w-24">Selling Rate (₹)</th>
                      <th className="py-2.5 px-3 w-20">GST %</th>
                      <th className="py-2.5 px-3 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fields.map((field, index) => {
                      return (
                        <tr key={field.id} className="hover:bg-slate-50/20">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {/* Medicine details from list lookup */}
                            Option Item #{index + 1}
                            <input
                              type="hidden"
                              {...register(`items.${index}.medicineId` as const)}
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              required
                              placeholder="BATCH01"
                              {...register(`items.${index}.batchNumber` as const)}
                              className="w-full bg-white border border-slate-300 text-slate-800 rounded px-2 py-1 outline-none font-mono"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="date"
                              {...register(`items.${index}.expiryDate` as const)}
                              className="w-full bg-white border border-slate-300 text-slate-800 rounded px-2 py-1 outline-none font-mono"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              required
                              min={1}
                              {...register(`items.${index}.quantityReceived` as const, { valueAsNumber: true })}
                              className="w-full bg-white border border-slate-300 text-slate-800 rounded px-2 py-1 outline-none font-mono"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              step="0.01"
                              required
                              {...register(`items.${index}.purchaseRate` as const, { valueAsNumber: true })}
                              className="w-full bg-white border border-slate-300 text-slate-800 rounded px-2 py-1 outline-none font-mono"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              step="0.01"
                              required
                              {...register(`items.${index}.sellingRate` as const, { valueAsNumber: true })}
                              className="w-full bg-white border border-slate-300 text-slate-800 rounded px-2 py-1 outline-none font-mono"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              step="0.01"
                              required
                              {...register(`items.${index}.gstPercentage` as const, { valueAsNumber: true })}
                              className="w-full bg-white border border-slate-300 text-slate-800 rounded px-2 py-1 outline-none font-mono"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
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
              <p className="text-[11px] text-slate-400 italic">No batches scheduled to be received yet.</p>
            )}
          </div>

          <div className="space-y-1.5 pt-4 border-t border-slate-100">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Remarks / Logistics notes</label>
            <textarea
              rows={2}
              {...register("remarks")}
              className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg p-2.5 outline-none focus:border-blue-500"
              placeholder="Supplier contact details, transport details, consignment notes..."
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving || fields.length === 0}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-6 rounded-xl shadow cursor-pointer disabled:opacity-50 transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Recording Purchase...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Finalize Purchase Receipt</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* History tab */
        <div className="space-y-6">
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); loadHistory(); }} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl gap-3 flex flex-wrap items-end shadow-sm">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Invoice Number</label>
              <input
                type="text"
                value={filterInvoice}
                onChange={(e) => setFilterInvoice(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 font-mono"
                placeholder="Invoice No"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Supplier</label>
              <input
                type="text"
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-blue-500"
                placeholder="Supplier Name"
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

          {loadingHistory ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm font-mono">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-3" />
              <span>Synchronizing purchase entries historical records...</span>
            </div>
          ) : purchases.length === 0 ? (
            <div className="h-64 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 space-y-2">
              <AlertTriangle size={28} className="text-slate-400" />
              <p className="text-xs font-mono">No purchase history entries recorded.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {purchases.map((pur) => (
                <div key={pur.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 uppercase font-mono block">Supplier Consignment</span>
                      <h4 className="text-sm font-bold text-slate-800 mt-0.5">{pur.supplierName}</h4>
                    </div>

                    <div className="flex items-center space-x-4 text-right">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Invoice Number</span>
                        <strong className="font-mono text-slate-700">{pur.invoiceNumber}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Purchase Date</span>
                        <span className="font-mono text-slate-700">{new Date(pur.orderDate).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Total Cost</span>
                        <strong className="text-blue-600 font-mono text-xs">₹{Number(pur.totalCost).toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Items List inside panel */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-bold text-slate-500 uppercase border-b border-slate-100 pb-1">
                          <th className="py-1">Medicine</th>
                          <th className="py-1">Batch Number</th>
                          <th className="py-1 text-center">Qty Received</th>
                          <th className="py-1 text-right">Purchase Rate</th>
                          <th className="py-1 text-right">Selling Rate</th>
                          <th className="py-1 text-right">GST</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-slate-650">
                        {pur.items.map((it) => (
                          <tr key={it.id} className="py-1.5">
                            <td className="py-1.5 font-semibold text-slate-800">{it.medicine.name}</td>
                            <td className="py-1.5 font-mono text-slate-700">{it.batchNumber}</td>
                            <td className="py-1.5 text-center font-mono">{it.quantityReceived}</td>
                            <td className="py-1.5 text-right font-mono">₹{Number(it.purchaseRate).toFixed(2)}</td>
                            <td className="py-1.5 text-right font-mono">₹{Number(it.sellingRate).toFixed(2)}</td>
                            <td className="py-1.5 text-right font-mono">{Number(it.gstPercentage)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {pur.remarks && (
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-500 text-[11px] leading-relaxed">
                      <strong>Remarks: </strong>
                      <span>{pur.remarks}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
