"use client";

import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Agent, Task } from "@/lib/api/types";
import { createTask, updateTask } from "@/lib/api/mutations";

const cronRegex = /^(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)$/;

const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  agentId: z.string().min(1, "Agent is required"),
  schedule: z.string().refine(
    (val) => val === "" || cronRegex.test(val),
    { message: "Invalid cron expression (e.g. 0 7 * * *)" }
  ),
});

interface TaskFormProps {
  task?: Task;
  agents: Agent[];
  trigger: React.ReactNode;
}

export function TaskForm({ task, agents, trigger }: TaskFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [agentId, setAgentId] = useState(task?.agent_id ?? agents[0]?.id ?? "");
  const [schedule, setSchedule] = useState(task?.schedule ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      const hasSchedule = schedule.trim().length > 0;
      return task
        ? updateTask(task.id, { title, description, agent_id: agentId, schedule, is_recurring: hasSchedule })
        : createTask({ title, description, agent_id: agentId, schedule: schedule || undefined, is_recurring: hasSchedule });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast.success(task ? "Task updated" : "Task created");
      setOpen(false);
      setErrors({});
      if (!task) {
        setTitle("");
        setDescription("");
        setSchedule("");
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save task");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = taskSchema.safeParse({ title, agentId, schedule });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: "" })); }}
              placeholder="e.g. Morning Briefing"
              className={errors.title ? "border-destructive" : ""}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent">Agent</Label>
            <select
              id="agent"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What should this task do?"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule">Schedule (cron expression)</Label>
            <Input
              id="schedule"
              value={schedule}
              onChange={(e) => { setSchedule(e.target.value); setErrors((p) => ({ ...p, schedule: "" })); }}
              placeholder="e.g. 0 7 * * * (every day at 7am)"
              className={errors.schedule ? "border-destructive" : ""}
            />
            {errors.schedule && <p className="text-xs text-destructive">{errors.schedule}</p>}
            {schedule && !errors.schedule && (
              <p className="text-xs text-muted-foreground">
                This task will run on a recurring schedule.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : task ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
