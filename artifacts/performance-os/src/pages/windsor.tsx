import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, XCircle, RefreshCw, Plug, Unplug, Clock,
  Database, Zap, AlertCircle, Activity, ChevronDown, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WindsorConnection {
  id: number;
  status: string;
  syncInterval: number;
  autoSync: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  apiKeyMasked: string | null;
}

interface SyncLog {
  id: number;
  connector: string | null;
  status: string;
  recordsImported: number;
  durationMs: number | null;
  errorMessage: string | null;
  createdAt: string;
}

interface WindsorSource {
  id: string;
  name: string;
  icon: string;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  return res.json();
}

const CONNECTOR_COLORS: Record<string, string> = {
  facebook_ads: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  google_ads: "bg-green-500/10 text-green-400 border-green-500/20",
  linkedin_ads: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  microsoft_ads: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  google_analytics_4: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  tiktok_ads: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  google_search_console: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

export default function Windsor() {
  const { toast } = useToast();
  const [connection, setConnection] = useState<WindsorConnection | null | undefined>(undefined);
  const [sources, setSources] = useState<WindsorSource[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    try {
      const [conn, srcs, logs] = await Promise.all([
        apiFetch("/windsor/connection"),
        apiFetch("/windsor/sources"),
        apiFetch("/windsor/sync-logs"),
      ]);
      setConnection(conn as WindsorConnection | null);
      setSources(srcs as WindsorSource[]);
      setSyncLogs(logs as SyncLog[]);
    } catch {
      setConnection(null);
    }
  }

  async function handleConnect() {
    if (!apiKey.trim()) return;
    setConnecting(true);
    try {
      const result = await apiFetch("/windsor/connect", {
        method: "POST",
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      }) as { valid: boolean; error?: string };

      if (result.valid) {
        toast({ title: "Windsor connected!", description: "Your API key has been validated." });
        setApiKey("");
        await loadAll();
      } else {
        toast({ title: "Connection failed", description: result.error ?? "Invalid API key", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    try {
      await apiFetch("/windsor/connection", { method: "DELETE" });
      setConnection(null);
      toast({ title: "Disconnected", description: "Windsor connection removed." });
    } catch {
      toast({ title: "Error disconnecting", variant: "destructive" });
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await apiFetch("/windsor/sync", { method: "POST", body: JSON.stringify({}) });
      toast({ title: "Sync started", description: "Data is syncing in the background. Check logs below." });
      setTimeout(() => { void loadAll(); }, 3000);
    } catch (err) {
      toast({ title: "Sync failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }

  async function updateConfig(field: "syncInterval" | "autoSync", value: number | boolean) {
    try {
      await apiFetch("/windsor/config", {
        method: "PUT",
        body: JSON.stringify({ [field]: value }),
      });
      if (connection) setConnection({ ...connection, [field]: value });
    } catch {
      toast({ title: "Failed to update config", variant: "destructive" });
    }
  }

  const isConnected = connection?.status === "connected";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Database className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Windsor.ai Integration</h1>
            <p className="text-sm text-muted-foreground">Central marketing data layer — connects all your ad platforms</p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Windsor.ai aggregates data from Meta Ads, Google Ads, LinkedIn, TikTok, GA4 and more into a single API.
          Get your API key at <a href="https://windsor.ai" target="_blank" rel="noopener noreferrer" className="text-primary underline">windsor.ai</a> → Settings → API Keys.
        </p>
      </div>

      {/* Connection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plug className="h-4 w-4" />
            API Connection
          </CardTitle>
          <CardDescription>Connect your Windsor.ai account to start syncing marketing data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connection === undefined ? (
            <div className="h-10 animate-pulse bg-muted rounded-md" />
          ) : isConnected ? (
            <div className="space-y-4">
              {/* Status Row */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">Connected</span>
                  {connection.apiKeyMasked && (
                    <span className="text-xs text-muted-foreground font-mono">{connection.apiKeyMasked}</span>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-destructive hover:bg-destructive/10 h-7 text-xs">
                  <Unplug className="h-3.5 w-3.5 mr-1" /> Disconnect
                </Button>
              </div>

              {/* Last Sync */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Last sync: {connection.lastSyncAt
                    ? new Date(connection.lastSyncAt).toLocaleString()
                    : "Never"}
                  {connection.lastSyncStatus === "error" && connection.lastSyncError && (
                    <span className="text-destructive">· {connection.lastSyncError.slice(0, 60)}</span>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing}
                  className="h-7 text-xs"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", syncing && "animate-spin")} />
                  {syncing ? "Syncing…" : "Sync Now"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {connection?.status === "error" && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm text-destructive">
                  <XCircle className="h-4 w-4 shrink-0" />
                  {connection.lastSyncError ?? "Invalid API key — please re-enter"}
                </div>
              )}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="windsor-key" className="text-xs mb-1.5 block">Windsor API Key</Label>
                  <Input
                    id="windsor-key"
                    type="password"
                    placeholder="wnd_••••••••••••••••••••••"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void handleConnect()}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleConnect} disabled={connecting || !apiKey.trim()} className="shrink-0">
                    {connecting ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : <Plug className="h-4 w-4 mr-1.5" />}
                    {connecting ? "Connecting…" : "Connect"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Configuration — only show when connected */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4" />
              Sync Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto Sync</p>
                <p className="text-xs text-muted-foreground">Automatically refresh data on a schedule</p>
              </div>
              <Switch
                checked={connection?.autoSync ?? true}
                onCheckedChange={(v) => void updateConfig("autoSync", v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Sync Interval</p>
                <p className="text-xs text-muted-foreground">How often to pull fresh data</p>
              </div>
              <Select
                value={String(connection?.syncInterval ?? 30)}
                onValueChange={(v) => void updateConfig("syncInterval", parseInt(v))}
              >
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">Every 15 min</SelectItem>
                  <SelectItem value="30">Every 30 min</SelectItem>
                  <SelectItem value="60">Every 60 min</SelectItem>
                  <SelectItem value="360">Every 6 hours</SelectItem>
                  <SelectItem value="1440">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Available Data Sources
          </CardTitle>
          <CardDescription>Windsor.ai aggregates data from these platforms automatically when connected</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sources.map((src) => (
              <div
                key={src.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border text-sm",
                  CONNECTOR_COLORS[src.id] ?? "bg-muted/30 border-border",
                )}
              >
                <div className={cn("h-2 w-2 rounded-full", isConnected ? "bg-green-400" : "bg-muted-foreground/30")} />
                <span className="font-medium">{src.name}</span>
                <Badge variant="outline" className="ml-auto text-[10px] h-4">
                  {isConnected ? "Active" : "Pending"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sync Logs */}
      {syncLogs.length > 0 && (
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setShowLogs(!showLogs)}>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Sync Logs
                <Badge variant="outline" className="text-[10px]">{syncLogs.length}</Badge>
              </span>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showLogs && "rotate-180")} />
            </CardTitle>
          </CardHeader>
          {showLogs && (
            <CardContent>
              <div className="space-y-1.5">
                {syncLogs.slice(0, 20).map((log) => (
                  <div key={log.id} className="flex items-center gap-3 py-2 px-3 rounded-md bg-muted/30 text-xs">
                    {log.status === "success" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    ) : log.status === "running" ? (
                      <RefreshCw className="h-3.5 w-3.5 text-blue-500 animate-spin shrink-0" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    )}
                    <span className="font-medium min-w-[120px]">
                      {log.connector?.replace(/_/g, " ") ?? "All"}
                    </span>
                    <span className="text-muted-foreground">
                      {log.status === "success"
                        ? `${log.recordsImported} records`
                        : log.errorMessage?.slice(0, 50) ?? log.status}
                    </span>
                    <span className="ml-auto text-muted-foreground/60">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                    {log.durationMs && (
                      <span className="text-muted-foreground/60">{(log.durationMs / 1000).toFixed(1)}s</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
