"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Task, TaskStatus } from "@/lib/api/types";
import { useAgents, useTasks } from "@/hooks/use-api";
import { TaskForm } from "@/components/forms/task-form";
import { DeleteConfirm } from "@/components/forms/delete-confirm";
import { deleteTask, runTask, updateTask } from "@/lib/api/mutations";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: "scheduled", label: "Scheduled", color: "bg-slate-100 dark:bg-slate-900" },
  { status: "queued", label: "Queue", color: "bg-blue-50 dark:bg-blue-950" },
  { status: "in_progress", label: "In Progress", color: "bg-yellow-50 dark:bg-yellow-950" },
  { status: "done", label: "Done", color: "bg-green-50 dark:bg-green-950" },
];

const VALID_TRANSITIONS: Record<string, string[]> = {
  scheduled: ["queued", "in_progress"],
  queued: ["in_progress", "scheduled"],
  in_progress: ["done", "failed"],
  done: ["scheduled"],
  failed: ["queued", "scheduled"],
};

function DraggableTaskCard({
  task,
  agents,
  onDelete,
  onRun,
}: {
  task: Task;
  agents: { id: string; name: string }[];
  onDelete: (id: string) => void;
  onRun: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });
  const agentName = agents.find((a) => a.id === task.agent_id)?.name ?? "—";

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`${isDragging ? "opacity-30" : ""}`}
    >
      <Card className="mb-2 cursor-grab active:cursor-grabbing">
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
          <div className="mt-2 flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onRun(task.id)}
            >
              Run Now
            </Button>
            <DeleteConfirm
              title={`Delete "${task.title}"?`}
              description="This task will be permanently deleted."
              onConfirm={() => onDelete(task.id)}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-destructive"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  Delete
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TaskCardOverlay({ task, agents }: { task: Task; agents: { id: string; name: string }[] }) {
  const agentName = agents.find((a) => a.id === task.agent_id)?.name ?? "—";
  return (
    <Card className="w-64 shadow-xl rotate-2">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium">{task.title}</p>
          <span className="text-xs text-muted-foreground">{agentName}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function DroppableColumn({
  status,
  label,
  color,
  count,
  children,
}: {
  status: string;
  label: string;
  color: string;
  count: number;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg p-3 transition-all ${color} ${
        isOver ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
      }`}
    >
      <CardHeader className="p-0 pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          {label}
          <Badge variant="secondary">{count}</Badge>
        </CardTitle>
      </CardHeader>
      <div className="min-h-[100px] lg:min-h-[200px]">{children}</div>
    </div>
  );
}

export default function TasksPage() {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: agents = [] } = useAgents();
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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

  const runMutation = useMutation({
    mutationFn: runTask,
    onSuccess: () => {
      toast.success("Task started");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
    onError: () => {
      toast.error("Failed to run task");
    },
  });

  function handleDragStart(event: DragStartEvent) {
    const task = event.active.data.current?.task as Task | undefined;
    setActiveTask(task ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const task = active.data.current?.task as Task | undefined;
    if (!task) return;

    const targetStatus = over.id as string;
    if (task.status === targetStatus) return;

    const allowed = VALID_TRANSITIONS[task.status] ?? [];
    if (!allowed.includes(targetStatus)) return;

    statusMutation.mutate({ id: task.id, status: targetStatus });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        {agents.length > 0 && (
          <TaskForm agents={agents} trigger={<Button>New Task</Button>} />
        )}
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
      ) : tasks.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No tasks yet.{" "}
          {agents.length === 0
            ? "Create an agent first."
            : 'Click "New Task" to create one.'}
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COLUMNS.map((col) => {
              const columnTasks = tasks.filter((t) => t.status === col.status);
              return (
                <DroppableColumn
                  key={col.status}
                  status={col.status}
                  label={col.label}
                  color={col.color}
                  count={columnTasks.length}
                >
                  {columnTasks.map((task) => (
                    <DraggableTaskCard
                      key={task.id}
                      task={task}
                      agents={agents}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      onRun={(id) => runMutation.mutate(id)}
                    />
                  ))}
                </DroppableColumn>
              );
            })}
          </div>
          <DragOverlay>
            {activeTask && (
              <TaskCardOverlay task={activeTask} agents={agents} />
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
