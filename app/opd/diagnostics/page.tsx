"use client";

import React, { useEffect, useState, useMemo } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Search,
  Plus,
  Trash2,
  Stethoscope,
  DollarSign,
  Beaker,
  Layers,
  Save,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

type OPDEncounter = {
  id: string;
  opdId: string;
  tokenNumber: number;
  consultationDate: string;
  appliedFee: number;
  cancelledAt?: string | null;
  patient: {
    id: string;
    uhid: string;
    name: string;
    gender: string;
    dob: string;
    phone: string;
  };
  doctor: {
    id: string;
    employee: {
      designation: string;
      email: string;
    };
  };
  department: {
    id: string;
    name: string;
  };
};

type CatalogItem = {
  id: string;
  code: string;
  name: string;
  category: string;
  standardRate: number;
  department: "Laboratory" | "Radiology";
};

export default function BookDiagnosticsPage() {
  const [encounters, setEncounters] = useState<OPDEncounter[]>([]);
  const [loadingEncounters, setLoadingEncounters] = useState(true);

  // Selected patient details
  const [selectedEncounter, setSelectedEncounter] = useState<OPDEncounter | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");

  // Diagnostics catalogs
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [testSearchQuery, setTestSearchQuery] = useState("");
  const [selectedTestId, setSelectedTestId] = useState("");
  const [testDropdownOpen, setTestDropdownOpen] = useState(false);

  const [assignedTests, setAssignedTests] = useState<CatalogItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch today's OPD consultations
  const loadTodayOPD = async () => {
    setLoadingEncounters(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const url = `/api/opd?startDate=${todayStr}&endDate=${todayStr}&limit=100`;
      const res = await apiClient<{ encounters: OPDEncounter[] }>(url);
      
      // Only keep active (not cancelled) consultations
      const activeEncounters = (res.encounters || []).filter(e => !e.cancelledAt);
      setEncounters(activeEncounters);
    } catch {
      toast.error("Failed to load today's OPD consultations.");
    } finally {
      setLoadingEncounters(false);
    }
  };

  // Fetch lab & radiology catalogs
  const loadCatalogs = async () => {
    try {
      const res = await apiClient<{
        labCatalogs: { id: string; code: string; name: string; category: string; standardRate: number }[];
        radCatalogs: { id: string; code: string; name: string; category: string; standardRate: number }[];
      }>("/api/opd/catalogs");

      const mappedLabs: CatalogItem[] = (res.labCatalogs || []).map((item) => ({
        ...item,
        department: "Laboratory",
      }));
      const mappedRads: CatalogItem[] = (res.radCatalogs || []).map((item) => ({
        ...item,
        department: "Radiology",
      }));

      setCatalogs([...mappedLabs, ...mappedRads]);
    } catch {
      toast.error("Failed to load diagnostic test catalogs.");
    }
  };

  useEffect(() => {
    loadTodayOPD();
    loadCatalogs();
  }, []);

  // Filter consultations by name, UHID, or OPD ID
  const filteredEncounters = useMemo(() => {
    return encounters.filter((item) => {
      if (!patientSearchQuery.trim()) return true;
      const q = patientSearchQuery.toLowerCase().trim();
      return (
        item.patient.name.toLowerCase().includes(q) ||
        item.patient.uhid.toLowerCase().includes(q) ||
        item.opdId.toLowerCase().includes(q)
      );
    });
  }, [encounters, patientSearchQuery]);

  // Filter catalog items by search query
  const filteredCatalogs = useMemo(() => {
    return catalogs.filter((item) => {
      const alreadyAdded = assignedTests.some(t => t.id === item.id);
      if (alreadyAdded) return false;

      if (!testSearchQuery.trim()) return true;
      const q = testSearchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q)
      );
    });
  }, [catalogs, testSearchQuery, assignedTests]);

  // Add selected test to assigned list
  const handleAddTest = () => {
    if (!selectedTestId) return;
    const test = catalogs.find((t) => t.id === selectedTestId);
    if (test) {
      // Prevent duplicates
      if (assignedTests.some((t) => t.id === test.id)) {
        toast.warning("This diagnostic investigation is already added.");
        return;
      }
      setAssignedTests([...assignedTests, test]);
      setSelectedTestId("");
      setTestSearchQuery("");
    }
  };

  // Remove test from assigned list
  const handleRemoveTest = (id: string) => {
    setAssignedTests(assignedTests.filter((t) => t.id !== id));
  };

  // Calculate total price of assigned tests
  const totalTestsPrice = useMemo(() => {
    return assignedTests.reduce((sum, item) => sum + Number(item.standardRate), 0);
  }, [assignedTests]);

  // Submit test booking
  const handleBookDiagnostics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEncounter) {
      toast.error("Please select a patient first.");
      return;
    }
    if (assignedTests.length === 0) {
      toast.error("Please assign at least one diagnostic test.");
      return;
    }

    setSaving(true);
    try {
      const labIds = assignedTests.filter(t => t.department === "Laboratory").map(t => t.id);
      const radIds = assignedTests.filter(t => t.department === "Radiology").map(t => t.id);

      await apiClient("/api/opd/diagnostics", {
        method: "POST",
        body: JSON.stringify({
          opdConsultationId: selectedEncounter.id,
          labTestCatalogIds: labIds,
          radiologyScanCatalogIds: radIds,
        }),
      });

      toast.success(`Successfully cut ${assignedTests.length} tests for patient ${selectedEncounter.patient.name}.`);
      setSuccessMsg(`Successfully booked and cut ${assignedTests.length} diagnostic tests for patient ${selectedEncounter.patient.name}. The charges have been posted to the patient's billing file.`);
      setAssignedTests([]);
      setSelectedEncounter(null);
      setPatientSearchQuery("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to book diagnostics.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header */}
      <div className="flex items-center space-x-3 border-b border-slate-800 pb-5">
        <Link
          href="/opd"
          className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center">
            <Beaker size={20} className="mr-2 text-emerald-450" />
            <span>Diagnostics Booking (&quot;Cut Tests&quot;)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Select a patient from today&apos;s consultations and book diagnostic investigations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Select Patient from Today's OPD */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4 backdrop-blur-sm shadow-lg h-[70vh] flex flex-col">
            <h3 className="text-xs font-bold text-emerald-450 uppercase flex items-center space-x-2 border-b border-slate-800 pb-2">
              <Stethoscope size={14} />
              <span>1. Select Today&apos;s Registered Patient</span>
            </h3>

            <div className="relative">
              <Search className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 h-full" size={14} />
              <input
                type="text"
                value={patientSearchQuery}
                onChange={(e) => setPatientSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none transition-all placeholder-slate-655"
                placeholder="Search by name, UHID, or OPD ID..."
              />
            </div>

            {loadingEncounters ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-550 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                <span className="text-[11px] font-mono">Syncing today&apos;s consultations...</span>
              </div>
            ) : filteredEncounters.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-650 italic text-xs border border-dashed border-slate-850 rounded-xl">
                No active OPD registrations found.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-850/40">
                {filteredEncounters.map((item) => {
                  const isSelected = selectedEncounter?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedEncounter(item);
                        setAssignedTests([]);
                      }}
                      className={`p-3 rounded-xl cursor-pointer transition-all border text-xs flex justify-between items-center ${
                        isSelected
                          ? "bg-emerald-950/20 border-emerald-550/40 text-emerald-300 shadow-md shadow-emerald-955/10"
                          : "bg-slate-950/40 hover:bg-slate-950/70 border-slate-850/80 text-zinc-300"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-semibold flex items-center space-x-1.5">
                          <span className={isSelected ? "text-slate-100 font-bold" : "text-slate-200"}>{item.patient.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">({item.patient.gender})</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          OPD: {item.opdId} | UHID: {item.patient.uhid}
                        </p>
                        <p className="text-[10px] text-zinc-450 italic">
                          Consulting: {item.doctor.employee.email}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="bg-slate-900 border border-slate-800 text-emerald-450 font-bold px-2 py-0.5 rounded text-[9px] font-mono">
                          Token {item.tokenNumber}
                        </span>
                        {isSelected && <CheckCircle size={14} className="text-emerald-400 mt-2 animate-bounce" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Search and assign tests */}
        <div className="lg:col-span-7 space-y-4">
          <form onSubmit={handleBookDiagnostics} className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-6 backdrop-blur-sm shadow-lg h-[70vh] flex flex-col justify-between">
            
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              <h3 className="text-xs font-bold text-emerald-450 uppercase flex items-center space-x-2 border-b border-slate-800 pb-2">
                <Layers size={14} />
                <span>2. Select Diagnostics to Cut</span>
              </h3>

              {!selectedEncounter ? (
                <div className="h-48 flex items-center justify-center text-zinc-550 italic text-xs border border-dashed border-slate-850 rounded-xl">
                  Please select a patient from the today&apos;s registered list on the left first.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Select patient overview */}
                  <div className="bg-emerald-950/10 border border-emerald-900/30 p-3.5 rounded-xl text-xs flex justify-between items-center text-zinc-300">
                    <div>
                      <p className="font-bold text-slate-100">{selectedEncounter.patient.name}</p>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        UHID: {selectedEncounter.patient.uhid} | Phone: {selectedEncounter.patient.phone}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 font-mono block">Encounter Ref</span>
                      <span className="font-bold font-mono text-emerald-450">{selectedEncounter.opdId}</span>
                    </div>
                  </div>

                  {/* Floating dropdown test search select */}
                  <div className="relative bg-slate-950 border border-slate-850 p-4 rounded-xl">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase">Search & Add Investigations</label>
                    <div className="relative mt-1">
                      <Search className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 h-full" size={14} />
                      <input
                        type="text"
                        value={testSearchQuery}
                        onChange={(e) => {
                          setTestSearchQuery(e.target.value);
                          setTestDropdownOpen(true);
                        }}
                        onFocus={() => setTestDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setTestDropdownOpen(false), 200)}
                        className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-slate-100 text-xs rounded-xl pl-9 pr-4 py-2 outline-none transition-all placeholder-slate-655"
                        placeholder="Type to search diagnostic tests (e.g. Hemoglobin, X-Ray, CBC)..."
                      />
                    </div>

                    {testDropdownOpen && testSearchQuery.trim().length > 0 && (
                      <div className="absolute left-4 right-4 z-20 mt-1 max-h-60 overflow-y-auto border border-slate-800 bg-slate-950 rounded-xl divide-y divide-slate-850 shadow-2xl">
                        {filteredCatalogs
                          .filter((item) => !assignedTests.some((t) => t.id === item.id))
                          .map((item) => (
                            <div
                              key={item.id}
                              onClick={() => {
                                setAssignedTests((prev) => [...prev, item]);
                                setTestSearchQuery("");
                                setTestDropdownOpen(false);
                              }}
                              className="flex justify-between items-center p-3 text-xs text-slate-300 hover:bg-slate-900 cursor-pointer transition-colors"
                            >
                              <div>
                                <span className="font-semibold text-slate-200">{item.name}</span>
                                <span className="text-[9px] block text-zinc-500 font-mono">Code: {item.code} | Dept: {item.department}</span>
                              </div>
                              <span className="font-mono text-emerald-450 font-bold">₹{Number(item.standardRate).toFixed(2)}</span>
                            </div>
                          ))}
                        {filteredCatalogs.filter((item) => !assignedTests.some((t) => t.id === item.id)).length === 0 && (
                          <p className="text-center text-xs text-zinc-550 py-3 italic">No matching tests found.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Table showing selected tests */}
                  {assignedTests.length > 0 && (
                    <div className="border border-slate-850 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-950 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-850 pb-1">
                            <th className="py-2.5 px-3">Test Name</th>
                            <th className="py-2.5 px-3">Dept</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3 text-right">Price</th>
                            <th className="py-2.5 px-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850/50 text-slate-300 bg-slate-950/20">
                          {assignedTests.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-950/40">
                              <td className="py-2 px-3 font-semibold text-slate-200">{t.name}</td>
                              <td className="py-2 px-3 text-zinc-400 font-mono text-[10px]">{t.department}</td>
                              <td className="py-2 px-3 text-zinc-550">{t.category}</td>
                              <td className="py-2 px-3 text-right font-mono text-emerald-450 font-bold">₹{Number(t.standardRate).toFixed(2)}</td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTest(t.id)}
                                  className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-slate-900 cursor-pointer"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Submit Action */}
            {selectedEncounter && assignedTests.length > 0 && (
              <div className="flex items-center justify-between border-t border-slate-800 pt-4 bg-slate-950/20 -mx-6 -mb-6 p-4 rounded-b-2xl">
                <div className="flex items-center space-x-1">
                  <DollarSign size={14} className="text-emerald-450" />
                  <span className="text-xs text-slate-400">Total Price:</span>
                  <span className="font-bold text-sm text-slate-100 font-mono ml-1">₹{totalTestsPrice.toFixed(2)}</span>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-xs py-2 px-5 rounded-xl shadow-lg cursor-pointer transition-all active:scale-[0.98]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Orders...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Book & Cut Tests ({assignedTests.length})</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
      {saving && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col items-center space-y-4 shadow-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-xs font-mono text-slate-350">Finalizing test bookings & ledger charges, please wait...</p>
          </div>
        </div>
      )}
      {successMsg && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="mx-auto w-12 h-12 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-100">
              Diagnostic Tests Cut!
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {successMsg}
            </p>
            <button
              onClick={() => setSuccessMsg(null)}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
