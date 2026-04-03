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
    const projectDir = relPath.split("/")[0] ?? null;

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
  const modePattern = /^##\s+(?:Mode:\s*)?(\w+)/gm;
  const modes: string[] = [];
  let match;
  while ((match = modePattern.exec(content)) !== null) {
    const mode = match[1]!.toLowerCase();
    // Skip common non-mode headings
    if (!["context", "principles", "rules", "identity", "domain", "ref", "reporting"].includes(mode)) {
      modes.push(mode);
    }
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

  // Use Node.js built-in glob
  const { glob } = await import("node:fs/promises");
  const files: string[] = [];
  for await (const entry of glob(config.projectsDir + "/" + config.agentGlob)) {
    if (!entry.includes("node_modules")) {
      files.push(entry);
    }
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
