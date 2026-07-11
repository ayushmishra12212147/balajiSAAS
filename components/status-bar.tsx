"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/modules/auth/hooks/use-auth-store";

/**
 * StatusBar Component
 * Anchored to the bottom of the viewport mimicking traditional Windows software layout.
 * Visualizes connection state, active user profile, tenant hospital name, and live clock.
 */
export function StatusBar() {
  const { user } = useAuthStore();
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      // Formatted local Indian standard time
      setTime(new Date().toLocaleString("en-IN", { hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="w-full h-8 bg-zinc-900 border-t border-zinc-800 text-zinc-400 text-xs px-4 flex items-center justify-between select-none shrink-0 z-50">
      {/* Left side: System and Hospital status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {/* Static Application Health status: no redundant database hits */}
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>System Online</span>
        </div>
        {user && (
          <>
            <span className="text-zinc-700">|</span>
            <span>
              Hospital: <strong className="text-zinc-300">{user.hospitalName}</strong>
            </span>
          </>
        )}
      </div>

      {/* Right side: Session metrics and dynamic clock */}
      <div className="flex items-center gap-4">
        {user && (
          <>
            <span>
              User: <strong className="text-zinc-300">{user.email}</strong> ({user.designation})
            </span>
            <span className="text-zinc-700">|</span>
          </>
        )}
        <span>
          Ver: <strong className="text-zinc-300">2.0.0</strong>
        </span>
        <span className="text-zinc-700">|</span>
        <span className="tabular-nums text-zinc-300">{time}</span>
      </div>
    </footer>
  );
}
export default StatusBar;
