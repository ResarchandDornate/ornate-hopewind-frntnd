"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import ShellContext from "@/components/ShellContext";
import Sidebar from "@/components/Sidebar";
import useDeviceSocket from "@/hooks/useDeviceSocket";
import { isAuthenticated } from "@/lib/auth";

// The WebSocket is opened once here and shared through ShellContext, rather
// than per page: opening it inside each page would re-handshake on every
// navigation and briefly run two sockets during the transition.

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  // Held until the auth check passes, so an unauthenticated visitor never opens
  // a socket that would only be rejected.
  const live = useDeviceSocket({ enabled: authChecked });

  const openNav = useCallback(() => setMobileNavOpen(true), []);
  const shell = useMemo(
    () => ({ connected: live.connected, lastMessageAt: live.lastMessageAt, openNav }),
    [live.connected, live.lastMessageAt, openNav]
  );

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <ShellContext.Provider value={shell}>
      <div className="flex min-h-screen">
        <div className="sticky top-0 hidden h-screen md:block">
          <Sidebar />
        </div>

        {mobileNavOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileNavOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <div className="absolute inset-y-0 left-0 h-full">
              <Sidebar onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </ShellContext.Provider>
  );
}
