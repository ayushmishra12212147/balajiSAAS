"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  BarChart2,
  Calendar,
  Download,
  Printer,
  RefreshCw,
  User,
  Building,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Coins,
  ShieldAlert,
  Stethoscope,
  BedDouble,
  Receipt,
  Scissors,
  Baby,
  Skull,
  TrendingUp,
  Users,
  UserCheck,
  Filter,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────── */

type ReportTab =
  | "opd"
  | "doctor-opd"
  | "department-opd"
  | "ipd"
  | "billing"
  | "ot"
  | "birth"
  | "death"
  | "collection";

interface DoctorMetadata {
  id: string;
  employee: { name: string; designation: string };
}
interface DepartmentMetadata {
  id: string;
  name: string;
}
interface CollectionItem {
  id: string;
  invoiceNumber: string;
  patientName: string;
  amount: number;
  paymentMode: string;
  date: string;
}
interface ReportRow {
  id?: string;
  [key: string]: unknown;
}

/* ─── Tab Definitions ────────────────────────────────────────────── */

const REPORT_TABS: {
  id: ReportTab;
  label: string;
  shortLabel: string;
  desc: string;
  icon: React.ElementType;
  color: string;
}[] = [
  {
    id: "opd",
    label: "Daily OPD Report",
    shortLabel: "OPD",
    desc: "Outpatient registrations with gender & new/old filters",
    icon: Stethoscope,
    color: "text-emerald-400",
  },
  {
    id: "doctor-opd",
    label: "Doctor Wise OPD",
    shortLabel: "Doctor OPD",
    desc: "OPD grouped by doctor",
    icon: UserCheck,
    color: "text-cyan-400",
  },
  {
    id: "department-opd",
    label: "Department Wise OPD",
    shortLabel: "Dept OPD",
    desc: "OPD grouped by department",
    icon: Building,
    color: "text-blue-400",
  },
  {
    id: "ipd",
    label: "IPD Admissions",
    shortLabel: "IPD",
    desc: "Admissions, discharges & active patients",
    icon: BedDouble,
    color: "text-violet-400",
  },
  {
    id: "billing",
    label: "Billing Report",
    shortLabel: "Billing",
    desc: "Invoices, collections & outstanding",
    icon: Receipt,
    color: "text-amber-400",
  },
  {
    id: "ot",
    label: "OT / Surgery Report",
    shortLabel: "OT",
    desc: "Operation theater surgeries",
    icon: Scissors,
    color: "text-rose-400",
  },
  {
    id: "birth",
    label: "Birth Registrations",
    shortLabel: "Births",
    desc: "Newborn birth certificates",
    icon: Baby,
    color: "text-pink-400",
  },
  {
    id: "death",
    label: "Death Registrations",
    shortLabel: "Deaths",
    desc: "Death certificate records",
    icon: Skull,
    color: "text-slate-400",
  },
  {
    id: "collection",
    label: "Collection Summary",
    shortLabel: "Collection",
    desc: "Hospital billing collections",
    icon: TrendingUp,
    color: "text-green-400",
  },
];

/* ─── Helper: Currency Format ────────────────────────────────────── */
const formatINR = (v: number) =>
  `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatHeader = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .replace("Uhid", "UHID")
    .replace("Ipd Id", "IPD ID")
    .replace("Opd Id", "OPD ID")
    .replace("Ot Id", "OT ID");

/* ─── Main Component ─────────────────────────────────────────────── */

export default function ReportsDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = (searchParams.get("tab") || "opd") as ReportTab;

  /* Shared Filters */
  const [startDate, setStartDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  /* OPD-specific client-side filters */
  const [genderFilter, setGenderFilter] = useState<"" | "MALE" | "FEMALE" | "OTHER">("");
  const [patientTypeFilter, setPatientTypeFilter] = useState<"" | "NEW" | "OLD">("");

  /* Metadata */
  const [doctors, setDoctors] = useState<DoctorMetadata[]>([]);
  const [departments, setDepartments] = useState<DepartmentMetadata[]>([]);

  /* Data */
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [reportData, setReportData] = useState<{
    rows?: ReportRow[];
    summary?: Record<string, string | number>;
    pagination?: { currentPage: number; totalPages: number; totalRows: number };
    hospitalCollection?: CollectionItem[];
    pharmacyCollection?: CollectionItem[];
  }>({});

  /* Load dropdowns */
  useEffect(() => {
    async function loadMeta() {
      try {
        const [docs, depts] = await Promise.all([
          apiClient<DoctorMetadata[]>("/api/admin/doctors"),
          apiClient<DepartmentMetadata[]>("/api/admin/departments"),
        ]);
        setDoctors(docs || []);
        setDepartments(depts || []);
      } catch {/* noop */}
    }
    loadMeta();
  }, []);

  /* Fetch Report */
  const fetchReport = useCallback(
    async (pageToFetch = 1) => {
      setLoading(true);
      setErrorMsg("");
      try {
        let url = `/api/reports/${activeTab}?startDate=${startDate}T00:00:00.000Z&endDate=${endDate}T23:59:59.999Z&page=${pageToFetch}&limit=50`;
        if (selectedDoctorId) url += `&doctorId=${selectedDoctorId}`;
        if (selectedDeptId) url += `&departmentId=${selectedDeptId}`;
        if (selectedStatus) url += `&status=${selectedStatus}`;

        const res = await apiClient<typeof reportData>(url);
        setReportData(res);
        setCurrentPage(pageToFetch);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load report.";
        setErrorMsg(msg);
        setReportData({});
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab, startDate, endDate, selectedDoctorId, selectedDeptId, selectedStatus]
  );

  /* Reset on tab change */
  useEffect(() => {
    setSelectedDoctorId("");
    setSelectedDeptId("");
    setSelectedStatus("");
    setGenderFilter("");
    setPatientTypeFilter("");
    setErrorMsg("");
    setReportData({});
    fetchReport(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  /* Client-side filtered rows for OPD */
  const filteredRows = useMemo(() => {
    if (activeTab !== "opd" || !reportData.rows) return reportData.rows || [];
    let rows = [...reportData.rows];
    if (genderFilter) {
      rows = rows.filter((r) => String(r.patientGender ?? "").toUpperCase() === genderFilter);
    }
    if (patientTypeFilter) {
      rows = rows.filter((r) =>
        patientTypeFilter === "NEW"
          ? r.isNew === true || r.patientType === "NEW"
          : r.isNew === false || r.patientType === "OLD"
      );
    }
    return rows;
  }, [reportData.rows, activeTab, genderFilter, patientTypeFilter]);

  /* Export */
  const handleExport = () => {
    let url = `/api/reports/${activeTab}?export=csv&startDate=${startDate}T00:00:00.000Z&endDate=${endDate}T23:59:59.999Z`;
    if (selectedDoctorId) url += `&doctorId=${selectedDoctorId}`;
    if (selectedDeptId) url += `&departmentId=${selectedDeptId}`;
    if (selectedStatus) url += `&status=${selectedStatus}`;
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.click();
    toast.success("CSV export triggered.");
  };

  /* Print */
  const handlePrint = async () => {
    try {
      let url = `/api/reports/${activeTab}?print=true&startDate=${startDate}T00:00:00.000Z&endDate=${endDate}T23:59:59.999Z`;
      if (selectedDoctorId) url += `&doctorId=${selectedDoctorId}`;
      if (selectedDeptId) url += `&departmentId=${selectedDeptId}`;
      if (selectedStatus) url += `&status=${selectedStatus}`;
      const printData = await apiClient<Record<string, unknown>>(url);
      const printResult = await apiClient<{ renderedPayload: string }>("/api/print", {
        method: "POST",
        body: JSON.stringify({ templateId: "report-summary", printData, options: { format: "A4" } }),
      });
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(printResult.renderedPayload);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 100);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Print failed.");
    }
  };

  /* Derived */
  const tabDef = REPORT_TABS.find((t) => t.id === activeTab)!;
  const showDoctorFilter = ["opd", "doctor-opd", "ipd", "ot"].includes(activeTab);
  const showDeptFilter = ["opd", "doctor-opd", "department-opd", "ipd", "ot"].includes(activeTab);
  const showStatusFilter = activeTab === "billing";
  const showOPDQuickFilters = activeTab === "opd";
  const hasRows = (filteredRows.length > 0) || (reportData.hospitalCollection?.length ?? 0) > 0;

  /* ── Render ── */
  return (
    <div className="flex h-full w-full gap-0 overflow-hidden">

      {/* ── LEFT SIDEBAR ───────────────────────────────────────── */}
      <aside className="w-56 border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto select-none bg-slate-950/30">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900/40">
          <BarChart2 className="text-emerald-400 w-4 h-4 shrink-0" />
          <span className="text-xs font-bold text-slate-100 uppercase tracking-widest">Reports</span>
        </div>

        <nav className="flex-1 py-2 space-y-0.5 px-2">
          {REPORT_TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => router.push(`/reports?tab=${tab.id}`)}
                className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-150 group cursor-pointer ${
                  active
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "hover:bg-slate-800/50 border border-transparent"
                }`}
              >
                <tab.icon
                  size={14}
                  className={`shrink-0 ${active ? tab.color : "text-slate-500 group-hover:text-slate-300"}`}
                />
                <div className="min-w-0">
                  <div className={`text-xs font-semibold truncate ${active ? "text-slate-100" : "text-slate-400 group-hover:text-slate-200"}`}>
                    {tab.shortLabel}
                  </div>
                </div>
                {active && (
                  <div className={`ml-auto w-1.5 h-1.5 rounded-full ${tab.color.replace("text-", "bg-")} shrink-0`} />
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── MAIN CONTENT ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Top Bar: Title + Actions ── */}
        <div className="border-b border-slate-800 bg-slate-900/30 px-6 py-3 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            {tabDef && <tabDef.icon size={18} className={tabDef.color} />}
            <div>
              <h1 className="text-sm font-bold text-slate-100">{tabDef?.label}</h1>
              <p className="text-[10px] text-slate-500">{tabDef?.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              disabled={loading || !hasRows}
              className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:border-slate-600 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer size={12} /> Print
            </button>
            <button
              onClick={handleExport}
              disabled={loading || !hasRows}
              className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:border-slate-600 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={12} /> CSV
            </button>
          </div>
        </div>

        {/* ── Filters Panel ── */}
        <div className="border-b border-slate-800 bg-slate-900/20 px-6 py-3 shrink-0">
          <div className="flex flex-wrap items-end gap-3">

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <Calendar size={9} className="text-emerald-400" /> From
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-600 text-slate-100 text-xs rounded-lg px-3 py-2 outline-none transition-all font-mono w-36"
                />
              </div>
              <div className="mt-5 text-slate-600 text-xs">→</div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <Calendar size={9} className="text-emerald-400" /> To
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-600 text-slate-100 text-xs rounded-lg px-3 py-2 outline-none transition-all font-mono w-36"
                />
              </div>
            </div>

            {/* Doctor */}
            {showDoctorFilter && (
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <User size={9} className="text-emerald-400" /> Doctor
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-600 text-slate-100 text-xs rounded-lg px-3 py-2 outline-none transition-all w-40"
                >
                  <option value="">All Doctors</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.employee?.name || d.employee?.designation}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Department */}
            {showDeptFilter && (
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <Building size={9} className="text-emerald-400" /> Dept
                </label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-600 text-slate-100 text-xs rounded-lg px-3 py-2 outline-none transition-all w-40"
                >
                  <option value="">All Depts</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Billing Status */}
            {showStatusFilter && (
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-600 text-slate-100 text-xs rounded-lg px-3 py-2 outline-none transition-all w-40"
                >
                  <option value="">All Statuses</option>
                  <option value="PAID">Paid</option>
                  <option value="PENDING">Pending</option>
                  <option value="PARTIALLY_PAID">Partially Paid</option>
                </select>
              </div>
            )}

            {/* Fetch Button */}
            <button
              onClick={() => fetchReport(1)}
              disabled={loading}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 px-4 rounded-lg cursor-pointer transition-all active:scale-95 disabled:opacity-50 mt-5"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Run Report
            </button>
          </div>

          {/* OPD Quick Filters: Gender + New/Old */}
          {showOPDQuickFilters && (
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
                <Filter size={9} /> Quick Filters:
              </div>

              {/* Gender Toggles */}
              <div className="flex items-center gap-1">
                {(["", "MALE", "FEMALE", "OTHER"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGenderFilter(g)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold border cursor-pointer transition-all ${
                      genderFilter === g
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                        : "bg-transparent border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {g === "" ? "All Gender" : g === "MALE" ? "♂ Male" : g === "FEMALE" ? "♀ Female" : "⚧ Other"}
                  </button>
                ))}
              </div>

              <div className="w-px h-4 bg-slate-700" />

              {/* New / Old Patient Toggles */}
              <div className="flex items-center gap-1">
                {(["", "NEW", "OLD"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPatientTypeFilter(p)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold border cursor-pointer transition-all ${
                      patientTypeFilter === p
                        ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                        : "bg-transparent border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {p === "" ? "All Patients" : p === "NEW" ? "🆕 New" : "🔄 Old / Return"}
                  </button>
                ))}
              </div>

              {(genderFilter || patientTypeFilter) && (
                <button
                  onClick={() => { setGenderFilter(""); setPatientTypeFilter(""); }}
                  className="text-[10px] text-red-400 hover:text-red-300 font-bold cursor-pointer transition-colors"
                >
                  ✕ Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Scrollable Results ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Error State */}
          {errorMsg && (
            <div className="p-5 border border-red-500/20 bg-red-500/5 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="text-red-500 shrink-0 w-5 h-5 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-red-400">Report Error</h3>
                <p className="text-xs text-slate-400 mt-1">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Summary KPI Cards */}
          {reportData.summary && !errorMsg && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(reportData.summary).map(([k, v]) => {
                const isAmount =
                  typeof v === "number" &&
                  (k.toLowerCase().includes("amount") ||
                    k.toLowerCase().includes("total") ||
                    k.toLowerCase().includes("collection") ||
                    k.toLowerCase().includes("outstanding") ||
                    k.toLowerCase().includes("discount"));
                const displayVal = isAmount ? formatINR(Number(v)) : String(v);
                return (
                  <div
                    key={k}
                    className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex items-start justify-between gap-2"
                  >
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                        {formatHeader(k)}
                      </div>
                      <div className="text-xl font-black text-slate-100 font-mono leading-none">
                        {displayVal}
                      </div>
                    </div>
                    <Coins className="text-emerald-500/40 w-5 h-5 shrink-0 mt-1" />
                  </div>
                );
              })}

              {/* OPD: extra client-side filter count */}
              {activeTab === "opd" && (genderFilter || patientTypeFilter) && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-2">
                  <Users size={16} className="text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wide mb-1">
                      Filtered Count
                    </div>
                    <div className="text-xl font-black text-slate-100 font-mono">
                      {filteredRows.length}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs font-mono gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <span>Fetching report data...</span>
            </div>
          )}

          {/* Collection Report: two-table layout */}
          {!loading && !errorMsg && activeTab === "collection" && (
            <div className="space-y-5">
              {[
                { title: "Hospital Billing Collections", accent: "emerald", rows: reportData.hospitalCollection },
                { title: "Pharmacy Sales Collections", accent: "blue", rows: reportData.pharmacyCollection },
              ].map(({ title, accent, rows }) => (
                <div key={title} className="space-y-2">
                  <div className={`text-xs font-bold text-slate-300 border-l-2 border-${accent}-500 pl-2`}>
                    {title}
                  </div>
                  <ReportTable
                    headers={["Invoice Number", "Patient / Customer", "Amount Paid", "Payment Mode", "Date"]}
                    rows={rows?.map((r) => [
                      r.invoiceNumber,
                      r.patientName,
                      formatINR(Number(r.amount)),
                      r.paymentMode,
                      new Date(r.date).toLocaleString("en-IN"),
                    ]) || []}
                    emptyMsg={`No ${title.toLowerCase()} in date range.`}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Generic Paginated Table */}
          {!loading && !errorMsg && activeTab !== "collection" && (
            <div className="space-y-4">
              <GenericTable rows={filteredRows} />

              {/* Pagination */}
              {reportData.pagination && reportData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <div className="text-xs text-slate-400">
                    Page{" "}
                    <span className="text-slate-200 font-bold">{currentPage}</span>
                    {" "}of{" "}
                    <span className="text-slate-200 font-bold">{reportData.pagination.totalPages}</span>
                    {" "}·{" "}
                    <span className="text-emerald-400 font-bold">{reportData.pagination.totalRows}</span>
                    {" "}total rows
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => fetchReport(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="p-2 border border-slate-800 hover:border-slate-600 bg-slate-900 text-slate-400 hover:text-white rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <span className="px-3 py-1 text-xs font-mono text-slate-300 bg-slate-900 border border-slate-800 rounded-lg">
                      {currentPage}
                    </span>
                    <button
                      onClick={() => fetchReport(currentPage + 1)}
                      disabled={currentPage >= reportData.pagination.totalPages}
                      className="p-2 border border-slate-800 hover:border-slate-600 bg-slate-900 text-slate-400 hover:text-white rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ─── Generic Paginated Table ────────────────────────────────────── */
function GenericTable({ rows }: { rows: ReportRow[] }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="border border-slate-800 rounded-2xl p-16 text-center text-slate-500 text-xs font-mono">
        No records matching the selected filters.
      </div>
    );
  }

  const headers = Object.keys(rows[0]).filter((k) => k !== "id");

  return (
    <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/40">
              {headers.map((h) => (
                <th key={h} className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  {formatHeader(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.map((row, idx) => (
              <tr key={String(row.id ?? idx)} className="hover:bg-slate-800/30 transition-colors">
                {headers.map((key, ci) => {
                  const val = row[key];
                  let text = String(val !== null && val !== undefined ? val : "—");
                  if (
                    typeof val === "string" &&
                    val.includes("T") &&
                    !isNaN(Date.parse(val))
                  ) {
                    text =
                      new Date(val).toLocaleDateString("en-IN") +
                      " " +
                      new Date(val).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                  }
                  if (
                    typeof val === "number" &&
                    (key.includes("fee") || key.includes("amount") || key.includes("Amount") ||
                      key.includes("Fee") || key.includes("paid") || key.includes("balance") ||
                      key.includes("discount") || key.includes("collection"))
                  ) {
                    text = `₹${val.toFixed(2)}`;
                  }
                  const isMono =
                    key.toLowerCase().includes("id") ||
                    key.toLowerCase().includes("uhid") ||
                    key.toLowerCase().includes("date") ||
                    key.toLowerCase().includes("time");

                  return (
                    <td key={ci} className={`px-4 py-3 text-slate-300 whitespace-nowrap ${isMono ? "font-mono text-slate-400" : ""}`}>
                      {text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Static Table (for collection report) ───────────────────────── */
function ReportTable({
  headers,
  rows,
  emptyMsg,
}: {
  headers: string[];
  rows: string[][];
  emptyMsg: string;
}) {
  return (
    <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/40">
              {headers.map((h) => (
                <th key={h} className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="text-center p-10 text-slate-500 font-mono text-xs">
                  {emptyMsg}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
