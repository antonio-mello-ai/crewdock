"use client";

import { useMemo } from "react";
import { useAgents, useJobs } from "@/hooks/use-api";
import { AgentCard } from "@/components/agent-card";
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
} from "lucide-react";
import type { Agent, Job } from "@aios/shared";
import Link from "next/link";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function OverviewPage() {
  const { data: agentsData, isLoading: agentsLoading } = useAgents();
  const { data: jobsData, isLoading: jobsLoading } = useJobs({ limit: 20 });

  const agents = agentsData?.data ?? [];
  const recentJobs = jobsData?.data ?? [];

  // Morning briefing: jobs from last 12 hours
  const briefing = useMemo(() => {
    const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
    const overnightJobs = recentJobs.filter(
      (j) => j.createdAt >= twelveHoursAgo
    );

    const completed = overnightJobs.filter((j) => j.status === "completed");
    const failed = overnightJobs.filter((j) => j.status === "failed");
    const running = overnightJobs.filter(
      (j) => j.status === "running" || j.status === "queued"
    );

    const totalCost = overnightJobs.reduce(
      (sum, j) => sum + j.totalCostUsd,
      0
    );

    return {
      jobs: overnightJobs,
      completed,
      failed,
      running,
      totalCost,
    };
  }, [recentJobs]);

  // Group agents by frente
  const frenteGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        name: string;
        agents: Agent[];
        recentJobs: Job[];
        hasFailures: boolean;
      }
    >();

    for (const agent of agents) {
      const frente = agent.frente ?? "ungrouped";
      if (!groups.has(frente)) {
        groups.set(frente, {
          name: frente,
          agents: [],
          recentJobs: [],
          hasFailures: false,
        });
      }
      groups.get(frente)!.agents.push(agent);
    }

    for (const job of recentJobs) {
      const agent = agents.find((a) => a.id === job.agentId);
      const frente = agent?.frente ?? "ungrouped";
      const group = groups.get(frente);
      if (group) {
        group.recentJobs.push(job);
        if (job.status === "failed") group.hasFailures = true;
      }
    }

    return Array.from(groups.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [agents, recentJobs]);

  const isLoading = agentsLoading || jobsLoading;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-100">
          Overview
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Agent frentes and recent activity
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
        </div>
      ) : (
        <>
          {/* Morning Briefing */}
          {briefing.jobs.length > 0 && (
            <div className="mb-8 rounded-lg border border-neutral-800/60 bg-neutral-900/30 overflow-hidden">
              {/* Briefing header */}
              <div className="px-5 py-4 border-b border-neutral-800/40">
                <div className="flex items-center gap-2.5">
                  <Sun className="h-4 w-4 text-amber-400/80" />
                  <h2 className="text-sm font-semibold text-neutral-200">
                    {getGreeting()}
                  </h2>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  {briefing.jobs.length} job
                  {briefing.jobs.length !== 1 ? "s" : ""} ran in the last 12
                  hours.{" "}
                  {briefing.completed.length > 0 &&
                    `${briefing.completed.length} completed`}
                  {briefing.failed.length > 0 &&
                    `, ${briefing.failed.length} need${briefing.failed.length === 1 ? "s" : ""} attention`}
                  .
                </p>
              </div>

              {/* Job summaries */}
              <div className="divide-y divide-neutral-800/30">
                {/* Failed jobs first */}
                {briefing.failed.map((job) => {
                  const agent = agents.find((a) => a.id === job.agentId);
                  return (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="flex items-start gap-3 px-5 py-3 hover:bg-neutral-800/20 transition-colors"
                    >
                      <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-200">
                          <span className="font-medium">
                            {agent?.name ?? job.agentId}
                          </span>{" "}
                          <span className="text-red-400/80">failed</span>
                          {job.objective && (
                            <span className="text-neutral-500">
                              {" "}
                              - {job.objective}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-neutral-600 mt-0.5">
                          {formatTimeAgo(job.createdAt)}
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-neutral-700 mt-1 shrink-0" />
                    </Link>
                  );
                })}

                {/* Completed jobs */}
                {briefing.completed.slice(0, 5).map((job) => {
                  const agent = agents.find((a) => a.id === job.agentId);
                  return (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="flex items-start gap-3 px-5 py-3 hover:bg-neutral-800/20 transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-500/70 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-300">
                          <span className="font-medium text-neutral-200">
                            {agent?.name ?? job.agentId}
                          </span>{" "}
                          completed
                          {job.objective && (
                            <span className="text-neutral-500">
                              {" "}
                              - {job.objective}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-neutral-600 mt-0.5">
                          {formatTimeAgo(job.createdAt)}
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-neutral-700 mt-1 shrink-0" />
                    </Link>
                  );
                })}

                {/* Running jobs */}
                {briefing.running.map((job) => {
                  const agent = agents.find((a) => a.id === job.agentId);
                  return (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="flex items-start gap-3 px-5 py-3 hover:bg-neutral-800/20 transition-colors"
                    >
                      <Loader2 className="h-4 w-4 text-blue-400 mt-0.5 shrink-0 animate-spin" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-300">
                          <span className="font-medium text-neutral-200">
                            {agent?.name ?? job.agentId}
                          </span>{" "}
                          running
                          {job.objective && (
                            <span className="text-neutral-500">
                              {" "}
                              - {job.objective}
                            </span>
                          )}
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-neutral-700 mt-1 shrink-0" />
                    </Link>
                  );
                })}
              </div>

              {/* Briefing footer */}
              <div className="px-5 py-3 border-t border-neutral-800/40 flex items-center gap-2 text-xs text-neutral-600">
                <DollarSign className="h-3 w-3" />
                <span>Total cost (12h): {formatCost(briefing.totalCost)}</span>
              </div>
            </div>
          )}

          {/* Frente cards grid */}
          {frenteGroups.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {frenteGroups.map((group) => (
                <AgentCard key={group.name} group={group} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-900/30 p-12 text-center">
              <p className="text-sm text-neutral-500">
                No agents registered. Start the daemon and register agents.
              </p>
            </div>
          )}

          <Separator className="my-8" />

          {/* Recent jobs */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-neutral-500" />
              <h2 className="text-sm font-medium text-neutral-300">
                Recent Jobs
              </h2>
            </div>

            {recentJobs.length > 0 ? (
              <div className="space-y-1">
                {recentJobs.map((job) => {
                  const agent = agents.find((a) => a.id === job.agentId);
                  return (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="flex items-center gap-4 rounded-md px-3 py-2.5 transition-colors hover:bg-neutral-800/40"
                    >
                      <JobStatusBadge status={job.status} />
                      <span className="text-sm font-mono text-neutral-400 w-32 truncate">
                        {agent?.name ?? job.agentId ?? "unknown"}
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
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-neutral-600 py-4">No jobs yet</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
