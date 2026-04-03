import { resolve, dirname } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Load env file: .env.prod (production) or .env.dev (local development)
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const envFiles = [".env.prod", ".env.dev"];
for (const envFile of envFiles) {
  const envPath = resolve(rootDir, envFile);
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx);
      const val = trimmed.slice(eqIdx + 1);
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
    break; // Use first env file found
  }
}

function env(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  port: Number(env("AIOS_PORT", "3101")),
  host: env("AIOS_HOST", "0.0.0.0"),

  // Where to scan for agent .md files
  projectsDir: env("AIOS_PROJECTS_DIR", "/mnt/felhencloud/projetos"),

  // Glob pattern for agent definition files
  agentGlob: env("AIOS_AGENT_GLOB", "**/.claude/agents/*.md"),

  // Shell script paths (CT165 defaults)
  runAgentCmd: env("AIOS_RUN_AGENT_CMD", "/home/claude/run-agent.sh"),
  runOrchestratorCmd: env("AIOS_RUN_ORCHESTRATOR_CMD", "/home/claude/run-orchestrator.sh"),

  // Database
  dbPath: resolve(env("AIOS_DB_PATH", "./aios.db")),

  // Log directory
  logDir: env("AIOS_LOG_DIR", "/var/log/claude-monitor"),

  // Frentes config
  frentesConfigPath: env("AIOS_FRENTES_CONFIG", ""),
} as const;
