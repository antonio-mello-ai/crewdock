"use client";

import { useState } from "react";
import Link from "next/link";
import { useJobs, useAgents } from "@/hooks/use-api";
import { JobStatusBadge } from "@/components/job-status-badge";
import { formatTimeAgo, formatDuration, formatCost } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const statusTabs = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "queued", label: "Queued" },
  { value: "cancelled", label: "Cancelled" },
];

export default function JobsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: jobsData, isLoading } = useJobs({
    status: statusFilter,
    limit: 50,
  });
  const { data: agentsData } = useAgents();

  const jobs = jobsData?.data ?? [];
  const agents = agentsData?.data ?? [];
  const agentMap = new Map(agents.map((a) => [a.id, a]));

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-100">
          Jobs
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          All agent execution jobs
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px cursor-pointer",
              statusFilter === tab.value
                ? "border-neutral-300 text-neutral-200"
                : "border-transparent text-neutral-500 hover:text-neutral-400"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-900/30 p-12 text-center">
          <p className="text-sm text-neutral-500">
            {statusFilter === "all"
              ? "No jobs yet"
              : `No ${statusFilter} jobs`}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-40">Agent</TableHead>
              <TableHead className="w-20">Type</TableHead>
              <TableHead>Objective</TableHead>
              <TableHead className="w-24 text-right">Duration</TableHead>
              <TableHead className="w-24 text-right">Cost</TableHead>
              <TableHead className="w-28 text-right">Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => {
              const agent = agentMap.get(job.agentId ?? "");
              const duration =
                job.startedAt && job.finishedAt
                  ? job.finishedAt - job.startedAt
                  : job.startedAt
                    ? Date.now() - job.startedAt
                    : 0;

              return (
                <TableRow key={job.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/jobs/${job.id}`} className="block">
                      <JobStatusBadge status={job.status} />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="block font-mono text-sm text-neutral-400"
                    >
                      {agent?.name ?? job.agentId ?? "-"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="block text-xs text-neutral-500 capitalize"
                    >
                      {job.type}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="block text-sm text-neutral-400 truncate max-w-md"
                    >
                      {job.objective}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="block text-xs text-neutral-500 font-mono"
                    >
                      {duration > 0 ? formatDuration(duration) : "-"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="block text-xs text-neutral-500 font-mono"
                    >
                      {job.totalCostUsd > 0
                        ? formatCost(job.totalCostUsd)
                        : "-"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="block text-xs text-neutral-600"
                    >
                      {job.createdAt
                        ? formatTimeAgo(job.createdAt)
                        : "-"}
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
