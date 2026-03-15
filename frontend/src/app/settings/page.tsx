"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/atoms/page-header";
import { SectionLabel } from "@/components/atoms/section-label";
import { WifiOff, Plug, Settings2 } from "lucide-react";

interface PluginInfo {
  name: string;
  version: string;
  description: string;
  enabled: boolean;
}

const PLUGINS: PluginInfo[] = [
  {
    name: "Home Assistant",
    version: "0.1.0",
    description: "Smart home integration — device status and control via REST API",
    enabled: false,
  },
  {
    name: "Telegram Digest",
    version: "0.1.0",
    description: "Daily digest summary delivered via Telegram bot",
    enabled: false,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        subtitle="Platform configuration and integrations"
      />

      {/* Gateway */}
      <div className="space-y-3">
        <SectionLabel>Gateway</SectionLabel>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                <WifiOff className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-semibold">OpenClaw Gateway</h3>
                  <Badge variant="outline" className="text-destructive border-destructive/30">
                    Disconnected
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">URL</p>
                    <p className="font-mono text-xs">ws://localhost:18789</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Authentication</p>
                    <p className="text-xs">Bearer Token</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plugins */}
      <div className="space-y-3">
        <SectionLabel>Plugins</SectionLabel>
        <div className="space-y-3">
          {PLUGINS.map((plugin) => (
            <Card key={plugin.name} className="card-hover">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Plug className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{plugin.name}</h3>
                        <span className="text-xs text-muted-foreground">
                          v{plugin.version}
                        </span>
                      </div>
                      <Badge
                        variant={plugin.enabled ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {plugin.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {plugin.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Platform */}
      <div className="space-y-3">
        <SectionLabel>Platform</SectionLabel>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Settings2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-3">CrewDock</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Version</p>
                    <p className="text-xs">v0.2.0</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Auth Mode</p>
                    <p className="text-xs">Local (Bearer Token)</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">License</p>
                    <p className="text-xs">MIT</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
