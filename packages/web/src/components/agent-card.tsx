"use client";

import type { Agent, Job } from "@aios/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { JobStatusBadge } from "@/components/job-status-badge";
import { formatTimeAgo } from "@/lib/utils";
import { Bot, Layers } from "lucide-react";

interface FrenteGroup {
  name: string;
  agents: Agent[];
  recentJobs: Job[];
  hasFailures: boolean;
}

export function AgentCard({ group }: { group: FrenteGroup }) {
  const runningCount = group.recentJobs.filter(
    (j) => j.status === "running"
  ).length;

  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:border-neutral-700 hover:shadow-md hover:shadow-black/20">
      {/* Subtle top accent line */}
      <div
        className={`absolute top-0 left-0 right-0 h-px ${
          group.hasFailures
            ? "bg-red-500/60"
            : runningCount > 0
              ? "bg-blue-500/60"
              : "bg-green-500/30"
        }`}
      />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-neutral-200">
            {group.name}
          </CardTitle>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Bot className="h-3.5 w-3.5" />
            <span className="text-xs">{group.agents.length}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Agents list */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {group.agents.map((agent) => (
            <span
              key={agent.id}
              className="rounded bg-neutral-800/80 px-2 py-0.5 text-xs text-neutral-400 font-mono"
            >
              {agent.name}
            </span>
          ))}
        </div>

        {/* Recent jobs */}
        {group.recentJobs.length > 0 ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <Layers className="h-3 w-3" />
              <span>{group.recentJobs.length} jobs (24h)</span>
            </div>
            {group.recentJobs.slice(0, 3).map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <JobStatusBadge status={job.status} />
                  <span className="truncate text-neutral-400 max-w-[140px]">
                    {job.objective}
                  </span>
                </div>
                <span className="text-muted-foreground whitespace-nowrap ml-2">
                  {formatTimeAgo(job.createdAt)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No recent jobs</p>
        )}
      </CardContent>
    </Card>
  );
}
