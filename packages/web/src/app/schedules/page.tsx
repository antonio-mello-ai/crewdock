"use client";

import { Fragment, useState } from "react";
import {
  useSchedules,
  useRunSchedule,
  useToggleSchedule,
  useDeleteSchedule,
} from "@/hooks/use-api";
import { ScheduleForm } from "@/components/schedule-form";
import { ScheduleLogs } from "@/components/schedule-logs";
import { Button } from "@/components/ui/button";
import { formatTimeAgo } from "@/lib/utils";
import {
  Clock,
  Play,
  Loader2,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  FileText,
} from "lucide-react";

function formatNextRun(ms: number | null): string {
  if (!ms) return "—";
  const diff = ms - Date.now();
  if (diff < 0) return "now";
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `in ${days}d ${hours % 24}h`;
  if (hours > 0) return `in ${hours}h ${mins % 60}m`;
  if (mins > 0) return `in ${mins}m`;
  return "in <1m";
}

export default function SchedulesPage() {
  const { data, isLoading } = useSchedules();
  const runSchedule = useRunSchedule();
  const toggleSchedule = useToggleSchedule();
  const deleteSchedule = useDeleteSchedule();

  const [formOpen, setFormOpen] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<string | null>(null);

  const schedules = data?.data ?? [];

  const handleDelete = (name: string) => {
    if (
      !confirm(
        `Delete schedule "${name}"?\n\nThis will:\n- Stop and disable the timer\n- Remove the .service and .timer files from /etc/systemd/system/\n\nThis cannot be undone.`
      )
    )
      return;
    deleteSchedule.mutate(name);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-100">
            Schedules
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Systemd timers owned by AIOS
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          New Schedule
        </Button>
      </div>

      {formOpen && (
        <ScheduleForm
          onClose={() => setFormOpen(false)}
          onCreated={() => {
            // Will auto-refetch via React Query invalidation
          }}
        />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
        </div>
      ) : schedules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-900/30 p-12 text-center">
          <Clock className="mx-auto h-8 w-8 text-neutral-700 mb-3" />
          <p className="text-sm text-neutral-500">No AIOS schedules yet</p>
          <p className="mt-1 text-xs text-neutral-600">
            Create one with the <strong>New Schedule</strong> button above.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-800/60 bg-neutral-900/30 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800/60 bg-neutral-950/30 text-left">
                <th className="w-6"></th>
                <th className="px-4 py-2.5 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-2.5 text-xs font-medium text-neutral-500 uppercase tracking-wider hidden md:table-cell">
                  Schedule
                </th>
                <th className="px-4 py-2.5 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Next
                </th>
                <th className="px-4 py-2.5 text-xs font-medium text-neutral-500 uppercase tracking-wider hidden lg:table-cell">
                  Last
                </th>
                <th className="px-4 py-2.5 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-2.5 text-xs font-medium text-neutral-500 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/40">
              {schedules.map((s) => {
                const isRunning =
                  runSchedule.isPending && runSchedule.variables === s.name;
                const isToggling =
                  toggleSchedule.isPending &&
                  toggleSchedule.variables?.name === s.name;
                const isDeleting =
                  deleteSchedule.isPending &&
                  deleteSchedule.variables === s.name;
                const expanded = expandedLogs === s.name;

                return (
                  <Fragment key={s.name}>
                    <tr className="hover:bg-neutral-800/20 transition-colors">
                      <td className="pl-3">
                        <button
                          onClick={() =>
                            setExpandedLogs(expanded ? null : s.name)
                          }
                          className="text-neutral-600 hover:text-neutral-300 transition-colors p-1"
                          title="Show logs"
                        >
                          {expanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-neutral-300 truncate max-w-[220px]">
                          {s.name.replace(/\.timer$/, "")}
                        </div>
                        <div className="text-xs text-neutral-600 truncate max-w-[320px]">
                          {s.description}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <code className="text-xs text-neutral-500 font-mono">
                          {s.onCalendar ?? "—"}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-400 font-mono">
                        {formatNextRun(s.nextRun)}
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500 hidden lg:table-cell">
                        {s.lastRun ? formatTimeAgo(s.lastRun) : "never"}
                      </td>
                      <td className="px-4 py-3">
                        {s.active ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-blue-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            running
                          </span>
                        ) : s.enabled ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-green-500/80">
                            <CheckCircle2 className="h-3 w-3" />
                            enabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-neutral-600">
                            <PauseCircle className="h-3 w-3" />
                            disabled
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 gap-1"
                            onClick={() => runSchedule.mutate(s.name)}
                            disabled={isRunning || s.active}
                            title="Run now"
                          >
                            {isRunning ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                            <span className="text-xs">Run</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() =>
                              toggleSchedule.mutate({
                                name: s.name,
                                enabled: !s.enabled,
                              })
                            }
                            disabled={isToggling}
                            title={s.enabled ? "Disable" : "Enable"}
                          >
                            {isToggling ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : s.enabled ? (
                              <PauseCircle className="h-3 w-3" />
                            ) : (
                              <PlayCircle className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-red-400/60 hover:text-red-400"
                            onClick={() => handleDelete(s.name)}
                            disabled={isDeleting}
                            title="Delete"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td colSpan={7} className="bg-neutral-950/40 px-6 py-4">
                          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                            <FileText className="h-3 w-3" />
                            Recent logs ({s.service})
                          </div>
                          <ScheduleLogs name={s.name} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
