import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, basename, relative } from "node:path";
import { config } from "../config.js";
import type { Workspace } from "@aios/shared";

const BASE_DIR = "/mnt/felhencloud";
const MAX_DEPTH = 4;
const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "out", ".turbo",
  ".claude", "docs", "scripts", "public", "assets", "__pycache__",
]);

let workspacesCache: Workspace[] | null = null;

/**
 * Auto-discover workspaces by scanning for directories with CLAUDE.md files.
 * A directory with a CLAUDE.md is a valid workspace.
 */
export function getWorkspaces(): Workspace[] {
  if (workspacesCache) return workspacesCache;

  // Try loading from config file first (manual override)
  const configPath = join(config.projectsDir, "..", "workspaces.json");
  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, "utf-8");
      workspacesCache = JSON.parse(content) as Workspace[];
      return workspacesCache;
    } catch {
      // Fall through to auto-discovery
    }
  }

  // Auto-discover: scan for directories with CLAUDE.md
  const discovered: Workspace[] = [];
  const baseDir = existsSync(BASE_DIR) ? BASE_DIR : config.projectsDir;

  scanForClaudeMd(baseDir, 0, discovered, baseDir);

  // Sort: top-level first, then alphabetically
  discovered.sort((a, b) => {
    const depthA = a.path.split("/").length;
    const depthB = b.path.split("/").length;
    if (depthA !== depthB) return depthA - depthB;
    return a.name.localeCompare(b.name);
  });

  // Assign groups based on path depth relative to base
  for (const ws of discovered) {
    const rel = relative(baseDir, ws.path);
    const parts = rel.split("/");
    if (parts.length <= 1) {
      ws.group = "Principal";
    } else {
      // Use first directory as group name
      ws.group = humanize(parts[0]!);
    }
  }

  workspacesCache = discovered;
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

    // Try to extract description from CLAUDE.md first line after heading
    const description = extractDescription(claudeMdPath);

    results.push({
      id,
      name: humanize(dirName),
      path: dir,
      description,
      icon: null,
      group: null,
    });
  }

  // Scan subdirectories
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
  // Convert directory names to human-readable format
  return dirName
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/^Mnt Felhencloud /, "")
    .replace(/^Projetos /, "");
}

export function getWorkspace(id: string): Workspace | undefined {
  return getWorkspaces().find((w) => w.id === id);
}

export function refreshWorkspaces(): Workspace[] {
  workspacesCache = null;
  return getWorkspaces();
}
