import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { SiGoogleads, SiMeta } from "react-icons/si";
import { RefreshCw, CheckCircle2, XCircle, Unplug, Zap, Settings, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Integration {
  id: number;
  platform: string;
  name: string;
  status: string;
  lastSync: string | null;
  accountName: string | null;
  color: string;
  docsUrl: string;
  needsConfig: boolean;
}

const SHOWN_PLATFORMS = ["google", "meta"];

export function DashboardIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [connecting, setConnecting] = useState<Record<string, boolean>>({});
  const [disconnecting, setDisconnecting] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  async function fetchIntegrations() {
    try {
      const res = await fetch("/api/integrations", { credentials: "include" });
      if (res.ok) {
        const data = await res.json() as Integration[];
        setIntegrations(data.filter((i) => SHOWN_PLATFORMS.includes(i.platform)));
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    void fetchIntegrations();
  }, []);

  async function handleConnect(platform: string) {
    setConnecting((p) => ({ ...p, [platform]: true }));
    try {
      const res = await fetch(`/api/oauth/initiate/${platform}`, { credentials: "include" });
      const data = await res.json() as { url?: string; error?: string; needsConfig?: boolean; envVar?: string };
      if (!res.ok) {
        toast({
          title: "Credentials required",
          description: data.needsConfig
            ? `Set the ${data.envVar ?? "OAuth credentials"} secret to enable this integration.`
            : (data.error ?? "Could not initiate OAuth flow."),
          variant: "destructive",
        });
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      toast({ title: "Connection failed", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setConnecting((p) => ({ ...p, [platform]: false }));
    }
  }

  async function handleSync(platform: string) {
    setSyncing((p) => ({ ...p, [platform]: true }));
    try {
      const res = await fetch(`/api/oauth/sync/${platform}`, { method: "POST", credentials: "include" });
      if (res.ok) {
        toast({ title: "Sync started", description: "Campaign data is being refreshed." });
        setTimeout(() => void fetchIntegrations(), 3000);
      } else {
        const d = await res.json() as { error: string };
        toast({ title: "Sync failed", description: d.error, variant: "destructive" });
      }
    } finally {
      setSyncing((p) => ({ ...p, [platform]: false }));
    }
  }

  async function handleDisconnect(platform: string) {
    setDisconnecting((p) => ({ ...p, [platform]: true }));
    try {
      const res = await fetch(`/api/oauth/disconnect/${platform}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        toast({ title: "Disconnected", description: `${platform} has been disconnected.` });
        void fetchIntegrations();
      }
    } finally {
      setDisconnecting((p) => ({ ...p, [platform]: false }));
    }
  }

  function getIcon(platform: string) {
    if (platform === "google") return <SiGoogleads className="w-5 h-5 text-[#4285F4]" />;
    if (platform === "meta") return <SiMeta className="w-5 h-5 text-[#0082FB]" />;
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Platform Connections
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {integrations.length === 0 && (
            <div className="p-4 space-y-3">
              {SHOWN_PLATFORMS.map((p) => (
                <div key={p} className="h-16 rounded-lg bg-muted/20 animate-pulse" />
              ))}
            </div>
          )}
          {integrations.map((intg) => (
            <div key={intg.platform} className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background border border-border/50 shrink-0">
                {getIcon(intg.platform)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{intg.name}</span>
                  {intg.status === "connected" ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1 text-[10px] py-0 px-1.5 shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Live
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground gap-1 text-[10px] py-0 px-1.5 shrink-0">
                      <XCircle className="w-2.5 h-2.5" /> Off
                    </Badge>
                  )}
                </div>
                {intg.status === "connected" && intg.lastSync && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Last sync {new Date(intg.lastSync).toLocaleDateString()}
                  </p>
                )}
                {intg.needsConfig && (
                  <p className="text-[11px] text-amber-500 mt-0.5 flex items-center gap-1">
                    <Settings className="w-3 h-3" /> OAuth credentials required
                    <a href={intg.docsUrl} target="_blank" rel="noreferrer" className="underline">
                      <ExternalLink className="w-2.5 h-2.5 inline" />
                    </a>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {intg.status === "connected" ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1"
                      onClick={() => void handleSync(intg.platform)}
                      disabled={syncing[intg.platform]}
                    >
                      <RefreshCw className={cn("w-3 h-3", syncing[intg.platform] && "animate-spin")} />
                      {syncing[intg.platform] ? "Syncing" : "Sync"}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => void handleDisconnect(intg.platform)}
                      disabled={disconnecting[intg.platform]}
                      title="Disconnect"
                    >
                      <Unplug className="w-3.5 h-3.5" />
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => void handleConnect(intg.platform)}
                    disabled={connecting[intg.platform] || intg.needsConfig}
                    variant={intg.needsConfig ? "outline" : "default"}
                  >
                    {connecting[intg.platform] ? (
                      <><RefreshCw className="mr-1 w-3 h-3 animate-spin" />Redirecting…</>
                    ) : intg.needsConfig ? "Configure" : "Connect"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
