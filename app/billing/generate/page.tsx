"use client";

import React, { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { InvoiceGenerationSchema, InvoiceGenerationFormInput } from "@/modules/billing/schemas";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Save,
  Search,
  DollarSign,
  Info,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PatientSearchType = {
  id: string;
  uhid: string;
  name: string;
  phone: string;
  gender: string;
  dob: string;
};

type PendingChargeType = {
  id: string;
  sourceModule: string;
  totalAmount: number;
  rate: number;
  quantity: number;
  createdAt: string;
  chargeCatalog: {
    name: string;
    code: string;
    category: string;
  };
};

type PendingChargesResponse = {
  patientName: string;
  patientUhid: string;
  pendingCharges: PendingChargeType[];
  availableDepositBalance: number;
  totalOutstandingBalance: number;
  isNoDueEligible: boolean;
};

export default function GenerateInvoicePage() {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);

  // Patient autocompleting lookup states
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<PatientSearchType[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchType | null>(null);
  const [searchingPatients, setSearchingPatients] = useState(false);

  // Patient outstanding statements states
  const [loadingCharges, setLoadingCharges] = useState(false);
  const [statement, setStatement] = useState<PendingChargesResponse | null>(null);
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<InvoiceGenerationFormInput>({
    resolver: zodResolver(InvoiceGenerationSchema),
    defaultValues: {
      patientId: "",
      chargeIds: [],
      discountAmount: 0,
      discountPercentage: 0,
      discountReason: "",
    },
  });

  // Watch inputs
  const watchDiscountAmount = Number(useWatch({ control, name: "discountAmount" })) || 0;
  const watchDiscountPercentage = Number(useWatch({ control, name: "discountPercentage" })) || 0;

  // Sync patient autocomplete queries
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
        // Suppress autocomplete warnings
      } finally {
        setSearchingPatients(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [patientSearch]);

  // Load pending charges for selected patient
  useEffect(() => {
    if (!selectedPatient) {
      setStatement(null);
      setSelectedChargeIds([]);
      setValue("chargeIds", []);
      setValue("patientId", "");
      return;
    }

    setValue("patientId", selectedPatient.id, { shouldValidate: true });

    async function loadPendingCharges() {
      setLoadingCharges(true);
      try {
        const res = await apiClient<PendingChargesResponse>(
          `/api/billing/patients/${selectedPatient!.id}/pending-charges`
        );
        setStatement(res);
        // By default, select all pending charges
        const ids = res.pendingCharges.map((c) => c.id);
        setSelectedChargeIds(ids);
        setValue("chargeIds", ids, { shouldValidate: true });
      } catch {
        toast.error("Failed to load patient pending charges statement.");
      } finally {
        setLoadingCharges(false);
      }
    }

    loadPendingCharges();
  }, [selectedPatient, setValue]);

  // Programmatically register fields without physical HTML inputs
  useEffect(() => {
    register("patientId");
    register("chargeIds");
  }, [register]);

  const handleCheckboxChange = (chargeId: string, checked: boolean) => {
    let nextIds = [];
    if (checked) {
      nextIds = [...selectedChargeIds, chargeId];
    } else {
      nextIds = selectedChargeIds.filter((id) => id !== chargeId);
    }
    setSelectedChargeIds(nextIds);
    setValue("chargeIds", nextIds, { shouldValidate: true });
  };

  const onInvalid = (formErrors: any) => {
    console.error("Invoice Form Validation Errors:", formErrors);
    const errorList: string[] = [];
    
    if (formErrors.patientId) {
      errorList.push(formErrors.patientId.message || "Invalid Patient selection.");
    }
    if (formErrors.chargeIds) {
      errorList.push(formErrors.chargeIds.message || "At least one charge must be selected.");
    }
    if (formErrors.discountAmount) {
      errorList.push(formErrors.discountAmount.message || "Invalid discount amount.");
    }
    if (formErrors.discountPercentage) {
      errorList.push(formErrors.discountPercentage.message || "Invalid discount percentage.");
    }
    if (formErrors.discountReason) {
      errorList.push(formErrors.discountReason.message || "A discount reason description is mandatory when applying discounts.");
    }

    if (errorList.length > 0) {
      toast.error(`Validation failed: ${errorList.join(" | ")}`);
    } else {
      toast.error("Form validation failed. Please check all fields.");
    }
  };

  const onSubmit = async (data: InvoiceGenerationFormInput) => {
    if (!selectedPatient) {
      toast.error("Please search and select a registered patient.");
      return;
    }
    if (selectedChargeIds.length === 0) {
      toast.error("At least one pending charge must be selected to generate an invoice.");
      return;
    }
    setGenerating(true);
    try {
      const payload = {
        ...data,
        patientId: selectedPatient.id,
        chargeIds: selectedChargeIds,
      };

      const res = await apiClient<{ id: string; invoiceNumber: string }>("/api/billing/invoices", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success(`Invoice ${res.invoiceNumber} generated successfully!`);
      router.push(`/billing/${res.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate patient invoice.";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  // Calculations for billing totals
  const selectedChargesSum = statement
    ? statement.pendingCharges
        .filter((c) => selectedChargeIds.includes(c.id))
        .reduce((acc, curr) => acc + Number(curr.totalAmount), 0)
    : 0;

  // Resolve discount
  let discountDeduction = 0;
  if (watchDiscountPercentage > 0) {
    discountDeduction = selectedChargesSum * (watchDiscountPercentage / 100);
  } else if (watchDiscountAmount > 0) {
    discountDeduction = watchDiscountAmount;
  }

  const postDiscountPayable = Math.max(0, selectedChargesSum - discountDeduction);
  
  // Resolve deposit application balance
  const availableDeposits = statement?.availableDepositBalance || 0;
  const appliedDepositDeduction = Math.min(availableDeposits, postDiscountPayable);
  const finalBalanceDue = Math.max(0, postDiscountPayable - appliedDepositDeduction);

  const hasDiscountApplied = discountDeduction > 0;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="flex items-center space-x-3 border-b border-slate-800 pb-5">
        <Link
          href="/billing"
          className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Generate Patient Invoice</h1>
          <p className="text-xs text-slate-400">Compile un-invoiced patient charges, apply discount parameters, and check deposits</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        
        {/* STEP 1: PATIENT LOOKUP */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center">
            <span>1. Patient Demographic Lookup</span>
          </h3>

          {selectedPatient ? (
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-200">{selectedPatient.name}</h4>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  UHID: {selectedPatient.uhid} | Mobile: {selectedPatient.phone} | Gender: {selectedPatient.gender.toUpperCase()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPatient(null);
                  setValue("patientId", "");
                  setValue("chargeIds", []);
                  setSelectedChargeIds([]);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-red-400 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                Change Patient
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 h-full" size={16} />
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl pl-10 pr-4 py-3 outline-none transition-all placeholder-slate-600"
                  placeholder="Search patient name, UHID, phone..."
                />
                {searchingPatients && (
                  <div className="absolute right-3 top-3">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                  </div>
                )}
              </div>

              {/* Autocomplete List */}
              {patientResults.length > 0 && (
                <div className="border border-slate-850 bg-slate-950 divide-y divide-slate-850 rounded-xl overflow-hidden shadow-xl max-h-48 overflow-y-auto">
                  {patientResults.map((pat) => (
                    <div
                      key={pat.id}
                      onClick={() => {
                        setSelectedPatient(pat);
                        setValue("patientId", pat.id, { shouldValidate: true });
                        setPatientResults([]);
                      }}
                      className="p-3 text-xs flex justify-between items-center hover:bg-slate-900 cursor-pointer transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-slate-200">{pat.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono ml-2">({pat.uhid})</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{pat.phone}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* STEP 2: PENDING BILLABLE CHARGES SELECTOR */}
        {selectedPatient && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center">
              <span>2. Pending Charges Selector</span>
            </h3>

            {loadingCharges ? (
              <div className="h-32 flex items-center justify-center text-zinc-550 font-mono text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500 mr-2" />
                <span>Extracting Patient ledger items...</span>
              </div>
            ) : statement && statement.pendingCharges.length > 0 ? (
              <div className="space-y-3">
                <p className="text-[10px] text-slate-400">
                  Select which pending items to include in this invoice generation:
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {statement.pendingCharges.map((charge) => (
                    <label
                      key={charge.id}
                      className="flex items-center space-x-3 bg-slate-950/20 border border-slate-850/60 p-3 rounded-xl hover:bg-slate-850/15 cursor-pointer select-none transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedChargeIds.includes(charge.id)}
                        onChange={(e) => handleCheckboxChange(charge.id, e.target.checked)}
                        className="rounded border-slate-800 bg-slate-950 text-emerald-600 focus:ring-0 focus:ring-offset-0 cursor-pointer h-4 w-4"
                      />
                      <div className="flex-1 flex justify-between pr-2 text-xs">
                        <div>
                          <div className="font-semibold text-slate-200">{charge.chargeCatalog.name}</div>
                          <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                            Module: {charge.sourceModule} | Date: {new Date(charge.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-100 font-mono">₹{Number(charge.totalAmount).toFixed(2)}</span>
                          <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                            ₹{Number(charge.rate).toFixed(0)} x {charge.quantity}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center p-6 text-zinc-550 font-mono text-xs">
                No outstanding pending charges found for this patient.
              </p>
            )}
          </div>
        )}

        {/* STEP 3: FINANCIAL LEDGER & DISCOUNTS */}
        {selectedPatient && selectedChargeIds.length > 0 && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center">
              <span>3. Financial Deductions & Credits Ledger</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Discount inputs */}
              <div className="space-y-4 border-r border-slate-850 pr-6">
                <h4 className="text-[11px] font-bold text-slate-200 flex items-center">
                  <DollarSign size={13} className="mr-1 text-emerald-400" />
                  <span>Authorized Discount (Optional)</span>
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400">Discount Amount (INR)</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register("discountAmount", { valueAsNumber: true })}
                      disabled={watchDiscountPercentage > 0}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono disabled:opacity-40"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400">Discount Percentage (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register("discountPercentage", { valueAsNumber: true })}
                      disabled={watchDiscountAmount > 0}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono disabled:opacity-40"
                    />
                  </div>
                </div>

                {hasDiscountApplied && (
                  <div className="space-y-1.5 pt-2 animate-in slide-in-from-top-1 duration-200">
                    <label className="text-[10px] font-semibold text-amber-400">Discount Reason Description *</label>
                    <textarea
                      {...register("discountReason")}
                      rows={2}
                      className="w-full bg-slate-950 border border-amber-900/50 hover:border-amber-800/80 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-100 text-xs rounded-xl p-2.5 outline-none placeholder-slate-655"
                      placeholder="Explain the approval parameters for applying this discount..."
                    />
                    {errors.discountReason && (
                      <p className="text-red-400 text-[10px]">{errors.discountReason.message}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Deposit availability details */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-bold text-slate-200 flex items-center">
                  <Info size={13} className="mr-1 text-emerald-400" />
                  <span>Credits Ledger Balance</span>
                </h4>
                
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-xs space-y-2.5 text-zinc-300">
                  <div className="flex justify-between">
                    <span className="text-zinc-550">Available Credits Balance:</span>
                    <span className="font-mono text-slate-200">₹{availableDeposits.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-850 pt-2 text-[11px]">
                    <span className="text-zinc-400">Credits Applied to Invoice:</span>
                    <span className="font-mono text-emerald-400">- ₹{appliedDepositDeduction.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-850 pt-2 text-[10px] text-zinc-550 italic">
                    <span>Remaining Patient Credits:</span>
                    <span className="font-mono">₹{Math.max(0, availableDeposits - appliedDepositDeduction).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculations Summary bar */}
            <div className="border-t border-slate-800 pt-5 mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-zinc-550">Gross Charges Total</span>
                <div className="text-base font-bold font-mono text-slate-200">₹{selectedChargesSum.toFixed(2)}</div>
              </div>
              <div className="space-y-1">
                <span className="text-zinc-550">Discount Applied</span>
                <div className="text-base font-bold font-mono text-red-400">- ₹{discountDeduction.toFixed(2)}</div>
              </div>
              <div className="space-y-1">
                <span className="text-zinc-550">Deposits Subtraction</span>
                <div className="text-base font-bold font-mono text-emerald-450">- ₹{appliedDepositDeduction.toFixed(2)}</div>
              </div>
              <div className="space-y-1 bg-emerald-950/15 border border-emerald-900/30 p-2.5 rounded-xl text-right">
                <span className="text-emerald-400 font-semibold block text-[10px]">Net Balance Due</span>
                <div className="text-lg font-bold font-mono text-emerald-300">₹{finalBalanceDue.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Triggers */}
        {selectedPatient && selectedChargeIds.length > 0 && (
          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={generating}
              className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium text-sm py-2.5 px-6 rounded-xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Patient Invoice...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Generate Invoice</span>
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
