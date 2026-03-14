"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AgentStatus } from "@/lib/api/types";
import { useAgents } from "@/hooks/use-api";

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

  return (
    <div>
      <h1 className="text-2xl font-bold">Agents</h1>
      <p className="mt-1 text-muted-foreground">
        Agent grid with real-time status.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
      ) : agents.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No agents registered. Create agents via the API.
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
                <p className="mt-2 text-xs text-muted-foreground">
                  Created {new Date(agent.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
