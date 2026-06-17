import { useListAlerts, useMarkAlertRead } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowUpRight, ArrowDownRight, Lightbulb, Bell, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Alerts() {
  const { data: alerts, isLoading, refetch } = useListAlerts();
  const markRead = useMarkAlertRead();

  const handleMarkRead = async (id: number) => {
    await markRead.mutateAsync({ id });
    refetch();
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <Lightbulb className="h-5 w-5 text-amber-500" />;
      case 'high_cpa':
      case 'roas_drop':
      case 'conversion_drop': return <ArrowDownRight className="h-5 w-5 text-rose-500" />;
      case 'budget_exhausted': return <AlertCircle className="h-5 w-5 text-rose-500" />;
      default: return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  const getSeverityBorder = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-l-rose-500';
      case 'high': return 'border-l-orange-500';
      case 'medium': return 'border-l-amber-500';
      case 'low': return 'border-l-blue-500';
      default: return 'border-l-border';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground">Critical notifications and automated insights.</p>
        </div>
        <Button variant="outline" size="sm">Mark all as read</Button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 w-full">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : alerts?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl border-border/50">
            <Bell className="mx-auto h-12 w-12 opacity-20 mb-4" />
            <p>You're all caught up. No new alerts.</p>
          </div>
        ) : (
          alerts?.map((alert) => (
            <Card 
              key={alert.id} 
              className={cn(
                "border-l-4 overflow-hidden transition-all duration-200", 
                getSeverityBorder(alert.severity),
                !alert.isRead ? "bg-card shadow-sm" : "bg-muted/30 opacity-70"
              )}
            >
              <CardContent className="p-4 sm:p-5 flex items-start gap-4">
                <div className={cn(
                  "p-2 rounded-lg shrink-0",
                  !alert.isRead ? "bg-muted" : "bg-transparent"
                )}>
                  {getAlertIcon(alert.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                    <h3 className={cn("font-semibold text-base truncate", !alert.isRead ? "text-foreground" : "text-muted-foreground")}>
                      {alert.title}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] capitalize font-medium px-1.5 py-0">
                        {alert.severity}
                      </Badge>
                      <span className="flex items-center text-xs text-muted-foreground whitespace-nowrap">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(alert.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {alert.message}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {alert.platform && (
                        <Badge variant="secondary" className="text-xs bg-secondary/50 text-secondary-foreground">
                          {alert.platform}
                        </Badge>
                      )}
                      {alert.campaignName && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {alert.campaignName}
                        </span>
                      )}
                    </div>
                    {!alert.isRead && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs"
                        onClick={() => handleMarkRead(alert.id)}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Mark Read
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
