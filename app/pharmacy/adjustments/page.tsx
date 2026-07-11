"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { StockAdjustmentSchema, StockAdjustmentInput } from "@/modules/pharmacy/schemas";
import {
  Search,
  Plus,
  Loader2,
  AlertTriangle,
  History,
  Save,
} from "lucide-react";

type AdjustmentLog = {
  id: string;
  batchNumber: string;
  adjustmentType: string;
  stockBefore: number;
  quantity: number;
  stockAfter: number;
  reason: string;
  date: string;
  medicine: {
    name: string;
    code: string;
  };
  employee: {
    employeeCode: string;
    designation: string;
  };
};

type MedicineOption = {
  id: string;
  name: string;
  code: string;
};

type BatchOption = {
  id: string;
  batchNumber: string;
  currentQuantity: number;
  expiryDate: string | null;
};

export default function StockAdjustmentsPage() {
  const [logs, setLogs] = useState<AdjustmentLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchBatch, setSearchBatch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Medicine autocomplete search inside Modal
  const [medSearch, setMedSearch] = useState("");
  const [medMatches, setMedMatches] = useState<MedicineOption[]>([]);
  const [searchingMed, setSearchingMed] = useState(false);
  const [selectedMed, setSelectedMed] = useState<MedicineOption | null>(null);

  // Batches lookup list for selected medicine
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [selectedBatchStock, setSelectedBatchStock] = useState<BatchOption | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<StockAdjustmentInput>({
    resolver: zodResolver(StockAdjustmentSchema),
    defaultValues: {
      medicineId: "",
      batchNumber: "",
      adjustmentType: "DAMAGED",
      quantity: 1,
      reason: "",
    },
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        batchNumber: searchBatch,
        page: page.toString(),
        limit: "10",
      });
      const res = await apiClient<{
        adjustments: AdjustmentLog[];
        pagination: { pages: number };
      }>(`/api/pharmacy/adjustments?${query.toString()}`);
      setLogs(res.adjustments);
      setTotalPages(res.pagination.pages || 1);
    } catch {
      toast.error("Failed to load stock adjustment logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleOpenAddModal = () => {
    setSelectedMed(null);
    setSelectedBatchStock(null);
    setBatches([]);
    setMedSearch("");
    reset({
      medicineId: "",
      batchNumber: "",
      adjustmentType: "DAMAGED",
      quantity: 1,
      reason: "",
    });
    setModalOpen(true);
  };

  const triggerMedicineSearch = async (val: string) => {
    setMedSearch(val);
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

  const loadMedicineBatches = async (medId: string) => {
    setLoadingBatches(true);
    try {
      const res = await apiClient<BatchOption[]>(`/api/pharmacy/inventory/batches?medicineId=${medId}`);
      setBatches(res);
    } catch {
      toast.error("Failed to load medicine stock batches.");
    } finally {
      setLoadingBatches(false);
    }
  };

  const handleSelectMedicine = (med: MedicineOption) => {
    setSelectedMed(med);
    setValue("medicineId", med.id);
    setMedMatches([]);
    setMedSearch("");
    loadMedicineBatches(med.id);
  };

  const handleSelectBatch = (batchNo: string) => {
    setValue("batchNumber", batchNo);
    const matched = batches.find((b) => b.batchNumber === batchNo);
    setSelectedBatchStock(matched || null);
  };

  const onFormSubmit = async (data: StockAdjustmentInput) => {
    setSaving(true);
    try {
      await apiClient("/api/pharmacy/adjustments", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Inventory stock levels adjusted successfully.");
      setModalOpen(false);
      fetchLogs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Adjustment failed.";
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
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Stock Adjustments Registry</h1>
          <p className="text-xs text-slate-500 mt-1">
            Log inventory discrepancies (damages, expiries, lost consignments, and manual overrides).
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow active:scale-[0.98] transition-all cursor-pointer shrink-0"
        >
          <Plus size={14} />
          <span>New Adjustment Log</span>
        </button>
      </div>

      {/* Search Filter */}
      <form onSubmit={handleSearchSubmit} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl gap-3 flex flex-wrap items-end shadow-sm text-xs">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Batch Number</label>
          <input
            type="text"
            value={searchBatch}
            onChange={(e) => setSearchBatch(e.target.value)}
            className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 font-mono"
            placeholder="BATCH001"
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

      {/* Table Display */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-500 text-sm font-mono">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-3" />
          <span>Synchronizing inventory stock adjustments audit trail...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="h-64 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 space-y-2">
          <AlertTriangle size={28} className="text-slate-400" />
          <p className="text-xs font-mono">No stock adjustments logged in database.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Medicine</th>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4 text-center">Type</th>
                  <th className="py-3 px-4 text-right">Qty (Delta)</th>
                  <th className="py-3 px-4 text-center">Ledger Trail (Before → After)</th>
                  <th className="py-3 px-4">Reason / Remarks</th>
                  <th className="py-3 px-4 text-right">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono">
                      {new Date(log.date).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-slate-900">{log.medicine.name}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Code: {log.medicine.code}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">{log.batchNumber}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                          log.adjustmentType === "DAMAGED" || log.adjustmentType === "EXPIRED" || log.adjustmentType === "LOST"
                            ? "bg-red-50 text-red-750 border border-red-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {log.adjustmentType}
                      </span>
                    </td>
                    <td className={`py-3.5 px-4 text-right font-mono font-bold ${log.quantity < 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-600 font-semibold">
                      {log.stockBefore} <span className="text-slate-300 mx-1">→</span> {log.stockAfter}
                    </td>
                    <td className="py-3.5 px-4 italic text-slate-550 max-w-[150px] truncate" title={log.reason}>
                      {log.reason}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {log.employee.designation}
                      <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">{log.employee.employeeCode}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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

      {/* =======================================================
          STOCK ADJUSTMENT MODAL DIALOG
          ======================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative">
            <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>

            <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center space-x-2">
              <History size={16} className="text-blue-600" />
              <span>Record Inventory Stock Correction</span>
            </h3>

            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 text-xs">
              {/* Medicine search autocomplete */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Search Medicine *</label>
                {!selectedMed ? (
                  <div className="relative">
                    <div className="flex items-center bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3 py-2">
                      <Search size={14} className="text-slate-400 mr-2" />
                      <input
                        type="text"
                        value={medSearch}
                        onChange={(e) => triggerMedicineSearch(e.target.value)}
                        className="bg-transparent text-slate-850 text-xs w-full outline-none placeholder-slate-400"
                        placeholder="Type medicine name (min 2 chars)..."
                      />
                      {searchingMed && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />}
                    </div>

                    {medMatches.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 divide-y divide-slate-100 max-h-40 overflow-y-auto">
                        {medMatches.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleSelectMedicine(m)}
                            className="w-full text-left p-2 hover:bg-slate-50 text-xs transition-colors flex justify-between items-center"
                          >
                            <span>{m.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">Code: {m.code}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex justify-between items-center text-slate-700">
                    <div>
                      <strong className="text-slate-900">{selectedMed.name}</strong>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Code: {selectedMed.code}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMed(null);
                        setValue("medicineId", "");
                        setBatches([]);
                        setSelectedBatchStock(null);
                      }}
                      className="text-red-500 font-semibold hover:underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                )}
                {errors.medicineId && <p className="text-red-500 text-[9px]">{errors.medicineId.message}</p>}
              </div>

              {/* Batch lookup select */}
              {selectedMed && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Select Stock Batch *</label>
                    {loadingBatches ? (
                      <div className="flex items-center space-x-1.5 text-slate-500">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        <span>Finding batches...</span>
                      </div>
                    ) : batches.length === 0 ? (
                      <p className="text-red-500 italic text-[11px]">No active inventory batches exist.</p>
                    ) : (
                      <select
                        required
                        onChange={(e) => handleSelectBatch(e.target.value)}
                        className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none"
                      >
                        <option value="">Choose Batch</option>
                        {batches.map((b) => (
                          <option key={b.id} value={b.batchNumber}>
                            {b.batchNumber} (Stock: {b.currentQuantity})
                          </option>
                        ))}
                      </select>
                    )}
                    {errors.batchNumber && <p className="text-red-500 text-[9px]">{errors.batchNumber.message}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Current Batch Stock</label>
                    <input
                      type="text"
                      disabled
                      value={selectedBatchStock ? selectedBatchStock.currentQuantity : "Select Batch"}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded-lg px-3 py-2 outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Adjustment quantity and type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Adjustment Type *</label>
                  <select
                    {...register("adjustmentType")}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none"
                  >
                    <option value="DAMAGED">Damaged (Deduction)</option>
                    <option value="EXPIRED">Expired (Deduction)</option>
                    <option value="LOST">Lost (Deduction)</option>
                    <option value="MANUAL_CORRECTION">Manual Correction (Add/Deduct)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Adjustment Quantity *</label>
                  <input
                    type="number"
                    required
                    {...register("quantity", { valueAsNumber: true })}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none font-mono"
                    placeholder="Enter quantity"
                  />
                  {errors.quantity && <p className="text-red-500 text-[9px]">{errors.quantity.message}</p>}
                </div>
              </div>

              {/* Adjustment Reason */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Adjustment Reason Description *</label>
                <textarea
                  rows={3}
                  required
                  {...register("reason")}
                  className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg p-2.5 outline-none placeholder-slate-400"
                  placeholder="Document reason for adjusting stock levels..."
                />
                {errors.reason && <p className="text-red-500 text-[9px]">{errors.reason.message}</p>}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedMed}
                  className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2 rounded-xl shadow cursor-pointer transition-all"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Adjusting...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Adjust Stock</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
