"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Task, TaskStatus } from "@/lib/api/types";

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: "scheduled", label: "Scheduled", color: "bg-slate-100" },
  { status: "queued", label: "Queue", color: "bg-blue-50" },
  { status: "in_progress", label: "In Progress", color: "bg-yellow-50" },
  { status: "done", label: "Done", color: "bg-green-50" },
];

// Placeholder data — will be replaced by API calls
const PLACEHOLDER_TASKS: Task[] = [
  {
    id: "1",
    title: "Morning Briefing",
    description: "Daily briefing for Antonio",
    status: "scheduled",
    schedule: "0 7 * * *",
    is_recurring: true,
    last_run_at: null,
    next_run_at: null,
    agent_id: "atlas",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Infra Health Check",
    description: "Check all VMs and services",
    status: "scheduled",
    schedule: "0 6 * * *",
    is_recurring: true,
    last_run_at: null,
    next_run_at: null,
    agent_id: "nexus",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

function TaskCard({ task }: { task: Task }) {
  return (
    <Card className="mb-2">
      <CardContent className="p-3">
        <p className="text-sm font-medium">{task.title}</p>
        {task.description && (
          <p className="mt-1 text-xs text-muted-foreground">
            {task.description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2">
          {task.schedule && (
            <Badge variant="outline" className="text-xs">
              {task.schedule}
            </Badge>
          )}
          {task.is_recurring && (
            <Badge variant="secondary" className="text-xs">
              Recurring
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TasksPage() {
  const tasks = PLACEHOLDER_TASKS;

  return (
    <div>
      <h1 className="text-2xl font-bold">Tasks</h1>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.status);
          return (
            <div key={col.status} className={`rounded-lg p-3 ${col.color}`}>
              <CardHeader className="p-0 pb-3">
                <CardTitle className="flex items-center justify-between text-sm font-semibold">
                  {col.label}
                  <Badge variant="secondary">{columnTasks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <div className="min-h-[100px] lg:min-h-[200px]">
                {columnTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
