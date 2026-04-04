"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  FolderOpen,
  Loader2,
  Check,
} from "lucide-react";
import { DAEMON_URL } from "@/lib/utils";
import type { Workspace, ApiListResponse } from "@aios/shared";

interface WorkspaceOverride {
  name?: string;
  group?: string;
  hidden?: boolean;
  order?: number;
}

type ConfigMap = Record<string, WorkspaceOverride>;

function api(path: string, opts?: RequestInit) {
  return fetch(`${DAEMON_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  }).then((r) => r.json());
}

export default function SettingsPage() {
  const qc = useQueryClient();

  // Fetch all discovered workspaces
  const { data: discoveredData, isLoading: loadingDiscovered } = useQuery<
    ApiListResponse<Workspace>
  >({
    queryKey: ["workspaces", "discovered"],
    queryFn: () => api("/api/workspaces/discovered"),
  });

  // Fetch current config
  const { data: configData, isLoading: loadingConfig } = useQuery<{
    data: ConfigMap;
  }>({
    queryKey: ["workspaces", "config"],
    queryFn: () => api("/api/workspaces/config"),
  });

  const [localConfig, setLocalConfig] = useState<ConfigMap>({});
  const [saved, setSaved] = useState(false);

  // Initialize local config from server
  useEffect(() => {
    if (configData?.data) {
      setLocalConfig(configData.data);
    }
  }, [configData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (config: ConfigMap) =>
      api("/api/workspaces/config", {
        method: "PUT",
        body: JSON.stringify(config),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  // Refresh mutation
  const refreshMutation = useMutation({
    mutationFn: () => api("/api/workspaces/refresh", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  const discovered = discoveredData?.data ?? [];

  const getOverride = useCallback(
    (id: string): WorkspaceOverride => localConfig[id] ?? {},
    [localConfig]
  );

  const updateOverride = useCallback(
    (id: string, update: Partial<WorkspaceOverride>) => {
      setLocalConfig((prev) => ({
        ...prev,
        [id]: { ...prev[id], ...update },
      }));
      setSaved(false);
    },
    []
  );

  const toggleHidden = useCallback(
    (id: string) => {
      const current = getOverride(id);
      updateOverride(id, { hidden: !current.hidden });
    },
    [getOverride, updateOverride]
  );

  const isLoading = loadingDiscovered || loadingConfig;

  // Group by ORIGINAL group (from discovery), not the edited override
  // This prevents re-grouping on every keystroke when editing group field
  const grouped = new Map<string, Workspace[]>();
  for (const ws of discovered) {
    const group = ws.group ?? "Other";
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)!.push(ws);
  }

  const visibleCount = discovered.filter(
    (ws) => !getOverride(ws.id).hidden
  ).length;

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-100">
            Settings
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manage workspaces — {visibleCount} of {discovered.length} visible
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="gap-1.5 text-neutral-400"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshMutation.isPending ? "animate-spin" : ""}`}
            />
            Rescan
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate(localConfig)}
            disabled={saveMutation.isPending || saved}
            className="gap-1.5"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saved ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([group, workspaces]) => (
            <div key={group}>
              <h2 className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-3">
                {group}
              </h2>
              <div className="space-y-1">
                {workspaces.map((ws) => {
                  const ov = getOverride(ws.id);
                  const isHidden = ov.hidden ?? false;
                  const displayName = ov.name ?? ws.name;

                  return (
                    <div
                      key={ws.id}
                      className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                        isHidden
                          ? "border-neutral-800/30 bg-neutral-950/20 opacity-50"
                          : "border-neutral-800/50 bg-neutral-900/30"
                      }`}
                    >
                      {/* Visibility toggle */}
                      <button
                        onClick={() => toggleHidden(ws.id)}
                        className="text-neutral-500 hover:text-neutral-300 transition-colors"
                      >
                        {isHidden ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>

                      {/* Icon */}
                      <FolderOpen className="h-4 w-4 text-neutral-600 shrink-0" />

                      {/* Name input */}
                      <Input
                        value={displayName}
                        onChange={(e) =>
                          updateOverride(ws.id, { name: e.target.value })
                        }
                        className="h-7 w-48 bg-transparent border-none px-1 text-sm font-medium text-neutral-200 focus:bg-neutral-800/50"
                      />

                      {/* Group input */}
                      <Input
                        value={ov.group ?? ws.group ?? ""}
                        onChange={(e) =>
                          updateOverride(ws.id, { group: e.target.value })
                        }
                        placeholder="Group"
                        className="h-7 w-28 bg-transparent border-none px-1 text-xs text-neutral-500 focus:bg-neutral-800/50"
                      />

                      {/* Path */}
                      <span className="flex-1 text-xs font-mono text-neutral-700 truncate">
                        {ws.path}
                      </span>

                      {/* Has CLAUDE.md badge */}
                      <Badge
                        variant="secondary"
                        className="text-[10px] shrink-0"
                      >
                        CLAUDE.md
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
