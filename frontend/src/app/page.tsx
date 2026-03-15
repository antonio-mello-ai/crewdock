"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgentStatus } from "@/lib/api/types";
import { useAgents, useTasks, useActivity } from "@/hooks/use-api";
import { AgentForm } from "@/components/forms/agent-form";

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

export default function DashboardPage() {
  const { data: agents = [] } = useAgents();
  const { data: tasks = [] } = useTasks();
  const { data: activities = [] } = useActivity({ limit: 100 });

  const activeTasks = tasks.filter(
    (t) => t.status === "in_progress" || t.status === "queued"
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Agent overview, active tasks, and daily metrics.
          </p>
        </div>
        <AgentForm trigger={<Button>New Agent</Button>} />
      </div>

      {agents.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <p className="mt-1 text-sm">{agent.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          No agents registered yet. Create agents via the API.
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeTasks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tasks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activities.length}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
