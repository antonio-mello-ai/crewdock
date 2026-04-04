import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, basename, relative } from "node:path";
import { config } from "../config.js";
import type { Workspace } from "@aios/shared";

const BASE_DIR = "/mnt/felhencloud";
const MAX_DEPTH = 4;
const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "out", ".turbo",
  ".claude", "docs", "scripts", "public", "assets", "__pycache__",
]);

const CONFIG_FILE = join(
  existsSync(BASE_DIR) ? BASE_DIR : config.projectsDir,
  "workspaces.json"
);

export interface WorkspaceOverride {
  name?: string;
  group?: string;
  hidden?: boolean;
  order?: number;
}

let discoveredCache: Workspace[] | null = null;
let configCache: Record<string, WorkspaceOverride> | null = null;

/**
 * Get all discovered workspaces (unfiltered, for settings page)
 */
export function getDiscoveredWorkspaces(): Workspace[] {
  if (!discoveredCache) {
    discoveredCache = discoverWorkspaces();
  }
  return discoveredCache;
}

/**
 * Get active workspaces (filtered + overridden by config)
 */
export function getWorkspaces(): Workspace[] {
  const all = getDiscoveredWorkspaces();
  const overrides = getWorkspaceConfig();

  return all
    .filter((ws) => !overrides[ws.id]?.hidden)
    .map((ws) => {
      const ov = overrides[ws.id];
      if (!ov) return ws;
      return {
        ...ws,
        name: ov.name ?? ws.name,
        group: ov.group ?? ws.group,
      };
    })
    .sort((a, b) => {
      const oa = overrides[a.id]?.order ?? 999;
      const ob = overrides[b.id]?.order ?? 999;
      if (oa !== ob) return oa - ob;
      // Group order: Principal first
      if (a.group === "Principal" && b.group !== "Principal") return -1;
      if (b.group === "Principal" && a.group !== "Principal") return 1;
      return a.name.localeCompare(b.name);
    });
}

export function getWorkspace(id: string): Workspace | undefined {
  return getWorkspaces().find((w) => w.id === id);
}

export function getWorkspaceConfig(): Record<string, WorkspaceOverride> {
  if (configCache) return configCache;
  try {
    if (existsSync(CONFIG_FILE)) {
      const content = readFileSync(CONFIG_FILE, "utf-8");
      configCache = JSON.parse(content) as Record<string, WorkspaceOverride>;
      return configCache;
    }
  } catch {
    // Invalid config
  }
  configCache = {};
  return configCache;
}

export function saveWorkspaceConfig(overrides: Record<string, WorkspaceOverride>): void {
  writeFileSync(CONFIG_FILE, JSON.stringify(overrides, null, 2), "utf-8");
  configCache = overrides;
}

export function refreshWorkspaces(): Workspace[] {
  discoveredCache = null;
  configCache = null;
  return getWorkspaces();
}

// --- Discovery logic ---

function discoverWorkspaces(): Workspace[] {
  const discovered: Workspace[] = [];
  const baseDir = existsSync(BASE_DIR) ? BASE_DIR : config.projectsDir;

  scanForClaudeMd(baseDir, 0, discovered, baseDir);

  // Assign groups based on path depth
  for (const ws of discovered) {
    const rel = relative(baseDir, ws.path);
    const parts = rel.split("/");
    if (parts.length <= 1) {
      ws.group = "Principal";
    } else {
      ws.group = humanize(parts[0]!);
    }
  }

  // Sort: top-level first, then alphabetically
  discovered.sort((a, b) => {
    const depthA = a.path.split("/").length;
    const depthB = b.path.split("/").length;
    if (depthA !== depthB) return depthA - depthB;
    return a.name.localeCompare(b.name);
  });

  return discovered;
}

function scanForClaudeMd(
  dir: string,
  depth: number,
  results: Workspace[],
  baseDir: string
) {
  if (depth > MAX_DEPTH) return;

  const claudeMdPath = join(dir, "CLAUDE.md");
  if (existsSync(claudeMdPath)) {
    const dirName = basename(dir);
    const rel = relative(baseDir, dir);
    const id = rel.replace(/\//g, "--") || dirName;

    results.push({
      id,
      name: humanize(dirName),
      path: dir,
      description: extractDescription(claudeMdPath),
      icon: null,
      group: null,
    });
  }

  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        !IGNORE_DIRS.has(entry.name)
      ) {
        scanForClaudeMd(join(dir, entry.name), depth + 1, results, baseDir);
      }
    }
  } catch {
    // Can't read directory
  }
}

function extractDescription(claudeMdPath: string): string | null {
  try {
    const content = readFileSync(claudeMdPath, "utf-8");
    const lines = content.split("\n");
    let foundHeading = false;
    for (const line of lines) {
      if (line.startsWith("# ")) {
        foundHeading = true;
        continue;
      }
      if (line.startsWith(">") && foundHeading) {
        return line.replace(/^>\s*/, "").trim().slice(0, 120);
      }
      if (
        foundHeading &&
        line.trim().length > 10 &&
        !line.startsWith("#") &&
        !line.startsWith("---") &&
        !line.startsWith("|")
      ) {
        return line.trim().slice(0, 120);
      }
    }
  } catch {
    // Can't read file
  }
  return null;
}

function humanize(dirName: string): string {
  return dirName
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
