"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useActivity } from "@/hooks/use-api";

function actionColor(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action.includes("created")) return "default";
  if (action.includes("updated")) return "secondary";
  if (action.includes("deleted")) return "destructive";
  return "outline";
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function ActivityPage() {
  const { data: activities = [], isLoading } = useActivity({ limit: 50 });

  return (
    <div>
      <h1 className="text-2xl font-bold">Activity</h1>
      <p className="mt-1 text-muted-foreground">
        Unified activity feed across all agents.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
      ) : activities.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No activity recorded yet.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {activities.map((activity) => (
            <Card key={activity.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <Badge variant={actionColor(activity.action)}>
                    {activity.action}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {activity.agent_id.slice(0, 8)}
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
      )}
    </div>
  );
}
