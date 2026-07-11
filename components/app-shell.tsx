"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/modules/auth/hooks/use-auth-store";
import { AuthClient } from "@/lib/auth-client";
import HeaderMenuBar from "@/components/header-menu";
import StatusBar from "@/components/status-bar";

/**
 * AppShell Component
 * Manages active client-side session checks, layouts routing protections,
 * and frames page workspaces between the Horizonal Menu Bar and bottom Status Bar.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Skip session checks on login page
    if (pathname === "/login") {
      setLoading(false);
      return;
    }

    const verifySession = async () => {
      try {
        const profile = await AuthClient.me();
        setUser(profile);
      } catch {
        // Clear stores and route back to login on failure
        setUser(null);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, [pathname, router, setUser, setLoading]);

  // Login page gets standard raw viewport
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Spinner states when verifying session status
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-zinc-400 text-xs font-mono select-none">
        <span className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span>Initializing Secure Terminal Session...</span>
      </div>
    );
  }

  // Prevent flash content before redirect completes
  if (!user) {
    return null;
  }

  // Print templates get raw viewport without top menu and status bar
  const isPrintRoute = pathname.includes("/discharge-summary") || 
                       pathname.includes("/discharge-card") || 
                       pathname.includes("/print-bill") || 
                       pathname.includes("/print-receipt") || 
                       pathname.includes("/no-due-slip") ||
                       pathname.includes("/print");

  if (isPrintRoute) {
    return <>{children}</>;
  }

  const isSuperAdmin = user.role === "SUPER_ADMIN";

  // Render maintenance screen intercept for non-Super Admins
  if (user.isMaintenanceActive && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none text-zinc-300">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-lg p-8 space-y-6 shadow-2xl">
          <span className="inline-block p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </span>
          <div className="space-y-2">
            <h2 className="text-lg font-bold tracking-tight text-white font-mono uppercase">System Under Maintenance</h2>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              {user.maintenanceMessage || "The application is undergoing scheduled system upgrades. Please check back later."}
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={async () => {
                await AuthClient.logout();
                setUser(null);
                router.push("/login");
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-mono font-medium rounded text-zinc-200 border border-slate-700 cursor-pointer"
            >
              Sign Out Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col overflow-hidden text-slate-100 font-sans">
      {/* Expiry Banner warning lock */}
      {user.isLicenseExpired && (
        <div className="bg-red-950/90 border-b border-red-800/80 text-red-200 px-4 py-2 text-center text-xs font-mono font-bold flex items-center justify-center gap-1.5 animate-in slide-in-from-top duration-200">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          <span>Hospital license has expired. Business transactions are locked. Please contact a Super Admin to renew.</span>
        </div>
      )}

      {/* Horizontal menu navigation */}
      <HeaderMenuBar />
      
      {/* Reusable workspace content frame */}
      <main className="flex-1 w-full overflow-auto relative p-6 bg-slate-950">
        {children}
      </main>

      {/* Windows traditional status bar */}
      <StatusBar />
    </div>
  );
}
export default AppShell;
