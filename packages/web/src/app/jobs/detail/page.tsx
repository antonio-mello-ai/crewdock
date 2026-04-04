"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useJob, useAgents, useJobLogs } from "@/hooks/use-api";
import { LogViewer } from "@/components/log-viewer";
import { JobStatusBadge } from "@/components/job-status-badge";
import { formatDuration, formatCost, WS_URL } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  DollarSign,
  Cpu,
  Hash,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";

function JobDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const { data: jobData, isLoading } = useJob(id || undefined);
  const { data: agentsData } = useAgents();
  const job = jobData?.data;
  const agents = agentsData?.data ?? [];
  const agent = agents.find((a) => a.id === job?.agentId);

  const duration = useMemo(() => {
    if (!job?.startedAt) return 0;
    if (job.finishedAt) return job.finishedAt - job.startedAt;
    return Date.now() - job.startedAt;
  }, [job?.startedAt, job?.finishedAt]);

  const isStreaming = job?.status === "running" || job?.status === "queued";
  const { data: logsData } = useJobLogs(id, !isStreaming && !!job);
  const logLines = logsData?.data?.lines ?? [];

  if (!id) {
    return (
      <div className="p-6">
        <p className="text-neutral-500">No job ID provided</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6">
        <p className="text-neutral-500">Job not found</p>
      </div>
    );
  }

  const startedDate = job.startedAt
    ? new Date(job.startedAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "medium",
      })
    : "-";

  const finishedDate = job.finishedAt
    ? new Date(job.finishedAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "medium",
      })
    : "-";

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/jobs">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span className="text-sm font-mono text-neutral-500 truncate">
            {job.id}
          </span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-lg font-semibold text-neutral-100">
                {agent?.name ?? job.agentId ?? "Unknown Agent"}
              </h1>
              <JobStatusBadge status={job.status} />
            </div>
            <p className="text-sm text-neutral-500">{job.objective}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 lg:gap-6 border-b border-border bg-neutral-950/20 px-6 py-3">
        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
          <Clock className="h-3 w-3" />
          <span className="font-mono">{formatDuration(duration)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
          <DollarSign className="h-3 w-3" />
          <span className="font-mono">{formatCost(job.totalCostUsd)}</span>
        </div>
        <Separator orientation="vertical" className="h-4 hidden lg:block" />
        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
          <ArrowDownRight className="h-3 w-3" />
          <span className="font-mono">{(job.totalTokensIn / 1000).toFixed(1)}K in</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
          <ArrowUpRight className="h-3 w-3" />
          <span className="font-mono">{(job.totalTokensOut / 1000).toFixed(1)}K out</span>
        </div>
        <Separator orientation="vertical" className="h-4 hidden lg:block" />
        {agent?.model && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Cpu className="h-3 w-3" />
            <span className="font-mono">{agent.model}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
          <Hash className="h-3 w-3" />
          <span className="font-mono">exit {job.exitCode ?? (isStreaming ? "..." : "-")}</span>
        </div>
        <Separator orientation="vertical" className="h-4 hidden lg:block" />
        <div className="flex items-center gap-1.5 text-xs text-neutral-600">
          <FileText className="h-3 w-3" />
          <span>{startedDate}</span>
          {job.finishedAt && (
            <>
              <span className="text-neutral-700 mx-1">to</span>
              <span>{finishedDate}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex-1 p-4 min-h-0">
        {isStreaming ? (
          <LogViewer wsUrl={`${WS_URL}/ws/jobs/${job.id}/logs`} />
        ) : (
          <LogViewer lines={logLines} />
        )}
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-5 w-5 animate-spin text-neutral-500" /></div>}>
      <JobDetailContent />
    </Suspense>
  );
}
