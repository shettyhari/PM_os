import { useListIntegrations, useSyncIntegration } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SiGoogleads, SiMeta, SiGoogleanalytics, SiGoogletagmanager, SiGooglesearchconsole } from "react-icons/si";
import { Linkedin, Globe } from "lucide-react";
import { RefreshCw, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Integrations() {
  const { data: integrations, isLoading, refetch } = useListIntegrations();
  const syncIntegration = useSyncIntegration();

  const handleSync = async (id: number) => {
    await syncIntegration.mutateAsync({ id });
    refetch();
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'google_ads': return <SiGoogleads className="w-8 h-8 text-[#4285F4]" />;
      case 'meta_ads': return <SiMeta className="w-8 h-8 text-[#0082FB]" />;
      case 'linkedin_ads': return <Linkedin className="w-8 h-8 text-[#0A66C2]" />;
      case 'microsoft_ads': return <Globe className="w-8 h-8 text-[#00A4EF]" />;
      case 'ga4': return <SiGoogleanalytics className="w-8 h-8 text-[#E37400]" />;
      case 'gtm': return <SiGoogletagmanager className="w-8 h-8 text-[#246FDB]" />;
      case 'search_console': return <SiGooglesearchconsole className="w-8 h-8 text-[#4285F4]" />;
      default: return <div className="w-8 h-8 bg-muted rounded-full" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected': return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Connected</Badge>;
      case 'disconnected': return <Badge variant="outline" className="text-muted-foreground"><XCircle className="w-3 h-3 mr-1" /> Disconnected</Badge>;
      case 'error': return <Badge variant="destructive" className="bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20"><AlertCircle className="w-3 h-3 mr-1" /> Error</Badge>;
      case 'syncing': return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Syncing</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">Connect your marketing stack to power Athena AI.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
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
        ) : integrations?.map((integration) => (
          <Card key={integration.id} className={cn(
            "flex flex-col justify-between transition-all duration-200 border-border/50 shadow-sm",
            integration.status === 'connected' ? "bg-card border-primary/10" : "bg-muted/10 opacity-80 hover:opacity-100"
          )}>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 rounded-xl bg-background border border-border/50 shadow-xs">
                  {getPlatformIcon(integration.platform)}
                </div>
                {getStatusBadge(integration.status)}
              </div>
              <CardTitle className="text-lg">{integration.name}</CardTitle>
              <CardDescription className="text-xs line-clamp-2 h-8">
                {integration.description || `Connect your ${integration.name} account to import campaigns and metrics.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="py-0 pb-4">
              {integration.status === 'connected' && (
                <div className="space-y-2 text-xs text-muted-foreground bg-background/50 p-3 rounded-lg border border-border/50">
                  <div className="flex justify-between">
                    <span>Accounts</span>
                    <span className="font-mono text-foreground">{integration.accountsConnected}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Sync</span>
                    <span className="font-mono text-foreground">
                      {integration.lastSync ? new Date(integration.lastSync).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              {integration.status === 'connected' ? (
                <div className="flex gap-2 w-full">
                  <Button variant="outline" className="w-full text-xs h-9">Configure</Button>
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="shrink-0 h-9 w-9"
                    onClick={() => handleSync(integration.id)}
                    disabled={syncIntegration.isPending}
                  >
                    <RefreshCw className={cn("h-4 w-4", syncIntegration.isPending && "animate-spin")} />
                  </Button>
                </div>
              ) : (
                <Button className="w-full text-xs h-9">Connect</Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
