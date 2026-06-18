import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { SiGoogleads, SiMeta, SiGoogleanalytics, SiGoogletagmanager, SiGooglesearchconsole } from "react-icons/si";
import { Linkedin, Globe, RefreshCw, CheckCircle2, XCircle, AlertCircle, ExternalLink, Unplug, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface Integration {
  id: number;
  platform: string;
  name: string;
  status: string;
  accountsConnected: number;
  lastSync: string | null;
  description: string;
  accountName: string | null;
  color: string;
  docsUrl: string;
  needsConfig: boolean;
}

function getPlatformIcon(platform: string) {
  switch (platform) {
    case "google": return <SiGoogleads className="w-7 h-7 text-[#4285F4]" />;
    case "meta": return <SiMeta className="w-7 h-7 text-[#0082FB]" />;
    case "linkedin": return <Linkedin className="w-7 h-7 text-[#0A66C2]" />;
    case "microsoft": return <Globe className="w-7 h-7 text-[#00A4EF]" />;
    case "ga4": return <SiGoogleanalytics className="w-7 h-7 text-[#E37400]" />;
    case "gtm": return <SiGoogletagmanager className="w-7 h-7 text-[#246FDB]" />;
    case "search_console": return <SiGooglesearchconsole className="w-7 h-7 text-[#4285F4]" />;
    default: return <Globe className="w-7 h-7 text-muted-foreground" />;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "connected":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 gap-1">
          <CheckCircle2 className="w-3 h-3" /> Connected
        </Badge>
      );
    case "disconnected":
      return (
        <Badge variant="outline" className="text-muted-foreground gap-1">
          <XCircle className="w-3 h-3" /> Not connected
        </Badge>
      );
    case "error":
      return (
        <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 gap-1">
          <AlertCircle className="w-3 h-3" /> Error
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [disconnecting, setDisconnecting] = useState<Record<string, boolean>>({});
  const [connecting, setConnecting] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const [location] = useLocation();

  async function fetchIntegrations() {
    try {
      const res = await fetch("/api/integrations", { credentials: "include" });
      if (res.ok) {
        const data = await res.json() as Integration[];
        setIntegrations(data);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchIntegrations();
  }, []);

  // Handle OAuth callback redirects (?connected=google, ?error=...)
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1] ?? "");
    const connected = params.get("connected");
    const error = params.get("error");
    const platform = params.get("platform");

    if (connected) {
      toast({
        title: "Integration connected",
        description: `${connected.charAt(0).toUpperCase() + connected.slice(1)} Ads connected successfully. Data sync has started.`,
      });
      void fetchIntegrations();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (error) {
      const messages: Record<string, string> = {
        missing_code: "OAuth authorization was cancelled or failed.",
        token_exchange_failed: "Could not exchange authorization code. Please try again.",
        callback_failed: "OAuth callback encountered an error.",
        invalid_state: "Security verification failed. Please try again.",
      };
      toast({
        title: `Could not connect ${platform ?? "platform"}`,
        description: messages[error] ?? error,
        variant: "destructive",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [location, toast]);

  async function handleConnect(platform: string) {
    setConnecting((prev) => ({ ...prev, [platform]: true }));
    try {
      const res = await fetch(`/api/oauth/initiate/${platform}`, { credentials: "include" });
      const data = await res.json() as { url?: string; error?: string; needsConfig?: boolean; envVar?: string };

      if (!res.ok) {
        if (data.needsConfig) {
          toast({
            title: "API credentials required",
            description: `Set the ${data.envVar ?? "credentials"} secret in your environment to enable this integration. See the platform developer portal to create an OAuth app.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Connection failed",
            description: data.error ?? "Could not initiate OAuth flow.",
            variant: "destructive",
          });
        }
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast({ title: "Connection failed", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setConnecting((prev) => ({ ...prev, [platform]: false }));
    }
  }

  async function handleSync(platform: string) {
    setSyncing((prev) => ({ ...prev, [platform]: true }));
    try {
      const res = await fetch(`/api/oauth/sync/${platform}`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "Sync started", description: "Campaign data is being refreshed in the background." });
        setTimeout(() => { void fetchIntegrations(); }, 3000);
      } else {
        const data = await res.json() as { error: string };
        toast({ title: "Sync failed", description: data.error, variant: "destructive" });
      }
    } finally {
      setSyncing((prev) => ({ ...prev, [platform]: false }));
    }
  }

  async function handleDisconnect(platform: string) {
    setDisconnecting((prev) => ({ ...prev, [platform]: true }));
    try {
      const res = await fetch(`/api/oauth/disconnect/${platform}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "Disconnected", description: `${platform} has been disconnected. Campaign data removed.` });
        void fetchIntegrations();
      } else {
        const data = await res.json() as { error: string };
        toast({ title: "Failed to disconnect", description: data.error, variant: "destructive" });
      }
    } finally {
      setDisconnecting((prev) => ({ ...prev, [platform]: false }));
    }
  }

  const connectedCount = integrations.filter((i) => i.status === "connected").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground mt-1">
            Connect your marketing platforms to sync live campaign data.
            {connectedCount > 0 && (
              <span className="ml-2 text-emerald-500 font-medium">{connectedCount} connected</span>
            )}
          </p>
        </div>
      </div>

      {!isLoading && integrations.filter((i) => i.status !== "connected").length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-sm">
            <span className="font-medium text-amber-500">No demo data</span>
            <span className="text-muted-foreground ml-1.5">
              — Connect your platforms below to populate your dashboard with real campaign data.
              OAuth credentials must be configured as environment secrets first.
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 7 }).map((_, i) => (
              <Card key={i} className="h-64 flex flex-col justify-between">
                <CardHeader className="gap-4">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardHeader>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))
          : integrations.map((integration) => (
              <Card
                key={integration.id}
                className={cn(
                  "flex flex-col justify-between transition-all duration-200 border-border/50",
                  integration.status === "connected"
                    ? "bg-card border-primary/10 shadow-sm"
                    : "bg-muted/5 hover:bg-muted/10",
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-2.5 rounded-xl bg-background border border-border/50 shadow-xs">
                      {getPlatformIcon(integration.platform)}
                    </div>
                    {getStatusBadge(integration.status)}
                  </div>
                  <CardTitle className="text-base leading-tight">{integration.name}</CardTitle>
                  <CardDescription className="text-xs line-clamp-2 min-h-[2.5rem]">
                    {integration.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="py-0 pb-3">
                  {integration.status === "connected" ? (
                    <div className="space-y-1.5 text-xs text-muted-foreground bg-background/50 p-3 rounded-lg border border-border/50">
                      {integration.accountName && (
                        <div className="flex justify-between">
                          <span>Account</span>
                          <span className="font-medium text-foreground truncate max-w-[120px]">
                            {integration.accountName}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Last sync</span>
                        <span className="font-mono text-foreground">
                          {integration.lastSync
                            ? new Date(integration.lastSync).toLocaleDateString()
                            : "Just now"}
                        </span>
                      </div>
                    </div>
                  ) : integration.needsConfig ? (
                    <div className="text-xs text-amber-500/80 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                      <Settings className="h-3.5 w-3.5 inline mr-1.5" />
                      Requires API credentials in Secrets.{" "}
                      <a
                        href={integration.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-amber-400 inline-flex items-center gap-0.5"
                      >
                        Docs <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 min-h-[3rem] flex items-center">
                      Click Connect to authorize via OAuth.
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-0">
                  {integration.status === "connected" ? (
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9 text-xs gap-1.5"
                        onClick={() => { void handleSync(integration.platform); }}
                        disabled={syncing[integration.platform]}
                      >
                        <RefreshCw
                          className={cn("h-3.5 w-3.5", syncing[integration.platform] && "animate-spin")}
                        />
                        {syncing[integration.platform] ? "Syncing…" : "Sync"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => { void handleDisconnect(integration.platform); }}
                        disabled={disconnecting[integration.platform]}
                        title="Disconnect"
                      >
                        <Unplug className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className={cn(
                        "w-full h-9 text-xs font-medium",
                        integration.needsConfig && "border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                      )}
                      onClick={() => { void handleConnect(integration.platform); }}
                      disabled={connecting[integration.platform]}
                      variant={integration.needsConfig ? "outline" : "default"}
                    >
                      {connecting[integration.platform] ? (
                        <><RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />Redirecting…</>
                      ) : integration.needsConfig ? (
                        <><Settings className="mr-1.5 h-3.5 w-3.5" />Setup Credentials</>
                      ) : (
                        "Connect via OAuth"
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
      </div>
    </div>
  );
}
