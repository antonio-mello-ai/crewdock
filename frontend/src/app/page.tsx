"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Agent } from "@/lib/api/types";
import { useAgents, useTasks, useActivity } from "@/hooks/use-api";
import { AgentForm } from "@/components/forms/agent-form";
import { PageHeader } from "@/components/atoms/page-header";
import { StatCard } from "@/components/atoms/stat-card";
import { SectionLabel } from "@/components/atoms/section-label";
import { OnboardingWelcome } from "@/components/onboarding";
import { AGENT_COLORS, statusDotColor } from "@/lib/agent-colors";
import {
  Bot,
  ListTodo,
  Activity,
  MessageSquare,
  Plus,
} from "lucide-react";

// Agent colors and status from shared utilities

function AgentCard({ agent, index }: { agent: Agent; index: number }) {
  const colorClass = AGENT_COLORS[index % AGENT_COLORS.length];
  return (
    <Link href={`/agents/${agent.id}/chat`}>
      <Card className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${colorClass}`}
            >
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold truncate">{agent.name}</p>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`h-2 w-2 rounded-full ${statusDotColor(agent.status)}`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {agent.status}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {agent.model}
              </p>
              {agent.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {agent.description}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const { data: agents = [] } = useAgents();
  const { data: tasks = [] } = useTasks();
  const { data: activities = [] } = useActivity({ limit: 100 });

  const activeTasks = tasks.filter(
    (t) => t.status === "in_progress" || t.status === "queued"
  );
  const onlineAgents = agents.filter((a) => a.status === "online");

  // Show onboarding when no agents exist
  if (agents.length === 0 && tasks.length === 0) {
    return <OnboardingWelcome />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`${agents.length} agents \u00b7 ${tasks.length} tasks \u00b7 ${activities.length} activities`}
        action={
          <AgentForm
            trigger={
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Agent
              </Button>
            }
          />
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Agents"
          value={agents.length}
          icon={Bot}
        />
        <StatCard
          title="Active Tasks"
          value={activeTasks.length}
          icon={ListTodo}
        />
        <StatCard
          title="Activities"
          value={activities.length}
          icon={Activity}
        />
        <StatCard
          title="Online"
          value={onlineAgents.length}
          icon={MessageSquare}
        />
      </div>

      {/* Agents */}
      <div>
        <SectionLabel>Your Crew</SectionLabel>
        {agents.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {agents.map((agent, i) => (
              <AgentCard key={agent.id} agent={agent} index={i} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Bot className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                No agents yet. Create your first crew member.
              </p>
              <AgentForm
                trigger={
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Agent
                  </Button>
                }
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      {activities.length > 0 && (
        <div>
          <SectionLabel
            action={
              <Link
                href="/activity"
                className="text-xs text-muted-foreground hover:text-foreground transition"
              >
                View all
              </Link>
            }
          >
            Recent Activity
          </SectionLabel>
          <Card>
            <CardContent className="p-0">
              {activities.slice(0, 5).map((act, i) => (
                <div
                  key={act.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i < Math.min(activities.length, 5) - 1
                      ? "border-b"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        act.action.includes("created")
                          ? "default"
                          : act.action.includes("deleted")
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {act.action}
                    </Badge>
                    {act.payload && (
                      <span className="text-sm text-muted-foreground">
                        {Object.values(act.payload).join(", ")}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(act.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
