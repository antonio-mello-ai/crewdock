"use client";

import { useMemo } from "react";
import { useAgents, useJobs } from "@/hooks/use-api";
import { AgentCard } from "@/components/agent-card";
import { JobStatusBadge } from "@/components/job-status-badge";
import { formatTimeAgo, formatCost } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Activity, Loader2 } from "lucide-react";
import type { Agent, Job } from "@aios/shared";
import Link from "next/link";

export default function OverviewPage() {
  const { data: agentsData, isLoading: agentsLoading } = useAgents();
  const { data: jobsData, isLoading: jobsLoading } = useJobs({ limit: 10 });

  const agents = agentsData?.data ?? [];
  const recentJobs = jobsData?.data ?? [];

  // Group agents by frente
  const frenteGroups = useMemo(() => {
    const groups = new Map<
      string,
      { name: string; agents: Agent[]; recentJobs: Job[]; hasFailures: boolean }
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

    // Assign jobs to frentes
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
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
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
                      <span className="text-xs text-neutral-600 font-mono">
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
