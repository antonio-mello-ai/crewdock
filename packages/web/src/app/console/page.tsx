"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useAgents, useCreateJob, useJob } from "@/hooks/use-api";
import { LogViewer } from "@/components/log-viewer";
import { JobStatusBadge } from "@/components/job-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatDuration, formatCost, WS_URL } from "@/lib/utils";
import {
  Play,
  Bot,
  Zap,
  Loader2,
  Terminal,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
} from "lucide-react";


export default function ConsolePage() {
  const { data: agentsData } = useAgents();
  const agents = agentsData?.data ?? [];

  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [selectedMode, setSelectedMode] = useState<string>("");
  const [objective, setObjective] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | undefined>();

  const createJob = useCreateJob();
  const { data: jobData } = useJob(activeJobId);
  const activeJob = jobData?.data;

  // Current agent
  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId),
    [agents, selectedAgentId]
  );

  // Available modes for selected agent
  const modes = selectedAgent?.modes ?? [];

  // Auto-select first agent
  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  // Auto-select first mode when agent changes
  useEffect(() => {
    if (modes.length > 0) {
      setSelectedMode(modes[0]);
    } else {
      setSelectedMode("");
    }
  }, [selectedAgentId, modes]);

  // Track elapsed time
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (activeJob?.status === "running" && activeJob.startedAt) {
      setElapsed(Date.now() - activeJob.startedAt);
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - activeJob.startedAt!);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (activeJob?.startedAt && activeJob?.finishedAt) {
        setElapsed(activeJob.finishedAt - activeJob.startedAt);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeJob?.status, activeJob?.startedAt, activeJob?.finishedAt]);

  const handleRun = () => {
    if (!selectedAgentId || !objective.trim()) return;
    createJob.mutate(
      {
        type: "agent",
        agentId: selectedAgentId,
        mode: selectedMode || undefined,
        objective: objective.trim(),
      },
      {
        onSuccess: (res) => {
          setActiveJobId(res.data.id);
        },
      }
    );
  };

  const isRunning = activeJob?.status === "running" || activeJob?.status === "queued";
  const isDone = activeJob?.status === "completed" || activeJob?.status === "failed" || activeJob?.status === "cancelled";

  return (
    <div className="flex h-full flex-col">
      {/* Top bar — controls */}
      <div className="border-b border-border bg-neutral-950/30 px-6 py-4">
        <div className="flex items-center gap-3">
          {/* Agent selector */}
          <div className="w-52">
            <Select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              icon={<Bot className="h-3.5 w-3.5" />}
            >
              <option value="" disabled>
                Select agent
              </option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Mode selector */}
          {modes.length > 0 && (
            <div className="w-40">
              <Select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                icon={<Zap className="h-3.5 w-3.5" />}
              >
                {modes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Objective */}
          <div className="flex-1">
            <Input
              placeholder="Objective — what should the agent do?"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isRunning) handleRun();
              }}
              className="bg-neutral-900/50 border-neutral-800 font-mono text-sm"
            />
          </div>

          {/* Run button */}
          <Button
            onClick={handleRun}
            disabled={!selectedAgentId || !objective.trim() || createJob.isPending || isRunning}
            className="gap-2 px-5 font-medium"
          >
            {createJob.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run
          </Button>
        </div>
      </div>

      {/* Status bar */}
      {activeJob && (
        <div className="flex items-center gap-4 border-b border-border bg-neutral-950/20 px-6 py-2">
          <JobStatusBadge status={activeJob.status} />

          <span className="text-xs text-neutral-400 font-mono">
            {selectedAgent?.name ?? activeJob.agentId}
          </span>

          <Separator orientation="vertical" className="h-4" />

          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Clock className="h-3 w-3" />
            <span className="font-mono">{formatDuration(elapsed)}</span>
          </div>

          {isDone && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                <DollarSign className="h-3 w-3" />
                <span className="font-mono">
                  {formatCost(activeJob.totalCostUsd)}
                </span>
              </div>

              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-1.5 text-xs">
                {activeJob.status === "completed" ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span className="text-green-500">
                      Exit {activeJob.exitCode ?? 0}
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 text-red-500" />
                    <span className="text-red-500">
                      Exit {activeJob.exitCode ?? 1}
                    </span>
                  </>
                )}
              </div>
            </>
          )}

          {isRunning && (
            <span className="ml-auto text-xs text-neutral-600 animate-pulse">
              Streaming...
            </span>
          )}
        </div>
      )}

      {/* Terminal area */}
      <div className="flex-1 p-4 min-h-0">
        {activeJobId ? (
          <LogViewer
            wsUrl={`${WS_URL}/ws/jobs/${activeJobId}/logs`}
          />
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-neutral-800 bg-neutral-950/30">
            <div className="text-center">
              <Terminal className="mx-auto h-8 w-8 text-neutral-700 mb-3" />
              <p className="text-sm text-neutral-600">
                Select an agent and enter an objective to start
              </p>
              <p className="mt-1 text-xs text-neutral-700">
                Output will stream here in real time
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
