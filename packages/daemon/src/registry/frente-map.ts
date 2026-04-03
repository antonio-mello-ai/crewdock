import { readFileSync, existsSync } from "node:fs";
import { config } from "../config.js";

// Default Felhen frente mapping — project directory -> frente name
const DEFAULT_FRENTE_MAP: Record<string, string> = {
  "marketplace_data_intelligence": "PulsoOnline",
  "spadavida": "Spa da Vida",
  "petcare": "Petcare",
  "erp-desmanches": "ERP Desmanches",
  "felhen": "Felhen",
  "finance": "Finance",
  "marketing": "Marketing",
  "tools": "Tools",
  "travelCRM": "TravelCRM",
  "setlist-interativo": "Setlist",
  "opensource-prs": "Open Source",
};

export function loadFrenteMap(): Map<string, string> {
  const map = new Map<string, string>();

  // Try loading from config file first
  if (config.frentesConfigPath && existsSync(config.frentesConfigPath)) {
    try {
      const content = readFileSync(config.frentesConfigPath, "utf-8");
      const parsed = JSON.parse(content) as Record<string, string>;
      for (const [key, value] of Object.entries(parsed)) {
        map.set(key, value);
      }
      return map;
    } catch {
      // Fall through to defaults
    }
  }

  // Use defaults
  for (const [key, value] of Object.entries(DEFAULT_FRENTE_MAP)) {
    map.set(key, value);
  }

  return map;
}
