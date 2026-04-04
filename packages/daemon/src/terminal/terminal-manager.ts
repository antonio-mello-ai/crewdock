import * as pty from "node-pty";
import { nanoid } from "nanoid";
import { getWorkspace } from "../registry/workspaces.js";

interface ActiveTerminal {
  pty: pty.IPty;
  workspaceId: string;
  subscribers: Set<(data: string) => void>;
  outputBuffer: string[];
  createdAt: number;
}

const terminals = new Map<string, ActiveTerminal>();

export function createTerminal(workspaceId: string): string {
  const workspace = getWorkspace(workspaceId);
  if (!workspace) throw new Error(`Workspace "${workspaceId}" not found`);

  const id = nanoid(12);
  const shell = process.env.SHELL || "/bin/bash";

  const term = pty.spawn(shell, [], {
    name: "xterm-256color",
    cols: 120,
    rows: 30,
    cwd: workspace.path,
    env: { ...process.env } as Record<string, string>,
  });

  const active: ActiveTerminal = {
    pty: term,
    workspaceId,
    subscribers: new Set(),
    outputBuffer: [],
    createdAt: Date.now(),
  };

  term.onData((data) => {
    if (active.subscribers.size === 0) {
      // Buffer output until first subscriber connects
      active.outputBuffer.push(data);
    } else {
      for (const cb of active.subscribers) {
        try {
          cb(data);
        } catch {
          // subscriber disconnected
        }
      }
    }
  });

  term.onExit(() => {
    terminals.delete(id);
  });

  terminals.set(id, active);
  return id;
}

export function writeToTerminal(id: string, data: string): void {
  const term = terminals.get(id);
  if (!term) throw new Error("Terminal not found");
  term.pty.write(data);
}

export function resizeTerminal(id: string, cols: number, rows: number): void {
  const term = terminals.get(id);
  if (!term) return;
  term.pty.resize(cols, rows);
}

export function subscribeToTerminal(
  id: string,
  callback: (data: string) => void
): (() => void) | null {
  const term = terminals.get(id);
  if (!term) return null;
  term.subscribers.add(callback);

  // Flush buffered output to new subscriber
  if (term.outputBuffer.length > 0) {
    const buffered = term.outputBuffer.join("");
    term.outputBuffer.length = 0;
    try {
      callback(buffered);
    } catch {
      // subscriber disconnected
    }
  }

  return () => {
    term.subscribers.delete(callback);
  };
}

export function closeTerminal(id: string): boolean {
  const term = terminals.get(id);
  if (!term) return false;
  term.pty.kill();
  terminals.delete(id);
  return true;
}

export function listTerminals(): Array<{
  id: string;
  workspaceId: string;
  createdAt: number;
}> {
  return Array.from(terminals.entries()).map(([id, t]) => ({
    id,
    workspaceId: t.workspaceId,
    createdAt: t.createdAt,
  }));
}
