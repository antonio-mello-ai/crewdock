import { resolve } from "node:path";

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
