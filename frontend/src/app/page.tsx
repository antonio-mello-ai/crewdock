"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Agent, AgentStatus } from "@/lib/api/types";

const AGENTS: Agent[] = [
  {
    id: "1",
    name: "Nexus",
    model: "claude-opus-4-6",
    status: "offline",
    description: "Admin/Orchestrator — infra, meta-tasks, coordination",
    avatar_url: null,
    config: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Bernard",
    model: "claude-opus-4-6",
    status: "offline",
    description: "Developer — PRs, code review, project check-ins",
    avatar_url: null,
    config: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Pulse",
    model: "claude-sonnet-4-6",
    status: "offline",
    description: "Content/Strategist — LinkedIn, market news",
    avatar_url: null,
    config: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "4",
    name: "Atlas",
    model: "claude-sonnet-4-6",
    status: "offline",
    description: "Assistant/Knowledge — briefings, intake, Telegram",
    avatar_url: null,
    config: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

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
  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">
        Agent overview, active tasks, and daily metrics.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {AGENTS.map((agent) => (
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

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today&apos;s Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">$0.00</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Activities Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
