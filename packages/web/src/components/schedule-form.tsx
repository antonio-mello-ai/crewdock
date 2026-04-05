"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateSchedule } from "@/hooks/use-api";
import { X, Loader2, Plus } from "lucide-react";

interface ScheduleFormProps {
  onClose: () => void;
  onCreated?: () => void;
}

const CALENDAR_EXAMPLES = [
  { label: "Daily at 3am", value: "*-*-* 03:00:00" },
  { label: "Every 15 minutes", value: "*:0/15" },
  { label: "Hourly", value: "hourly" },
  { label: "Every Monday 9am", value: "Mon *-*-* 09:00:00" },
  { label: "Weekly (Sunday)", value: "weekly" },
];

export function ScheduleForm({ onClose, onCreated }: ScheduleFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [command, setCommand] = useState("/home/claude/");
  const [onCalendar, setOnCalendar] = useState("*-*-* 03:00:00");

  const createSchedule = useCreateSchedule();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      createSchedule.mutate(
        { name, description, command, onCalendar },
        {
          onSuccess: () => {
            onCreated?.();
            onClose();
          },
        }
      );
    },
    [name, description, command, onCalendar, createSchedule, onCreated, onClose]
  );

  const errorMsg = createSchedule.error?.message;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-lg border border-neutral-800 bg-neutral-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
          <h2 className="text-sm font-semibold text-neutral-200">New schedule</h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Name (lowercase, hyphens allowed)
            </label>
            <Input
              name="schedule-name"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase())}
              placeholder="my-backup-job"
              required
              pattern="[a-z][a-z0-9_\-]{1,62}"
              className="font-mono text-sm"
            />
            <p className="text-[10px] text-neutral-600 mt-1">
              Will create <code>{name || "name"}.timer</code> and{" "}
              <code>{name || "name"}.service</code>
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Description
            </label>
            <Input
              name="schedule-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Daily database backup"
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Command (absolute path)
            </label>
            <Input
              name="schedule-command"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="/home/claude/scripts/backup.sh"
              required
              className="font-mono text-sm"
            />
            <p className="text-[10px] text-neutral-600 mt-1">
              Must start with <code>/home/claude/</code>, <code>/usr/bin/</code>,{" "}
              <code>/bin/</code>, or <code>/usr/local/bin/</code>
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Schedule (OnCalendar syntax)
            </label>
            <Input
              name="schedule-oncalendar"
              value={onCalendar}
              onChange={(e) => setOnCalendar(e.target.value)}
              placeholder="*-*-* 03:00:00"
              required
              className="font-mono text-sm"
            />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {CALENDAR_EXAMPLES.map((ex) => (
                <button
                  key={ex.value}
                  type="button"
                  onClick={() => setOnCalendar(ex.value)}
                  className="text-[10px] px-2 py-0.5 rounded bg-neutral-800/60 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300 transition-colors"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={createSchedule.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={createSchedule.isPending}>
              {createSchedule.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Plus className="h-3.5 w-3.5 mr-1.5" />
              )}
              Create
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
