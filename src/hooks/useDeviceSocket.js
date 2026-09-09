"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getToken } from "@/lib/auth";
import { queryKeys } from "@/lib/queryKeys";
import { BASE_URL } from "@/lib/api";

/**
 * Live telemetry over the backend's WebSocket.
 *
 * The socket carries the JWT as a query parameter, because browsers cannot set
 * headers on a WebSocket handshake (the backend's ws_auth.py reads it there).
 *
 * A push does not replace React Query's cache wholesale — it seeds the latest
 * reading and invalidates the derived queries, so a socket drop degrades to
 * ordinary polling rather than a frozen dashboard.
 */
export function useDeviceSocket({ enabled = true } = {}) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [lastMessageAt, setLastMessageAt] = useState(null);

  const socketRef = useRef(null);
  const reconnectRef = useRef(null);
  const attemptsRef = useRef(0);
  // Kept in a ref so the reconnect loop below never re-runs just because a
  // message arrived and changed state.
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const socketUrl = useCallback(() => {
    const token = getToken();
    if (!token) return null;

    // Derive the socket origin from the REST base URL, so pointing the app at a
    // different backend moves both without a second env var.
    let origin;
    try {
      origin = new URL(BASE_URL, typeof window !== "undefined" ? window.location.href : undefined)
        .origin;
    } catch {
      return null;
    }
    const wsOrigin = origin.replace(/^http/, "ws");
    return `${wsOrigin}/ws/devices/data/?token=${encodeURIComponent(token)}`;
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;

    let cancelled = false;

    const connect = () => {
      if (cancelled || !enabledRef.current) return;

      const url = socketUrl();
      if (!url) return;

      let socket;
      try {
        socket = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }
      socketRef.current = socket;

      socket.onopen = () => {
        if (cancelled) return;
        attemptsRef.current = 0;
        setConnected(true);
      };

      socket.onmessage = (event) => {
        if (cancelled) return;
        let payload;
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }

        if (payload.type === "pong") return;

        if (payload.type === "latest_data" || payload.type === "real_time_update") {
          setLastMessageAt(new Date());

          if (Array.isArray(payload.data)) {
            queryClient.setQueryData(queryKeys.devices.latestTelemetry, () =>
              Object.fromEntries(payload.data.map((row) => [String(row.device_id), row]))
            );
          }
          // The push carries current readings but not the rolled-up totals, so
          // let the derived queries refetch rather than showing stale KPIs.
          queryClient.invalidateQueries({ queryKey: queryKeys.overview });
          queryClient.invalidateQueries({ queryKey: queryKeys.devices.all });
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        setConnected(false);
        scheduleReconnect();
      };

      // onerror is always followed by onclose, which already schedules the
      // retry — closing here would double it.
      socket.onerror = () => {};
    };

    const scheduleReconnect = () => {
      if (cancelled || !enabledRef.current) return;
      clearTimeout(reconnectRef.current);
      // Exponential backoff capped at 30s: a backend restart should not turn
      // into a reconnect storm from every open tab.
      const delay = Math.min(1000 * 2 ** attemptsRef.current, 30000);
      attemptsRef.current += 1;
      reconnectRef.current = setTimeout(connect, delay);
    };

    connect();

    // Keepalive: idle WebSockets get culled by proxies after ~60s.
    const heartbeat = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);

    return () => {
      cancelled = true;
      clearTimeout(reconnectRef.current);
      clearInterval(heartbeat);
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket && socket.readyState <= WebSocket.OPEN) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, [enabled, queryClient, socketUrl]);

  const requestLatest = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "get_latest_data" }));
    }
  }, []);

  return { connected, lastMessageAt, requestLatest };
}

export default useDeviceSocket;
