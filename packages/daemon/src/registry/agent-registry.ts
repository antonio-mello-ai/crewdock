import { readFileSync, statSync } from "node:fs";
import { basename, relative } from "node:path";
import matter from "gray-matter";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { agents } from "../db/schema.js";
import { config } from "../config.js";
import { loadFrenteMap } from "./frente-map.js";
import type { Agent } from "@aios/shared";

interface AgentFrontmatter {
  name?: string;
  description?: string;
  model?: string;
  modes?: string[];
}

function parseAgentFile(filePath: string): Omit<Agent, "frente"> | null {
  try {
    const content = readFileSync(filePath, "utf-8");
    const { data } = matter(content) as { data: AgentFrontmatter };

    // Derive agent ID from filename (e.g., "orchestrator.md" -> "orchestrator")
    const id = basename(filePath, ".md");

    // Derive project from path relative to projects dir
    const relPath = relative(config.projectsDir, filePath);
    const firstDir = relPath.split("/")[0] ?? null;
    // If agent is in root .claude/, it's global (no project)
    const projectDir = firstDir === ".claude" ? null : firstDir;

    // Extract modes from content headings (## Mode: patrol, ## patrol, etc.)
    const modes = data.modes ?? extractModesFromContent(content);

    const stat = statSync(filePath);

    return {
      id,
      name: data.name ?? id,
      description: data.description ?? extractFirstHeadingDescription(content),
      model: data.model ?? null,
      filePath,
      project: projectDir,
      modes,
      updatedAt: stat.mtimeMs,
    };
  } catch {
    return null;
  }
}

function extractModesFromContent(content: string): string[] {
  // Only extract modes from explicit "## Mode: xyz" patterns
  // Generic ## headings are NOT modes
  const modePattern = /^##\s+Mode:\s*(\w+)/gim;
  const modes: string[] = [];
  let match;
  while ((match = modePattern.exec(content)) !== null) {
    modes.push(match[1]!.toLowerCase());
  }
  return modes;
}

function extractFirstHeadingDescription(content: string): string | null {
  // Look for a description after the first heading
  const lines = content.split("\n");
  let foundHeading = false;
  for (const line of lines) {
    if (line.startsWith("# ")) {
      foundHeading = true;
      continue;
    }
    if (foundHeading && line.trim().length > 0 && !line.startsWith("#") && !line.startsWith("---")) {
      // Take first non-empty, non-heading line after the title
      const desc = line.replace(/^\*\*[^*]+\*\*:?\s*/, "").trim();
      if (desc.length > 10 && desc.length < 200) return desc;
    }
  }
  return null;
}

export async function scanAgents(): Promise<Agent[]> {
  const db = getDb();
  const frenteMap = loadFrenteMap();

  // Scan for agent files
  // Node.js glob doesn't match dotfiles (like .claude/) with ** by default
  // So we scan known patterns: root .claude/agents/ + project subdirs
  const { readdir } = await import("node:fs/promises");
  const { join, resolve: resolvePath } = await import("node:path");
  const files: string[] = [];

  async function scanDir(dir: string) {
    const agentsDir = join(dir, ".claude", "agents");
    try {
      const entries = await readdir(agentsDir);
      for (const entry of entries) {
        if (entry.endsWith(".md")) {
          files.push(resolvePath(agentsDir, entry));
        }
      }
    } catch {
      // No .claude/agents in this directory
    }
  }

  // Scan root projects dir
  await scanDir(config.projectsDir);

  // Scan each subdirectory (one level deep for project dirs)
  try {
    const topLevel = await readdir(config.projectsDir, { withFileTypes: true });
    for (const entry of topLevel) {
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
        await scanDir(join(config.projectsDir, entry.name));
        // Also scan nested project dirs (e.g., spadavida/site, petcare/denboard)
        try {
          const nested = await readdir(join(config.projectsDir, entry.name), { withFileTypes: true });
          for (const sub of nested) {
            if (sub.isDirectory() && !sub.name.startsWith(".") && sub.name !== "node_modules") {
              await scanDir(join(config.projectsDir, entry.name, sub.name));
            }
          }
        } catch {
          // Not a directory or no access
        }
      }
    }
  } catch {
    // Can't read projects dir
  }

  const discovered: Agent[] = [];

  for (const filePath of files) {
    const parsed = parseAgentFile(filePath);
    if (!parsed) continue;

    const frente = frenteMap.get(parsed.project ?? "") ?? null;

    const agent: Agent = { ...parsed, frente };
    discovered.push(agent);

    // Upsert into DB
    const existing = db.select().from(agents).where(eq(agents.id, agent.id)).get();
    if (existing) {
      db.update(agents)
        .set({
          name: agent.name,
          description: agent.description,
          model: agent.model,
          filePath: agent.filePath,
          project: agent.project,
          frente: agent.frente,
          modes: agent.modes,
          updatedAt: agent.updatedAt,
        })
        .where(eq(agents.id, agent.id))
        .run();
    } else {
      db.insert(agents)
        .values({
          id: agent.id,
          name: agent.name,
          description: agent.description,
          model: agent.model,
          filePath: agent.filePath,
          project: agent.project,
          frente: agent.frente,
          modes: agent.modes,
          updatedAt: agent.updatedAt,
        })
        .run();
    }
  }

  return discovered;
}

export function getAgents(): Agent[] {
  const db = getDb();
  const rows = db.select().from(agents).all();
  return rows.map((r) => ({
    ...r,
    modes: (r.modes as string[] | null) ?? [],
    description: r.description,
    model: r.model,
    project: r.project,
    frente: r.frente,
  }));
}

export function getAgent(id: string): Agent | undefined {
  const db = getDb();
  const row = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!row) return undefined;
  return {
    ...row,
    modes: (row.modes as string[] | null) ?? [],
    description: row.description,
    model: row.model,
    project: row.project,
    frente: row.frente,
  };
}
