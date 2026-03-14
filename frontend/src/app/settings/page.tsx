"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PluginInfo {
  name: string;
  version: string;
  description: string;
  enabled: boolean;
}

const PLUGINS: PluginInfo[] = [
  {
    name: "home_assistant",
    version: "0.1.0",
    description: "Home Assistant integration — status and control via REST API",
    enabled: false,
  },
  {
    name: "telegram_digest",
    version: "0.1.0",
    description: "Daily digest summary sent via Telegram",
    enabled: false,
  },
];

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">Gateway</h2>
        <Card className="mt-2">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium">OpenClaw</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge variant="outline">Disconnected</Badge>
              </div>
              <div>
                <p className="text-muted-foreground">URL</p>
                <p className="font-mono text-xs">ws://localhost:18789</p>
              </div>
              <div>
                <p className="text-muted-foreground">Auth</p>
                <p className="font-medium">Bearer Token</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">Plugins</h2>
        <div className="mt-2 space-y-2">
          {PLUGINS.map((plugin) => (
            <Card key={plugin.name}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>
                    {plugin.name}{" "}
                    <span className="text-xs text-muted-foreground">
                      v{plugin.version}
                    </span>
                  </span>
                  <Badge variant={plugin.enabled ? "default" : "secondary"}>
                    {plugin.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{plugin.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
