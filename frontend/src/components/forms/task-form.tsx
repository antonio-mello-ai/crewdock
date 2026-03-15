"use client";

import { useState } from "react";
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
  const [isRecurring, setIsRecurring] = useState(task?.is_recurring ?? false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      task
        ? updateTask(task.id, { title, description, agent_id: agentId, schedule, is_recurring: isRecurring })
        : createTask({ title, description, agent_id: agentId, schedule: schedule || undefined, is_recurring: isRecurring }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      setOpen(false);
      if (!task) {
        setTitle("");
        setDescription("");
        setSchedule("");
        setIsRecurring(false);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Morning Briefing"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent">Agent</Label>
            <select
              id="agent"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
              required
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
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
            <Label htmlFor="schedule">Schedule (cron)</Label>
            <Input
              id="schedule"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="e.g. 0 7 * * * (optional)"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="recurring">Recurring</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? "Saving..."
                : task
                  ? "Save"
                  : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
