"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Cpu,
  LayoutDashboard,
  LogOut,
  Settings,
} from "lucide-react";

import { useShell } from "@/components/ShellContext";
import { clearSession } from "@/lib/auth";
import { showSuccess } from "@/lib/toast";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/devices", label: "Devices", icon: Cpu },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/faults", label: "Faults", icon: AlertTriangle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ onNavigate }) {
  const pathname = usePathname();
  const router = useRouter();
  const { connected } = useShell();

  const handleLogout = () => {
    clearSession();
    showSuccess("Signed out");
    router.replace("/login");
  };

  return (
    <aside className="glass-dark flex h-full w-64 shrink-0 flex-col text-slate-300">
      {/* Brand */}
      <div className="relative flex items-center gap-3 px-5 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="Ornate Solar" className="h-9 w-auto shrink-0 object-contain" />
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight text-white">Ornate Solar</p>
          <p className="readout text-[10px] uppercase tracking-[0.18em] text-slate-400">
            Krishna Box
          </p>
        </div>
        {/* A lit hairline rather than a flat border - it reads as the edge of a
            panel with a light above it, which is the whole look. */}
        <span className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        <p className="hud-label mb-2 px-3">Workspace</p>
        <ul className="space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            // Exact match for the dashboard root, prefix match elsewhere so a
            // device detail page keeps "Devices" highlighted.
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "nav-active text-orange-300"
                      : "hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={18} className={active ? "drop-shadow-[0_0_6px_rgba(249,115,22,0.6)]" : ""} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="relative px-3 py-4">
        <span className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />

        {/* Link status in the rail as well as the topbar: on a wall display the
            header is often the first thing scrolled out of sight. */}
        <div className="mb-3 flex items-center justify-between px-3">
          <span className="hud-label">Link</span>
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${
              connected ? "text-green-400" : "text-slate-500"
            }`}
          >
            <span
              className={`status-dot h-1.5 w-1.5 ${connected ? "status-dot-live bg-green-400" : "bg-slate-500"}`}
            />
            {connected ? "Online" : "Polling"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
        <p className="readout mt-3 text-center text-[10px] text-slate-500">v1.0 · © Ornate Solar</p>
      </div>
    </aside>
  );
}
