"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Menu, Radio, User } from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { getUser } from "@/lib/auth";
import { formatLastSeen } from "@/lib/deviceStatus";

/**
 * Page header: breadcrumb, live-connection indicator, clock, current user.
 *
 * `connected` reflects the WebSocket, so the operator can tell "nothing is
 * happening" apart from "the page stopped receiving updates" — the two look
 * identical on a dashboard of idle devices otherwise.
 */
export default function Topbar({ section, title, connected, lastMessageAt, onMenuClick, actions }) {
  const [user, setUser] = useState(null);

  // sessionStorage is not available during SSR, so read it after mount.
  useEffect(() => setUser(getUser()), []);

  const displayName = user?.name?.trim() || user?.email || "";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-white/60 bg-white/65 px-4 py-3 backdrop-blur-xl backdrop-saturate-150 md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl p-2 text-slate-600 hover:bg-white/60 md:hidden"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {section && (
              <>
                <span>{section}</span>
                <ChevronRight size={11} className="opacity-60" />
              </>
            )}
            <span className="text-slate-500">{title}</span>
          </p>
          <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">{title}</h1>
        </div>

        {actions}

        <Clock />

        <div
          className={`hidden items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest sm:flex ${
            connected ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
          }`}
          title={
            connected
              ? `Live stream connected${lastMessageAt ? ` · last update ${formatLastSeen(lastMessageAt)}` : ""}`
              : "Live stream disconnected — falling back to polling"
          }
        >
          <span
            className={`status-dot h-1.5 w-1.5 ${
              connected ? "status-dot-live bg-green-600" : "bg-slate-400"
            }`}
          />
          {connected ? "Live" : "Polling"}
          <Radio size={12} className="opacity-70" />
        </div>

        <ThemeToggle />

        <div className="flex items-center gap-2">
          {/* Burnt ink on full brand orange rather than white on it: white
              lands at 2.8:1 against #f4801f, which will not carry a letterform.
              This keeps the fill at full saturation and clears AA. */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-on-brand shadow-[0_0_18px_rgba(244,128,31,0.5)]">
            {initial ? (
              <span className="readout text-sm font-bold">{initial}</span>
            ) : (
              <User size={17} />
            )}
          </div>
          <div className="hidden min-w-0 leading-tight sm:block">
            <p className="truncate text-sm font-semibold text-slate-900">
              {displayName || "Operator"}
            </p>
            <p className="truncate text-[11px] text-slate-500">{user?.role || "Ornate Solar"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * Wall-clock time, isolated in its own component so its per-second tick does
 * not re-render the rest of the header. Renders nothing until mounted: the
 * server has no way to know the viewer's timezone, so any initial value would
 * hydrate wrong.
 */
function Clock() {
  const [now, setNow] = useState(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  return (
    <time
      dateTime={now.toISOString()}
      className="readout hidden text-sm font-semibold text-slate-600 lg:block"
      title={now.toString()}
    >
      {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
    </time>
  );
}
