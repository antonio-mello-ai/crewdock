"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useWorkspaces } from "@/hooks/use-api";
import dynamic from "next/dynamic";

const TerminalView = dynamic(() => import("@/components/terminal-view").then(m => m.TerminalView), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-neutral-600 text-sm">Loading terminal...</div>,
});
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DAEMON_URL } from "@/lib/utils";
import { FolderOpen, Plus, Loader2, X, SquareTerminal } from "lucide-react";

interface ActiveTerminal {
  id: string;
  workspaceId: string;
  workspaceName: string;
}

export default function TerminalPage() {
  const { data: workspacesData } = useWorkspaces();
  const workspaces = workspacesData?.data ?? [];

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [terminals, setTerminals] = useState<ActiveTerminal[]>([]);
  const [activeTerminalIdx, setActiveTerminalIdx] = useState<number>(-1);
  const [creating, setCreating] = useState(false);

  // Auto-select first workspace
  useEffect(() => {
    if (workspaces.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, selectedWorkspaceId]);

  // Group workspaces by group
  const workspaceGroups = useMemo(() => {
    const groups = new Map<string, typeof workspaces>();
    for (const ws of workspaces) {
      const group = ws.group ?? "Other";
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(ws);
    }
    return groups;
  }, [workspaces]);

  const handleCreateTerminal = useCallback(async () => {
    if (!selectedWorkspaceId || creating) return;
    setCreating(true);
    try {
      const res = await fetch(`${DAEMON_URL}/api/terminal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: selectedWorkspaceId }),
      });
      if (!res.ok) throw new Error("Failed to create terminal");
      const { data } = await res.json();
      const ws = workspaces.find((w) => w.id === selectedWorkspaceId);
      const newTerm: ActiveTerminal = {
        id: data.id,
        workspaceId: selectedWorkspaceId,
        workspaceName: ws?.name ?? selectedWorkspaceId,
      };
      setTerminals((prev) => {
        setActiveTerminalIdx(prev.length);
        return [...prev, newTerm];
      });
    } catch (err) {
      console.error("Failed to create terminal:", err);
    } finally {
      setCreating(false);
    }
  }, [selectedWorkspaceId, creating, workspaces]);

  const handleCloseTerminal = useCallback(
    async (idx: number) => {
      const term = terminals[idx];
      if (!term) return;
      // Close on server
      fetch(`${DAEMON_URL}/api/terminal/${term.id}/close`, {
        method: "POST",
      }).catch(() => {});
      setTerminals((prev) => prev.filter((_, i) => i !== idx));
      if (activeTerminalIdx >= idx) {
        setActiveTerminalIdx(Math.max(0, activeTerminalIdx - 1));
      }
    },
    [terminals, activeTerminalIdx]
  );

  const activeTerminal = terminals[activeTerminalIdx];

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="border-b border-border bg-neutral-950/30 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Workspace selector */}
          <div className="w-52">
            <Select
              value={selectedWorkspaceId}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              icon={<FolderOpen className="h-3.5 w-3.5" />}
            >
              <option value="" disabled>
                Select workspace
              </option>
              {Array.from(workspaceGroups.entries()).map(([group, wsList]) => (
                <optgroup key={group} label={group}>
                  {wsList.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </div>

          {/* New Terminal */}
          <Button
            onClick={handleCreateTerminal}
            disabled={!selectedWorkspaceId || creating}
            size="sm"
            className="gap-1.5"
          >
            {creating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            New Terminal
          </Button>

          <div className="flex-1" />

          {/* Terminal tabs */}
          <div className="flex items-center gap-1">
            {terminals.map((term, idx) => (
              <div
                key={term.id}
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs cursor-pointer transition-colors ${
                  idx === activeTerminalIdx
                    ? "bg-neutral-800 text-neutral-200"
                    : "text-neutral-500 hover:bg-neutral-800/50 hover:text-neutral-300"
                }`}
                onClick={() => setActiveTerminalIdx(idx)}
              >
                <SquareTerminal className="h-3 w-3" />
                <span className="font-mono">{term.workspaceName}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTerminal(idx);
                  }}
                  className="ml-1 rounded p-0.5 hover:bg-neutral-700"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Terminal area */}
      <div className="flex-1 bg-[#0a0a0a] overflow-hidden">
        {activeTerminal ? (
          <TerminalView
            key={activeTerminal.id}
            terminalId={activeTerminal.id}
            onDisconnect={() => handleCloseTerminal(activeTerminalIdx)}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <SquareTerminal className="mx-auto h-10 w-10 text-neutral-700 mb-4" />
              <p className="text-sm text-neutral-500 mb-1">
                Select a workspace and open a terminal
              </p>
              <p className="text-xs text-neutral-600">
                Full shell access in the workspace directory
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
