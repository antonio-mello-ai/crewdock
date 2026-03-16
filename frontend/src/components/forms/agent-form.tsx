"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
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
import type { Agent } from "@/lib/api/types";
import { createAgent, updateAgent } from "@/lib/api/mutations";

const agentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  model: z.string().min(1, "Model is required").max(100, "Model too long"),
  description: z.string().max(1000, "Description too long").optional(),
});

interface AgentFormProps {
  agent?: Agent;
  trigger: React.ReactNode;
}

export function AgentForm({ agent, trigger }: AgentFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(agent?.name ?? "");
  const [model, setModel] = useState(agent?.model ?? "claude-sonnet-4-6");
  const [description, setDescription] = useState(agent?.description ?? "");
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      agent
        ? updateAgent(agent.id, { name, model, description, system_prompt: systemPrompt || undefined })
        : createAgent({ name, model, description, system_prompt: systemPrompt || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success(agent ? `${name} updated` : `${name} created`);
      setOpen(false);
      setErrors({});
      if (!agent) {
        setName("");
        setModel("claude-sonnet-4-6");
        setDescription("");
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save agent");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = agentSchema.safeParse({ name, model, description });
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
          <DialogTitle>{agent ? "Edit Agent" : "New Agent"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
              placeholder="e.g. Atlas"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <select
              id="model"
              value={model}
              onChange={(e) => { setModel(e.target.value); setErrors((p) => ({ ...p, model: "" })); }}
              className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors ${errors.model ? "border-destructive" : ""}`}
            >
              <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (fast, affordable)</option>
              <option value="claude-opus-4-6">Claude Opus 4.6 (most capable)</option>
              <option value="claude-haiku-4-5">Claude Haiku 4.5 (fastest, cheapest)</option>
            </select>
            {errors.model && <p className="text-xs text-destructive">{errors.model}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this agent do?"
              rows={3}
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="system_prompt">System Prompt</Label>
            <Textarea
              id="system_prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Instructions for the agent's personality and behavior..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Defines how the agent responds. Leave empty to use the description.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : agent ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
