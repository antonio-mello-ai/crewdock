"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Activity } from "@/lib/api/types";

// Placeholder data — will be replaced by API calls + SSE
const PLACEHOLDER_ACTIVITIES: Activity[] = [
  {
    id: "1",
    action: "agent.created",
    payload: { name: "Nexus" },
    agent_id: "nexus",
    task_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    action: "task.created",
    payload: { title: "Morning Briefing" },
    agent_id: "atlas",
    task_id: "task-1",
    created_at: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: "3",
    action: "agent.updated",
    payload: { fields: ["status"] },
    agent_id: "bernard",
    task_id: null,
    created_at: new Date(Date.now() - 120000).toISOString(),
  },
];

function actionColor(action: string): string {
  if (action.includes("created")) return "default";
  if (action.includes("updated")) return "secondary";
  if (action.includes("deleted")) return "destructive";
  return "outline";
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function ActivityPage() {
  const activities = PLACEHOLDER_ACTIVITIES;

  return (
    <div>
      <h1 className="text-2xl font-bold">Activity</h1>
      <p className="mt-1 text-muted-foreground">
        Unified activity feed across all agents.
      </p>

      <div className="mt-4 space-y-2">
        {activities.map((activity) => (
          <Card key={activity.id}>
            <CardContent className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <Badge
                  variant={
                    actionColor(activity.action) as
                      | "default"
                      | "secondary"
                      | "destructive"
                      | "outline"
                  }
                >
                  {activity.action}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {activity.agent_id}
                </span>
                {activity.payload && (
                  <span className="text-sm">
                    {Object.values(activity.payload).join(", ")}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatTime(activity.created_at)}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
