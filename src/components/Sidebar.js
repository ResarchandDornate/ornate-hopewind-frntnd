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

  const handleLogout = () => {
    clearSession();
    showSuccess("Signed out");
    router.replace("/login");
  };

  return (
    <aside className="glass-dark flex h-full w-64 shrink-0 flex-col text-slate-300">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="Ornate Solar" className="h-9 w-auto shrink-0 object-contain" />
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight text-white">Ornate Solar</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-400">Krishna Box</p>
        </div>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Workspace
        </p>
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
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "border-l-2 border-orange-400 bg-orange-500/15 text-orange-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                      : "hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
        <p className="mt-3 text-center text-[10px] text-slate-500">v1.0 · © Ornate Solar</p>
      </div>
    </aside>
  );
}
