"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Database, KeyRound, Radio, User } from "lucide-react";

import { useShell } from "@/components/ShellContext";
import Topbar from "@/components/Topbar";
import { Card, PageBody } from "@/components/ui";
import { postData } from "@/lib/api";
import { fetchDbHealth, fetchMe, fetchMqttHealth } from "@/lib/devicesApi";
import { formatLastSeen } from "@/lib/deviceStatus";
import { queryKeys } from "@/lib/queryKeys";
import { extractApiMessage, showError, showSuccess } from "@/lib/toast";

export default function SettingsPage() {
  const { connected, lastMessageAt, openNav } = useShell();

  const meQuery = useQuery({ queryKey: queryKeys.me, queryFn: fetchMe });
  const mqttQuery = useQuery({
    queryKey: queryKeys.mqttHealth,
    queryFn: fetchMqttHealth,
    refetchInterval: 30000,
    // The broker connection lives in the MQTT worker process, so the API can
    // legitimately report "not connected" in a split deployment. Failing here
    // is informational, not an error worth retrying hard.
    retry: false,
  });
  const dbQuery = useQuery({
    queryKey: ["health", "db"],
    queryFn: fetchDbHealth,
    refetchInterval: 60000,
    retry: false,
  });

  const me = meQuery.data?.data;

  return (
    <>
      <Topbar
        section="Account"
        title="Settings"
        connected={connected}
        lastMessageAt={lastMessageAt}
        onMenuClick={openNav}
      />

      <PageBody>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card title="Profile" subtitle="Your portal account">
            <dl className="space-y-3 text-sm">
              <Row icon={User} label="Name" value={me?.name} />
              <Row icon={User} label="Email" value={me?.email} />
              <Row icon={KeyRound} label="Role" value={me?.role} />
              <Row icon={User} label="Department" value={me?.department} />
              <Row icon={User} label="Contact" value={me?.contact_number} />
            </dl>
          </Card>

          <Card title="System health" subtitle="Backend and ingestion status">
            <dl className="space-y-3 text-sm">
              <Row
                icon={Radio}
                label="Live stream"
                value={connected ? "Connected" : "Disconnected"}
                tone={connected ? "good" : "warn"}
              />
              <Row
                icon={Radio}
                label="Last push"
                value={lastMessageAt ? formatLastSeen(lastMessageAt) : "—"}
              />
              <Row
                icon={Radio}
                label="MQTT broker"
                value={
                  mqttQuery.isError
                    ? "Unavailable"
                    : mqttQuery.data?.connected
                      ? "Connected"
                      : "Not connected in this process"
                }
                tone={mqttQuery.data?.connected ? "good" : "warn"}
              />
              <Row
                icon={Database}
                label="Ingestion queue"
                value={
                  mqttQuery.data?.queue_depth === undefined || mqttQuery.data?.queue_depth < 0
                    ? "—"
                    : `${mqttQuery.data.queue_depth} message(s)`
                }
              />
              <Row
                icon={Database}
                label="Database"
                value={dbQuery.isError ? "Unreachable" : dbQuery.data?.database === "ok" ? "OK" : "—"}
                tone={dbQuery.data?.database === "ok" ? "good" : "warn"}
              />
            </dl>
          </Card>
        </div>

        <ChangePasswordCard />
      </PageBody>
    </>
  );
}

function Row({ icon: Icon, label, value, tone }) {
  const toneClass =
    tone === "good" ? "text-green-600" : tone === "warn" ? "text-amber-600" : "text-slate-900";
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="flex items-center gap-2 text-slate-500">
        {Icon && <Icon size={15} className="text-slate-400" />}
        {label}
      </dt>
      <dd className={`text-right font-medium ${toneClass}`}>{value || "—"}</dd>
    </div>
  );
}

function ChangePasswordCard() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (newPassword !== confirm) {
      // Caught here rather than at the API, so the user is not told their new
      // password was rejected when the real problem was a typo in the repeat.
      showError("The new passwords do not match");
      return;
    }

    setSaving(true);
    try {
      await postData("/auth/change-password/", {
        old_password: oldPassword,
        new_password: newPassword,
      });
      showSuccess("Password changed");
      setOldPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (error) {
      showError(extractApiMessage(error, "Could not change the password."));
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm outline-none focus:border-orange-400";

  return (
    <Card title="Change password" subtitle="You will stay signed in on this device">
      <form onSubmit={submit} className="grid max-w-xl gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">
            Current password
          </label>
          <input
            type="password"
            value={oldPassword}
            onChange={(event) => setOldPassword(event.target.value)}
            autoComplete="current-password"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">
            Repeat new password
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving || !oldPassword || !newPassword}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Update password"}
          </button>
        </div>
      </form>
    </Card>
  );
}
