"use client";

import { useState } from "react";
import { useHitlRequests, useRespondHitl, useAgents } from "@/hooks/use-api";
import { HitlCard } from "@/components/hitl-card";
import { cn } from "@/lib/utils";
import { Inbox, Loader2 } from "lucide-react";

const filters = [
  { value: undefined, label: "All" },
  { value: "pending", label: "Pending" },
  { value: "responded", label: "Responded" },
  { value: "expired", label: "Expired" },
] as const;

export default function InboxPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined
  );

  const { data: hitlData, isLoading } = useHitlRequests(statusFilter);
  const { data: agentsData } = useAgents();
  const respondHitl = useRespondHitl();

  const requests = hitlData?.data ?? [];
  const agents = agentsData?.data ?? [];

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return undefined;
    const agent = agents.find((a) => a.id === agentId);
    return agent?.name ?? agentId;
  };

  const handleRespond = (id: string, response: string) => {
    respondHitl.mutate({ id, response });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-100">
            Inbox
          </h1>
          {pendingCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-amber-900/30 px-2.5 py-0.5 text-xs font-medium text-amber-400">
              {pendingCount} pending
            </span>
          )}
        </div>

        {/* Filter */}
        <div className="flex items-center rounded-lg border border-neutral-800 bg-neutral-900/40 p-0.5">
          {filters.map((f) => (
            <button
              key={f.label}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                statusFilter === f.value
                  ? "bg-neutral-800 text-neutral-100 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-300"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-neutral-500 mb-6">
        Human-in-the-loop requests from your agents
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
        </div>
      ) : requests.length > 0 ? (
        <div className="space-y-3">
          {requests.map((request) => (
            <HitlCard
              key={request.id}
              request={request}
              agentName={getAgentName(request.agentId)}
              onRespond={handleRespond}
              isResponding={respondHitl.isPending}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/50">
            <Inbox className="h-6 w-6 text-neutral-600" />
          </div>
          <h2 className="text-base font-medium text-neutral-300">
            No requests
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            {statusFilter
              ? `No ${statusFilter} requests found`
              : "Agents will send requests here when they need human input"}
          </p>
        </div>
      )}
    </div>
  );
}
