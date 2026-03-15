"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Task, TaskStatus } from "@/lib/api/types";
import { useAgents, useTasks } from "@/hooks/use-api";
import { TaskForm } from "@/components/forms/task-form";
import { DeleteConfirm } from "@/components/forms/delete-confirm";
import { deleteTask, updateTask } from "@/lib/api/mutations";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: "scheduled", label: "Scheduled", color: "bg-slate-100 dark:bg-slate-900" },
  { status: "queued", label: "Queue", color: "bg-blue-50 dark:bg-blue-950" },
  { status: "in_progress", label: "In Progress", color: "bg-yellow-50 dark:bg-yellow-950" },
  { status: "done", label: "Done", color: "bg-green-50 dark:bg-green-950" },
];

function TaskCard({
  task,
  agents,
  onStatusChange,
  onDelete,
}: {
  task: Task;
  agents: { id: string; name: string }[];
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const agentName = agents.find((a) => a.id === task.agent_id)?.name ?? "—";
  const nextStatuses: Record<string, string[]> = {
    scheduled: ["queued", "in_progress"],
    queued: ["in_progress", "scheduled"],
    in_progress: ["done", "failed"],
    done: ["scheduled"],
    failed: ["queued", "scheduled"],
  };
  const available = nextStatuses[task.status] ?? [];

  return (
    <Card className="mb-2">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium">{task.title}</p>
          <span className="text-xs text-muted-foreground">{agentName}</span>
        </div>
        {task.description && (
          <p className="mt-1 text-xs text-muted-foreground">
            {task.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1">
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
        <div className="mt-2 flex flex-wrap gap-1">
          {available.map((s) => (
            <Button
              key={s}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onStatusChange(task.id, s)}
            >
              → {s.replace("_", " ")}
            </Button>
          ))}
          <DeleteConfirm
            title={`Delete "${task.title}"?`}
            description="This task will be permanently deleted."
            onConfirm={() => onDelete(task.id)}
            trigger={
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive">
                Delete
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function TasksPage() {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: agents = [] } = useAgents();
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateTask(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        {agents.length > 0 && (
          <TaskForm
            agents={agents}
            trigger={<Button>New Task</Button>}
          />
        )}
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
      ) : tasks.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No tasks yet. {agents.length === 0 ? "Create an agent first." : 'Click "New Task" to create one.'}
        </p>
      ) : (
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
                    <TaskCard
                      key={task.id}
                      task={task}
                      agents={agents}
                      onStatusChange={(id, status) =>
                        statusMutation.mutate({ id, status })
                      }
                      onDelete={(id) => deleteMutation.mutate(id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
