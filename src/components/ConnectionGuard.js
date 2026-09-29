"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, WifiOff } from "lucide-react";
import { toast } from "sonner";

import {
  OFFLINE_COPY,
  OFFLINE_KIND,
  probeConnection,
  subscribeConnection,
} from "@/lib/connectivity";

// Retry schedule in seconds. Backs off so a long outage does not hammer a
// server that may be struggling, but the first few attempts stay quick because
// most outages are a dropped packet or a restarting container.
const BACKOFF = [5, 5, 10, 20, 30, 60];
const nextDelay = (attempt) => BACKOFF[Math.min(attempt, BACKOFF.length - 1)];

const mmss = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

/**
 * Global connectivity popup.
 *
 * Mounted once in Providers so it covers the login and signup screens as well as
 * the dashboard — losing the connection while signing in is exactly when a user
 * most needs to be told it is not their password that is wrong.
 */
export default function ConnectionGuard() {
  const [conn, setConn] = useState({ online: true, kind: null, since: null });
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [checking, setChecking] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const attemptRef = useRef(0);
  const wasOfflineRef = useRef(false);

  useEffect(() => subscribeConnection(setConn), []);

  // Reset per-outage counters on each transition, and confirm recovery out loud —
  // a popup that simply vanishes leaves the user unsure whether it worked.
  useEffect(() => {
    if (!conn.online) {
      if (!wasOfflineRef.current) {
        wasOfflineRef.current = true;
        attemptRef.current = 0;
        setDismissed(false);
        setCountdown(nextDelay(0));
      }
      return;
    }
    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      attemptRef.current = 0;
      setDismissed(false);
      setChecking(false);
      toast.success("Back online — connection restored");
    }
  }, [conn.online]);

  const retryNow = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    const ok = await probeConnection();
    setChecking(false);
    if (!ok) {
      attemptRef.current += 1;
      setCountdown(nextDelay(attemptRef.current));
    }
  }, [checking]);

  // One second tick driving both the elapsed clock and the retry countdown, so
  // the two never drift apart on screen.
  useEffect(() => {
    if (conn.online) return;

    const tick = () => {
      setElapsed(conn.since ? Date.now() - conn.since : 0);
      setCountdown((remaining) => {
        if (remaining <= 1) {
          // Fire the retry outside this updater; calling it here would run
          // during render in React 19's stricter mode.
          queueMicrotask(retryNow);
          return nextDelay(attemptRef.current + 1);
        }
        return remaining - 1;
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [conn.online, conn.since, retryNow]);

  if (conn.online) return null;

  const copy = OFFLINE_COPY[conn.kind] ?? OFFLINE_COPY[OFFLINE_KIND.SERVER_UNREACHABLE];

  // Dismissed: keep a small always-visible reminder rather than nothing at all,
  // so the user is never silently looking at stale figures.
  if (dismissed) {
    return (
      <button
        type="button"
        onClick={() => setDismissed(false)}
        aria-live="polite"
        className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 flex items-center gap-2 rounded-full border border-red-500/40 bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-red-700"
      >
        <WifiOff className="h-3.5 w-3.5" />
        Offline for {mmss(elapsed)} — tap for details
      </button>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="connection-lost-title"
      aria-describedby="connection-lost-detail"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      {/* Backdrop is not click-to-close: dismissing by accident while the app
          cannot load anything is worse than an explicit button. */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" aria-hidden="true" />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-(--border-solid) bg-(--surface-solid) shadow-xl">
        <div className="flex items-start gap-3 border-b border-(--border-solid) px-5 py-4">
          <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-red-100 text-red-600">
            <WifiOff className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <h2
              id="connection-lost-title"
              className="text-sm font-semibold tracking-tight text-slate-900"
            >
              {copy.title}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Offline for {mmss(elapsed)}
            </p>
          </div>
        </div>

        <div className="px-5 py-4">
          <p id="connection-lost-detail" className="text-xs leading-relaxed text-slate-600">
            {copy.detail}
          </p>

          <div className="mt-4 flex items-center justify-between rounded-lg bg-(--background-flat) px-3 py-2.5">
            <span className="text-xs text-slate-500">
              {checking ? "Checking the connection…" : `Retrying in ${countdown}s`}
            </span>
            <span className="font-mono text-xs tabular-nums text-slate-400">
              attempt {attemptRef.current + 1}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={retryNow}
              disabled={checking}
              autoFocus
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-solid px-4 py-2.5 text-xs font-semibold text-on-solid transition hover:opacity-90 disabled:opacity-60"
            >
              {checking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {checking ? "Checking…" : "Retry now"}
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded-lg border border-(--border-solid) px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-(--background-flat)"
            >
              Hide
            </button>
          </div>

          <p className="mt-3 text-center text-[11px] text-slate-400">
            Anything shown behind this box may be out of date.
          </p>
        </div>
      </div>
    </div>
  );
}
