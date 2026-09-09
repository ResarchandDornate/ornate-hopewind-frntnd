"use client";

import { useEffect, useState } from "react";
import { Menu, Radio, User } from "lucide-react";

import { getUser } from "@/lib/auth";
import { formatLastSeen } from "@/lib/deviceStatus";

/**
 * Page header: breadcrumb, live-connection indicator, current user.
 *
 * `connected` reflects the WebSocket, so the operator can tell "nothing is
 * happening" apart from "the page stopped receiving updates" — the two look
 * identical on a dashboard of idle devices otherwise.
 */
export default function Topbar({ section, title, connected, lastMessageAt, onMenuClick, actions }) {
  const [user, setUser] = useState(null);

  // sessionStorage is not available during SSR, so read it after mount.
  useEffect(() => setUser(getUser()), []);

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
          <p className="truncate text-xs text-slate-500">
            {section ? `${section} / ` : ""}
            <span className="text-slate-700">{title}</span>
          </p>
          <h1 className="truncate text-xl font-bold text-slate-900">{title}</h1>
        </div>

        {actions}

        <div
          className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold sm:flex ${
            connected ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
          }`}
          title={
            connected
              ? `Live stream connected${lastMessageAt ? ` · last update ${formatLastSeen(lastMessageAt)}` : ""}`
              : "Live stream disconnected — falling back to polling"
          }
        >
          <Radio size={13} className={connected ? "animate-pulse" : ""} />
          {connected ? "Live" : "Polling"}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white">
            <User size={17} />
          </div>
          <div className="hidden min-w-0 leading-tight sm:block">
            <p className="truncate text-sm font-semibold text-slate-900">
              {user?.name?.trim() || user?.email || "Operator"}
            </p>
            <p className="truncate text-[11px] text-slate-500">{user?.role || "Ornate Solar"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
