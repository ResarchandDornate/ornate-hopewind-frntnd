"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import DeviceTable from "@/components/DeviceTable";
import { useShell } from "@/components/ShellContext";
import Topbar from "@/components/Topbar";
import { Card, ErrorState, PageBody, SegmentedControl } from "@/components/ui";
import { useDeviceFleet } from "@/hooks/useDevices";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "offline", label: "Offline" },
  { value: "fault", label: "Faulted" },
];

export default function DevicesPage() {
  const { connected, lastMessageAt, openNav } = useShell();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { fleet, isLoading, isError, error, refetch } = useDeviceFleet();

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return fleet.filter((device) => {
      // "Live" deliberately includes recovering/unsynced devices: from an
      // operator's point of view those are still talking to us.
      if (filter === "live" && !["live", "recovering", "unsynced"].includes(device.status)) {
        return false;
      }
      if (filter === "offline" && device.status !== "offline") return false;
      if (filter === "fault" && device.status !== "fault") return false;

      if (!needle) return true;
      return [device.name, device.serial_number, device.city, device.model]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));
    });
  }, [fleet, filter, search]);

  return (
    <>
      <Topbar
        section="Fleet"
        title="Devices"
        connected={connected}
        lastMessageAt={lastMessageAt}
        onMenuClick={openNav}
      />

      <PageBody>
        <Card
          title="Registered devices"
          subtitle={`${visible.length} of ${fleet.length} shown`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-white/60 bg-white/55 px-3 py-1.5 backdrop-blur">
                <Search size={15} className="text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, serial, city…"
                  className="w-48 bg-transparent text-sm outline-none"
                />
              </div>
              <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} size="sm" />
            </div>
          }
        >
          {isError ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : (
            <DeviceTable fleet={visible} loading={isLoading} />
          )}
        </Card>
      </PageBody>
    </>
  );
}
