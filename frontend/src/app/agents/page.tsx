"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Agent, AgentStatus } from "@/lib/api/types";
import { useAgents } from "@/hooks/use-api";
import { AgentForm } from "@/components/forms/agent-form";
import { DeleteConfirm } from "@/components/forms/delete-confirm";
import { deleteAgent } from "@/lib/api/mutations";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, MessageSquare, Pencil, Trash2, Plus } from "lucide-react";

const AGENT_COLORS = [
  "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "bg-purple-500/10 text-purple-500 border-purple-500/20",
  "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "bg-pink-500/10 text-pink-500 border-pink-500/20",
  "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
];

function statusColor(status: AgentStatus): string {
  switch (status) {
    case "online":
      return "bg-emerald-500";
    case "busy":
      return "bg-yellow-500";
    case "error":
      return "bg-red-500";
    default:
      return "bg-slate-400";
  }
}

function AgentCard({ agent, index, onDelete }: { agent: Agent; index: number; onDelete: () => void }) {
  const colorClass = AGENT_COLORS[index % AGENT_COLORS.length];
  return (
    <Card className="group transition-all duration-200 hover:shadow-lg hover:border-primary/20">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${colorClass}`}>
            <Bot className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base truncate">{agent.name}</h3>
              <div className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${statusColor(agent.status)}`} />
                <span className="text-xs text-muted-foreground">{agent.status}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{agent.model}</p>
            {agent.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{agent.description}</p>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 pt-3 border-t">
          <Link href={`/agents/${agent.id}/chat`} className="flex-1">
            <Button size="sm" className="w-full gap-2">
              <MessageSquare className="h-3.5 w-3.5" />
              Chat
            </Button>
          </Link>
          <AgentForm
            agent={agent}
            trigger={
              <Button variant="outline" size="sm" className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            }
          />
          <DeleteConfirm
            title={`Delete ${agent.name}?`}
            description="This will permanently delete the agent and all associated data."
            onConfirm={onDelete}
            trigger={
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AgentsPage() {
  const { data: agents = [], isLoading } = useAgents();
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-sm text-muted-foreground">
            {agents.length} agent{agents.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <AgentForm trigger={<Button className="gap-2"><Plus className="h-4 w-4" />New Agent</Button>} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5">
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 rounded bg-muted" />
                    <div className="h-3 w-32 rounded bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-1">No agents yet</p>
            <p className="text-sm text-muted-foreground mb-4">Create your first AI crew member.</p>
            <AgentForm trigger={<Button className="gap-2"><Plus className="h-4 w-4" />Create Agent</Button>} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent, i) => (
            <AgentCard key={agent.id} agent={agent} index={i} onDelete={() => deleteMutation.mutate(agent.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
