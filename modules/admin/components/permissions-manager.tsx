"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { ShieldCheck, ArrowLeft, Save, Loader2 } from "lucide-react";

interface PermissionsManagerProps {
  employeeId: string;
  employeeEmail: string;
  employeeCode: string;
  onBack: () => void;
}

interface PermissionRow {
  module: string;
  action: string;
  isAllowed: boolean;
}

const MASTER_PERMISSIONS = [
  {
    module: "Patient",
    label: "Patient Management",
    actions: ["View", "Create", "Edit", "Delete", "Print"],
  },
  {
    module: "OPD",
    label: "Outpatient Department (OPD)",
    actions: ["View", "Register", "Edit", "Cancel", "Print"],
  },
  {
    module: "IPD",
    label: "Inpatient Department (IPD)",
    actions: ["View", "Admit", "Discharge", "Transfer Bed", "Assign Charges", "Reassign Doctor", "Register Birth", "Register Death", "Print"],
  },
  {
    module: "Billing",
    label: "Financial & Billing",
    actions: ["View", "Receive Payment", "Refund", "Cancel Invoice", "Apply Discount", "Generate Invoice", "Print"],
  },
  {
    module: "Laboratory",
    label: "Diagnostics & Laboratory",
    actions: ["View", "Schedule", "Complete", "Print"],
  },
  {
    module: "Radiology",
    label: "Diagnostics & Radiology",
    actions: ["View", "Enter Report", "Edit Report", "Cancel", "Print"],
  },
  {
    module: "OT",
    label: "Surgical Operation Theater",
    actions: ["View", "Schedule", "Complete", "Print", "Assign Charges", "Register", "Close Operation"],
  },
  {
    module: "Pharmacy",
    label: "Pharmacy & Inventory",
    actions: ["View", "Purchase", "Sell", "Stock Adjustment", "Return", "Print"],
  },
  {
    module: "Reports",
    label: "Reports & Analytics",
    actions: ["View", "Export", "Print"],
  },
  {
    module: "Admin",
    label: "System Administration",
    actions: ["ManageHospital", "ManageUsers", "ManagePermissions", "ManageSettings", "ManageTemplates", "PublishTemplate", "ManageNumbering", "Backup", "Restore", "ViewAudit", "Maintenance", "License", "Sessions"],
  },
];

/**
 * PermissionsManager Component
 * Renders a checklist matrix to configure permission overrides for a staff member.
 */
export function PermissionsManager({
  employeeId,
  employeeEmail,
  employeeCode,
  onBack,
}: PermissionsManagerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadPermissions() {
      try {
        const data = await apiClient<PermissionRow[]>(
          `/api/admin/employees/${employeeId}/permissions`
        );
        
        // Translate array to key-value maps: "module:action" -> isAllowed
        const initialMap: Record<string, boolean> = {};
        data.forEach((p) => {
          if (p.isAllowed) {
            initialMap[`${p.module}:${p.action}`] = true;
          }
        });
        setState(initialMap);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load permissions.";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }
    loadPermissions();
  }, [employeeId]);

  const handleToggle = (module: string, action: string) => {
    const key = `${module}:${action}`;
    setState((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    
    // Construct flat array of updates for every toggle mapping
    const payload: PermissionRow[] = [];
    MASTER_PERMISSIONS.forEach((group) => {
      group.actions.forEach((act) => {
        const key = `${group.module}:${act}`;
        payload.push({
          module: group.module,
          action: act,
          isAllowed: !!state[key],
        });
      });
    });

    try {
      await apiClient(`/api/admin/employees/${employeeId}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permissions: payload }),
      });
      toast.success("Permission rules updated successfully.");
      onBack();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save permissions.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-400 text-sm font-mono">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-3" />
        <span>Loading Permissions Matrix...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Back Link */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/20 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck size={18} className="text-emerald-400" />
              <h2 className="text-base font-bold text-slate-100">Configure Staff Permissions</h2>
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Editing permissions for: <strong className="text-zinc-200">{employeeEmail}</strong> ({employeeCode})
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium text-xs py-2.5 px-4 rounded-xl shadow-lg active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 shrink-0"
        >
          {saving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving overrides...</span>
            </>
          ) : (
            <>
              <Save size={14} />
              <span>Save Permissions Override</span>
            </>
          )}
        </button>
      </div>

      {/* Grid of Permissions groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {MASTER_PERMISSIONS.map((group) => (
          <div
            key={group.module}
            className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl flex flex-col justify-between"
          >
            <div>
              <h3 className="text-xs font-bold text-slate-200 border-b border-slate-800/80 pb-2.5 mb-4">
                {group.label} ({group.module})
              </h3>
              <div className="space-y-3">
                {group.actions.map((action) => {
                  const key = `${group.module}:${action}`;
                  const isChecked = !!state[key];

                  return (
                    <div
                      key={action}
                      onClick={() => handleToggle(group.module, action)}
                      className="flex items-center justify-between p-2 hover:bg-slate-800/20 rounded-xl cursor-pointer select-none transition-colors border border-transparent hover:border-slate-800"
                    >
                      <span className="text-xs text-zinc-300 font-mono">{action}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by click wrapper on row
                        className="w-4 h-4 rounded border-slate-800 text-emerald-500 focus:ring-emerald-500 bg-slate-950"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default PermissionsManager;
