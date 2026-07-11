"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { 
  Building2, 
  Stethoscope, 
  BedDouble, 
  Receipt, 
  Scissors, 
  Settings, 
  ShieldAlert, 
  LogOut,
  ChevronDown,
  BarChart3,
  RefreshCw,
  Loader2
} from "lucide-react";
import { useAuthStore } from "@/modules/auth/hooks/use-auth-store";
import { AuthClient } from "@/lib/auth-client";

/**
 * HeaderMenuBar Component
 * Provides horizontal layout menu structure.
 * Reads user data from useAuthStore and manages logout callbacks.
 */
export default function HeaderMenuBar() {
  const { user } = useAuthStore();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Hide navigation loader when path or params resolve
    setNavigating(false);
  }, [pathname, searchParams]);

  const handleMouseEnter = (menuLabel: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setActiveMenu(menuLabel);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 200); // 200ms delay ensures fluid mouse transitions without accidental closures
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await AuthClient.logout();
      window.location.href = "/login";
    } catch {
      // Direct failover fallback redirect
      window.location.href = "/login";
    }
  };

  const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.role === "HOSPITAL_ADMIN";

  const allMenuItems = [
    { label: "OPD", icon: Stethoscope, items: ["Register Patient", "Patient List", "OPD Queue", "Today's OPD", "Search OPD"] },
    { label: "IPD", icon: BedDouble, items: ["Admission", "Active Patients", "Birth & Death Registration", "Discharge Patient", "Search IPD"] },
    { label: "OT", icon: Scissors, items: ["Schedule Surgery", "Post-Op Records"] },
    { label: "Billing", icon: Receipt, items: ["New Invoice", "Payments", "Refund Claims"] },
    { label: "Reports", icon: BarChart3, items: ["OPD", "IPD", "Billing", "OT", "Birth", "Death", "Collection"] },
    { label: "Manage", icon: Settings, items: ["Profile", "Change Password", "Logout"] },
    { label: "Admin", icon: ShieldAlert, items: ["System Logs", "Audit Logs", "Manage Permissions", "Print Templates", "Hospital Branding", "Numbering", "Global Settings", "System Administration", "Employees", "Doctors Schedule", "Ward Setup"], adminOnly: true },
  ];

  // Filter out admin-only menus for non-admin users
  const menuItems = allMenuItems.filter((menu) => !menu.adminOnly || isSuperAdmin);

  // Helper to extract initials
  const getInitials = (email?: string) => {
    if (!email) return "ST";
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <header className="w-full bg-slate-900 border-b border-slate-800 text-slate-100 flex items-center justify-between px-4 py-2 select-none shadow-md font-sans shrink-0 z-40">
      {/* Navigation Overlay Loader */}
      {navigating && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-md flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-200">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
          <p className="text-zinc-200 text-xs font-mono tracking-wider uppercase">Loading clinical resources...</p>
        </div>
      )}

      {/* Brand/Logo Section */}
      <Link href="/" className="flex items-center space-x-2 mr-4 shrink-0 max-w-[200px] sm:max-w-[250px] md:max-w-[300px] truncate group cursor-pointer select-none">
        <div className="bg-emerald-600 p-1.5 rounded-lg flex items-center justify-center text-white shadow-inner shrink-0 group-hover:bg-emerald-500 transition-colors">
          <Building2 size={20} className="animate-pulse" />
        </div>
        <span className="font-bold text-sm sm:text-base tracking-tight text-slate-100 group-hover:text-emerald-400 transition-colors truncate">
          {user?.hospitalName || "HMS v2.0"}
        </span>
      </Link>

      {/* Main Horizontal Menu Bar (Windows Desktop App Style) */}
      <nav className="flex items-center space-x-1 flex-1">
        {menuItems.map((menu) => (
          <div
            key={menu.label}
            className="relative"
            onMouseEnter={() => handleMouseEnter(menu.label)}
            onMouseLeave={handleMouseLeave}
          >
            <button className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md hover:bg-slate-800 active:bg-slate-700 text-slate-300 hover:text-white transition-all duration-150 text-sm font-medium focus:outline-none cursor-pointer">
              <menu.icon size={16} className={`text-slate-400 ${activeMenu === menu.label ? "text-emerald-400" : ""}`} />
              <span>{menu.label}</span>
              <ChevronDown size={12} className={`text-slate-500 transition-transform ${activeMenu === menu.label ? "rotate-180 text-slate-300" : ""}`} />
            </button>
            
            {/* Dropdown menus */}
            {activeMenu === menu.label && (
              <div className="absolute left-0 mt-0.5 w-48 bg-slate-950 border border-slate-800 rounded-md shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                {menu.items.map((subItem) => {
                  const adminItems = [
                    "Employees",
                    "Doctors Schedule",
                    "Ward Setup",
                    "System Logs",
                    "Audit Logs",
                    "Manage Permissions",
                  ];
                  let href = adminItems.includes(subItem) ? "/admin" : "/";
                  
                  if (menu.label === "OPD") {
                    if (subItem === "Register Patient") href = "/opd/register";
                    else if (subItem === "Patient List") href = "/opd/patients";
                    else if (subItem === "OPD Queue") href = "/opd/queue";
                    else if (subItem === "Today's OPD") href = "/opd/today";
                    else if (subItem === "Search OPD") href = "/opd/search";
                    else href = "/opd";
                  }
                  if (menu.label === "IPD") {
                    if (subItem === "Admission") href = "/ipd/new";
                    else if (subItem === "Active Patients") href = "/ipd?tab=active";
                    else if (subItem === "Birth & Death Registration") href = "/ipd?tab=registration";
                    else if (subItem === "Discharge Patient") href = "/ipd?tab=discharge";
                    else if (subItem === "Search IPD") href = "/ipd?tab=search";
                    else href = "/ipd";
                  }
                  if (menu.label === "Billing") {
                    if (subItem === "New Invoice") href = "/billing/generate";
                    else if (subItem === "Payments") href = "/billing";
                    else if (subItem === "Refund Claims") href = "/billing?status=REFUNDED";
                    else href = "/billing";
                  }
                  if (menu.label === "OT") {
                    if (subItem === "Schedule Surgery") href = "/ot/register";
                    else href = "/ot";
                  }
                  if (menu.label === "Manage") {
                    if (subItem === "Profile") href = "/manage/profile";
                    else if (subItem === "Change Password") href = "/manage/change-password";
                    else if (subItem === "Logout") href = "#";
                  }
                  if (menu.label === "Admin") {
                    if (subItem === "Print Templates") href = "/admin/templates";
                    else if (subItem === "Hospital Branding") href = "/admin/branding";
                    else if (subItem === "Numbering") href = "/admin/numbering";
                    else if (subItem === "Global Settings") href = "/admin/global-settings";
                    else if (subItem === "System Administration") href = "/admin/system";
                    else if (subItem === "Employees") href = "/admin?tab=employees";
                    else if (subItem === "Doctors Schedule") href = "/admin?tab=doctors";
                    else if (subItem === "Ward Setup") href = "/admin?tab=wards";
                  }
                  if (menu.label === "Reports") {
                    const mapping: Record<string, string> = {
                      "OPD": "opd",
                      "IPD": "ipd",
                      "Billing": "billing",
                      "OT": "ot",
                      "Birth": "birth",
                      "Death": "death",
                      "Collection": "collection"
                    };
                    href = `/reports?tab=${mapping[subItem] || "opd"}`;
                  }
                  
                  const isLogout = subItem === "Logout";

                  return (
                    <Link
                      key={subItem}
                      href={isLogout ? "#" : href}
                      onClick={async (e) => {
                        if (isLogout) {
                          e.preventDefault();
                          await handleLogout();
                          return;
                        }
                        // Check if it's the exact same link to avoid infinite spinner on double clicks
                        const current = window.location.pathname + window.location.search;
                        if (current !== href) {
                          setNavigating(true);
                        }
                      }}
                      className={`block px-4 py-2 text-xs transition-colors ${
                        isLogout 
                          ? "text-red-400 hover:text-white hover:bg-red-600/30" 
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      {subItem}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Meta Section (Right Aligned) */}
      <div className="flex items-center space-x-4 text-xs font-mono text-slate-400 border-l border-slate-800 pl-4 shrink-0">
        {/* Force Reload Button */}
        <button
          onClick={() => window.location.reload()}
          className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-md border border-slate-700 hover:border-slate-650 transition-all cursor-pointer font-sans"
          title="Force reload Electron App"
        >
          <RefreshCw size={12} />
          <span>Reload</span>
        </button>
      </div>
    </header>
  );
}
export { HeaderMenuBar as HeaderMenu };
