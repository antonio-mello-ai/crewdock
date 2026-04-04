import { readFileSync, existsSync } from "node:fs";
import { config } from "../config.js";
import type { Workspace } from "@aios/shared";

const DEFAULT_WORKSPACES: Workspace[] = [
  {
    id: "projetos",
    name: "Projetos",
    path: "/mnt/felhencloud/projetos",
    description: "Hub operacional — engenharia, deploy, operacao",
    icon: "Code",
    group: "Principal",
  },
  {
    id: "corp",
    name: "Corp",
    path: "/mnt/felhencloud/corp",
    description: "Estrategia, negocios, decisoes, AIOS",
    icon: "Building",
    group: "Principal",
  },
  {
    id: "carreira",
    name: "Carreira",
    path: "/mnt/felhencloud/carreira",
    description: "LinkedIn, recolocacao, networking, CV",
    icon: "User",
    group: "Principal",
  },
  {
    id: "pulsoonline",
    name: "PulsoOnline",
    path: "/mnt/felhencloud/projetos/marketplace_data_intelligence",
    description: "ETL marketplace, dados, pipelines",
    icon: "BarChart",
    group: "Projetos",
  },
  {
    id: "erp-desmanches",
    name: "ERP Desmanches",
    path: "/mnt/felhencloud/projetos/erp-desmanches",
    description: "ERP modular para desmanches",
    icon: "Wrench",
    group: "Projetos",
  },
  {
    id: "spadavida",
    name: "Spa da Vida",
    path: "/mnt/felhencloud/projetos/spadavida",
    description: "Clinica, NR-1, bot WhatsApp, escolas",
    icon: "Heart",
    group: "Projetos",
  },
  {
    id: "opensource",
    name: "Open Source",
    path: "/mnt/felhencloud/projetos/opensource-prs",
    description: "Contribuicoes open source, PRs",
    icon: "GitBranch",
    group: "Projetos",
  },
  {
    id: "finance",
    name: "Finance",
    path: "/mnt/felhencloud/projetos/finance",
    description: "Investment bot, controle financeiro",
    icon: "DollarSign",
    group: "Projetos",
  },
  {
    id: "petcare",
    name: "Petcare",
    path: "/mnt/felhencloud/projetos/petcare",
    description: "Denboard, Snuggles",
    icon: "PawPrint",
    group: "Projetos",
  },
];

let workspacesCache: Workspace[] | null = null;

export function getWorkspaces(): Workspace[] {
  if (workspacesCache) return workspacesCache;

  // Try loading from config file
  const configPath = config.frentesConfigPath?.replace("frentes.json", "workspaces.json");
  if (configPath && existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, "utf-8");
      workspacesCache = JSON.parse(content) as Workspace[];
      return workspacesCache;
    } catch {
      // Fall through to defaults
    }
  }

  // Filter defaults to only existing paths
  workspacesCache = DEFAULT_WORKSPACES.filter((w) => {
    try {
      return existsSync(w.path);
    } catch {
      return false;
    }
  });

  return workspacesCache;
}

export function getWorkspace(id: string): Workspace | undefined {
  return getWorkspaces().find((w) => w.id === id);
}
