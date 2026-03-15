"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgentStatus } from "@/lib/api/types";
import { useAgents } from "@/hooks/use-api";
import { AgentForm } from "@/components/forms/agent-form";
import { DeleteConfirm } from "@/components/forms/delete-confirm";
import { deleteAgent } from "@/lib/api/mutations";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function statusVariant(
  status: AgentStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "online":
      return "default";
    case "busy":
      return "secondary";
    case "error":
      return "destructive";
    default:
      return "outline";
  }
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
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your AI agents.
          </p>
        </div>
        <AgentForm
          trigger={<Button>New Agent</Button>}
        />
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
      ) : agents.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No agents yet. Click &quot;New Agent&quot; to create one.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  {agent.name}
                  <Badge variant={statusVariant(agent.status)}>
                    {agent.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{agent.model}</p>
                {agent.description && (
                  <p className="mt-1 text-sm">{agent.description}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <Link href={`/agents/${agent.id}/chat`}>
                    <Button size="sm">Chat</Button>
                  </Link>
                  <AgentForm
                    agent={agent}
                    trigger={
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    }
                  />
                  <DeleteConfirm
                    title={`Delete ${agent.name}?`}
                    description="This will permanently delete the agent and all associated tasks, activities, and costs."
                    onConfirm={() => deleteMutation.mutate(agent.id)}
                    trigger={
                      <Button variant="outline" size="sm">
                        Delete
                      </Button>
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
