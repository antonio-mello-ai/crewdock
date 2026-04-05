"use client";

import { useMemo } from "react";
import { useWorkspaces, useSessions, useJobs, useBriefing } from "@/hooks/use-api";
import { WorkspaceCard } from "@/components/workspace-card";
import { JobStatusBadge } from "@/components/job-status-badge";
import { formatTimeAgo, formatCost } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  Loader2,
  Sun,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  MessageSquare,
  Info,
} from "lucide-react";
import type { Session, Workspace, Briefing, BriefingSection, BriefingHighlight } from "@aios/shared";
import Link from "next/link";

const SECTION_ICONS = {
  alert: AlertTriangle,
  check: CheckCircle2,
  activity: Loader2,
  info: Info,
} as const;

const SECTION_COLORS = {
  alert: "text-red-400",
  check: "text-green-500/70",
  activity: "text-blue-400",
  info: "text-neutral-500",
} as const;

function highlightHref(h: BriefingHighlight): string {
  if (h.link.type === "session") {
    return `/console?workspace=${h.workspace ?? ""}&session=${h.link.id}`;
  }
  return `/jobs/detail?id=${h.link.id}`;
}

function BriefingPanel({ briefing }: { briefing: Briefing }) {
  return (
    <div className="mb-8 rounded-lg border border-neutral-800/60 bg-neutral-900/30 overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-800/40">
        <div className="flex items-center gap-2.5">
          <Sun className="h-4 w-4 text-amber-400/80" />
          <h2 className="text-sm font-semibold text-neutral-200">
            {getGreeting()}
          </h2>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Last {briefing.periodHours}h:{" "}
          {briefing.stats.sessionsCount} session
          {briefing.stats.sessionsCount !== 1 ? "s" : ""}
          {briefing.stats.activeSessionsCount > 0 &&
            ` (${briefing.stats.activeSessionsCount} active)`}
          {briefing.stats.jobsCount > 0 &&
            `, ${briefing.stats.jobsCount} job${briefing.stats.jobsCount !== 1 ? "s" : ""}`}
          {briefing.stats.failedJobsCount > 0 &&
            ` — ${briefing.stats.failedJobsCount} need${briefing.stats.failedJobsCount === 1 ? "s" : ""} attention`}
          .
        </p>
      </div>

      {briefing.sections.map((section: BriefingSection) => {
        const Icon = SECTION_ICONS[section.icon];
        const color = SECTION_COLORS[section.icon];
        return (
          <div
            key={section.title}
            className="border-t border-neutral-800/30"
          >
            <div className="px-5 py-2 bg-neutral-950/20 flex items-center gap-2">
              <Icon
                className={`h-3 w-3 ${color} ${section.icon === "activity" ? "animate-spin" : ""}`}
              />
              <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                {section.title}
              </span>
              <span className="text-[11px] text-neutral-600 font-mono">
                {section.items.length}
              </span>
            </div>
            <div className="divide-y divide-neutral-800/30">
              {section.items.map((h, idx) => {
                const ItemIcon = SECTION_ICONS[section.icon];
                return (
                  <Link
                    key={`${section.title}-${idx}-${h.link.id}`}
                    href={highlightHref(h)}
                    className="flex items-start gap-3 px-5 py-3 hover:bg-neutral-800/20 transition-colors"
                  >
                    <ItemIcon
                      className={`h-4 w-4 mt-0.5 shrink-0 ${color} ${section.icon === "activity" ? "animate-spin" : ""}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-200 truncate">
                        <span className="font-medium">
                          {h.workspaceName ?? h.title}
                        </span>
                        {h.detail && (
                          <span className="text-neutral-500">
                            {" "}— {h.detail}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-neutral-600 mt-0.5">
                        {formatTimeAgo(h.timestamp)}
                        {h.costUsd > 0 && ` · ${formatCost(h.costUsd)}`}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-neutral-700 mt-1 shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="px-5 py-3 border-t border-neutral-800/40 flex items-center gap-2 text-xs text-neutral-600">
        <DollarSign className="h-3 w-3" />
        <span>
          Total cost ({briefing.periodHours}h):{" "}
          {formatCost(briefing.stats.totalCostUsd)}
        </span>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function OverviewPage() {
  const { data: workspacesData, isLoading: workspacesLoading } = useWorkspaces();
  const { data: sessionsData, isLoading: sessionsLoading } = useSessions();
  const { data: jobsData, isLoading: jobsLoading } = useJobs({ limit: 20 });
  const { data: briefingData } = useBriefing(12);

  const workspaces = workspacesData?.data ?? [];
  const sessions = sessionsData?.data ?? [];
  const recentJobs = jobsData?.data ?? [];
  const briefing = briefingData?.data;

  // Group sessions by workspace, then group workspaces by their group field
  const workspaceGroups = useMemo(() => {
    const sessionsByWorkspace = new Map<string, Session[]>();
    for (const s of sessions) {
      const list = sessionsByWorkspace.get(s.workspaceId) ?? [];
      list.push(s);
      sessionsByWorkspace.set(s.workspaceId, list);
    }

    // Sort sessions per workspace by lastActiveAt desc
    for (const list of sessionsByWorkspace.values()) {
      list.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
    }

    // Group workspaces by their group field
    const groups = new Map<string, Workspace[]>();
    for (const w of workspaces) {
      const g = w.group ?? "Other";
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(w);
    }

    // Sort workspaces within each group: those with active sessions first, then by last activity
    for (const list of groups.values()) {
      list.sort((a, b) => {
        const aSessions = sessionsByWorkspace.get(a.id) ?? [];
        const bSessions = sessionsByWorkspace.get(b.id) ?? [];
        const aActive = aSessions.some((s) => s.status === "active") ? 1 : 0;
        const bActive = bSessions.some((s) => s.status === "active") ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        const aLast = aSessions[0]?.lastActiveAt ?? 0;
        const bLast = bSessions[0]?.lastActiveAt ?? 0;
        return bLast - aLast;
      });
    }

    return { groups, sessionsByWorkspace };
  }, [workspaces, sessions]);

  const isLoading = workspacesLoading || sessionsLoading || jobsLoading;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-100">
          Overview
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Workspaces and recent activity
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
        </div>
      ) : (
        <>
          {/* Morning Briefing */}
          {briefing && briefing.sections.length > 0 && (
            <BriefingPanel briefing={briefing} />
          )}

          {/* Workspaces by group */}
          {workspaces.length > 0 ? (
            <div className="space-y-6">
              {Array.from(workspaceGroups.groups.entries()).map(
                ([groupName, wsList]) => (
                  <div key={groupName}>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
                      {groupName}
                    </h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {wsList.map((ws) => (
                        <WorkspaceCard
                          key={ws.id}
                          workspace={ws}
                          sessions={
                            workspaceGroups.sessionsByWorkspace.get(ws.id) ?? []
                          }
                        />
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-900/30 p-12 text-center">
              <p className="text-sm text-neutral-500">
                No workspaces discovered. Check Settings to configure workspaces.
              </p>
            </div>
          )}

          <Separator className="my-8" />

          {/* Recent sessions */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-4 w-4 text-neutral-500" />
              <h2 className="text-sm font-medium text-neutral-300">
                Recent Sessions
              </h2>
            </div>

            {sessions.length > 0 ? (
              <div className="space-y-1">
                {sessions.slice(0, 10).map((s) => {
                  const ws = workspaces.find((w) => w.id === s.workspaceId);
                  return (
                    <Link
                      key={s.id}
                      href={`/console?workspace=${s.workspaceId}&session=${s.id}`}
                      className="flex items-center gap-4 rounded-md px-3 py-2.5 transition-colors hover:bg-neutral-800/40"
                    >
                      <span
                        className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                          s.status === "active"
                            ? "bg-blue-400 animate-pulse"
                            : "bg-neutral-700"
                        }`}
                      />
                      <span className="text-sm font-mono text-neutral-400 w-32 truncate">
                        {ws?.name ?? s.workspaceId}
                      </span>
                      <span className="flex-1 text-sm text-neutral-500 truncate">
                        {s.title || `Session ${s.id.slice(0, 6)}`}
                      </span>
                      <span className="text-xs text-neutral-600 font-mono hidden sm:block">
                        {formatCost(s.totalCostUsd)}
                      </span>
                      <span className="text-xs text-neutral-600 w-16 text-right">
                        {formatTimeAgo(s.lastActiveAt)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-neutral-600 py-4">No sessions yet</p>
            )}
          </div>

          {/* Recent jobs (background cron tasks) */}
          {recentJobs.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-4 w-4 text-neutral-500" />
                <h2 className="text-sm font-medium text-neutral-300">
                  Recent Jobs (background)
                </h2>
              </div>
              <div className="space-y-1">
                {recentJobs.slice(0, 5).map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/detail?id=${job.id}`}
                    className="flex items-center gap-4 rounded-md px-3 py-2.5 transition-colors hover:bg-neutral-800/40"
                  >
                    <JobStatusBadge status={job.status} />
                    <span className="text-sm font-mono text-neutral-400 w-32 truncate">
                      {job.agentId ?? "unknown"}
                    </span>
                    <span className="flex-1 text-sm text-neutral-500 truncate">
                      {job.objective}
                    </span>
                    <span className="text-xs text-neutral-600 font-mono hidden sm:block">
                      {formatCost(job.totalCostUsd)}
                    </span>
                    <span className="text-xs text-neutral-600 w-16 text-right">
                      {formatTimeAgo(job.createdAt)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
