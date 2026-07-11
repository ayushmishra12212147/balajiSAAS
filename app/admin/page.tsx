"use client";

import React, { useState, useEffect } from "react";
import { HospitalProfile } from "@/modules/admin/components/hospital-profile";
import { EmployeeDirectory } from "@/modules/admin/components/employee-directory";
import { DepartmentRegistry } from "@/modules/admin/components/department-registry";
import { DoctorDirectory } from "@/modules/admin/components/doctor-directory";
import { SystemConfig } from "@/modules/admin/components/system-config";
import WardBedManager from "@/modules/admin/components/ward-bed-manager";
import { ChargeCatalogRegistry } from "@/modules/admin/components/charge-catalog-registry";
import { Building2, Users, FolderTree, Stethoscope, Settings, Bed, DollarSign } from "lucide-react";

type TabIdType = "hospital" | "employees" | "departments" | "doctors" | "wards" | "charges" | "settings";

/**
 * AdminPage Component
 * Core entry point for Shreeganesha management dashboards.
 * Renders tab workspaces anchored beneath the primary menu header.
 */
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabIdType>("hospital");

  const tabs = [
    { id: "hospital" as const, label: "Hospital Profile", icon: Building2, component: HospitalProfile },
    { id: "employees" as const, label: "Employees Directory", icon: Users, component: EmployeeDirectory },
    { id: "departments" as const, label: "Departments Registry", icon: FolderTree, component: DepartmentRegistry },
    { id: "doctors" as const, label: "Doctors Registry", icon: Stethoscope, component: DoctorDirectory },
    { id: "wards" as const, label: "Ward & Bed Setup", icon: Bed, component: WardBedManager },
    { id: "charges" as const, label: "Charge Setup", icon: DollarSign, component: ChargeCatalogRegistry },
    { id: "settings" as const, label: "System Config", icon: Settings, component: SystemConfig },
  ];

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") as TabIdType;
      if (tab && tabs.some((t) => t.id === tab)) {
        setActiveTab(tab);
      }
    }
  }, []);

  const handleTabChange = (id: TabIdType) => {
    setActiveTab(id);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", id);
      window.history.pushState({}, "", url.toString());
    }
  };

  const ActiveComponent = tabs.find((t) => t.id === activeTab)?.component || HospitalProfile;

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      {/* Sub Horizontal Navigation Tabs Bar */}
      <div className="flex items-center space-x-1 border-b border-slate-800 pb-2 select-none overflow-x-auto scrollbar-none shrink-0 z-10">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isActive
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Selection Tab Workspace */}
      <div className="flex-1 w-full overflow-auto">
        <ActiveComponent />
      </div>
    </div>
  );
}
