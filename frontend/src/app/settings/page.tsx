"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/atoms/page-header";
import { SectionLabel } from "@/components/atoms/section-label";
import { apiFetch } from "@/lib/api/client";
import { getUser } from "@/lib/auth";
import { Settings2, Key, Wifi, WifiOff, User } from "lucide-react";

interface HealthResponse {
  status: string;
  version: string;
}

interface GatewayStatus {
  type: string;
  connected: boolean;
  gateways: string[];
}

export default function SettingsPage() {
  const { data: health } = useQuery<HealthResponse>({
    queryKey: ["health"],
    queryFn: () => apiFetch("/api/v1/health"),
  });

  const { data: gateway } = useQuery<GatewayStatus>({
    queryKey: ["gateway"],
    queryFn: () => apiFetch("/api/v1/gateway/status"),
  });

  const user = getUser();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        subtitle="Platform configuration and status"
      />

      {/* Platform Status */}
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
                    <p className="text-xs font-mono">{health?.version ?? "..."}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Status</p>
                    <Badge variant={health?.status === "ok" ? "default" : "destructive"} className="text-xs">
                      {health?.status ?? "checking..."}
                    </Badge>
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

      {/* User */}
      {user && (
        <div className="space-y-3">
          <SectionLabel>Account</SectionLabel>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{user.name}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* API Configuration */}
      <div className="space-y-3">
        <SectionLabel>API Configuration</SectionLabel>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Key className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-3">Anthropic API</h3>
                <p className="text-sm text-muted-foreground">
                  API key is configured via the <code className="text-xs bg-muted px-1 py-0.5 rounded">ANTHROPIC_API_KEY</code> environment variable in <code className="text-xs bg-muted px-1 py-0.5 rounded">.env</code>.
                  To change it, update the file and restart the backend container.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gateway */}
      <div className="space-y-3">
        <SectionLabel>Gateway</SectionLabel>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                {gateway?.connected ? (
                  <Wifi className="h-5 w-5 text-emerald-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">OpenClaw Gateway</h3>
                  <Badge variant={gateway?.connected ? "default" : "secondary"} className="text-xs">
                    {gateway?.connected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Agent chat uses the Anthropic API directly. The gateway is optional for multi-runtime support.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
