import { useState } from "react";
import { useGetDashboardSummary, useGetKpis, useGetSpendTrend, useGetPlatformComparison, useGetCurrentUser, useGetAiInsights } from "@workspace/api-client-react";
import { formatCurrency, formatNumber, formatPercentage, getPlatformColor } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, TrendingUp, AlertCircle, Lightbulb, Trophy, Settings } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from "recharts";
import { DashboardSettings } from "@/components/dashboard/dashboard-settings";
import { DashboardIntegrations } from "@/components/dashboard/dashboard-integrations";
import { DashboardAthenaChat } from "@/components/dashboard/dashboard-athena-chat";

export default function Dashboard() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [geminiKeySet, setGeminiKeySet] = useState<boolean | null>(null);

  const { data: user } = useGetCurrentUser();
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: kpis, isLoading: isLoadingKpis } = useGetKpis();
  const { data: spendTrend, isLoading: isLoadingSpendTrend } = useGetSpendTrend();
  const { data: platformComp, isLoading: isLoadingPlatformComp } = useGetPlatformComparison();
  const { data: insights, isLoading: isLoadingInsights } = useGetAiInsights();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {greeting}, {user?.name?.split(" ")[0] || "User"} 👋
          </h1>
          <p className="text-muted-foreground">Here is what's happening with your campaigns today.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0 mt-1"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Button>
      </div>

      {/* Gemini Key Banner */}
      {geminiKeySet === false && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400 flex-1">
            Configure your Gemini API key to power Athena AI responses.
          </p>
          <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10" onClick={() => setSettingsOpen(true)}>
            Configure
          </Button>
        </div>
      )}

      {/* AI Executive Summary */}
      {isLoadingSummary ? (
        <Skeleton className="h-24 w-full" />
      ) : summary ? (
        <Card className="bg-primary/5 border-primary/20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Trophy className="w-32 h-32 text-primary" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              Athena AI Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm md:text-base leading-relaxed text-foreground/90 max-w-[80%]">
              {summary.aiSummary}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoadingKpis ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : kpis?.map((kpi, i) => (
          <motion.div
            key={kpi.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            <Card>
              <CardContent className="p-5 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">{kpi.label}</span>
                  <div className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded ${
                    kpi.trend === "up" ? "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400" :
                    kpi.trend === "down" ? "text-rose-600 bg-rose-500/10 dark:text-rose-400" :
                    "text-slate-600 bg-slate-500/10 dark:text-slate-400"
                  }`}>
                    {kpi.trend === "up" && <ArrowUpRight className="w-3 h-3 mr-1" />}
                    {kpi.trend === "down" && <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {kpi.trend === "neutral" && <TrendingUp className="w-3 h-3 mr-1" />}
                    {Math.abs(kpi.trendValue)}%
                  </div>
                </div>
                <div className="text-3xl font-bold tracking-tight">
                  {kpi.unit === "currency" ? formatCurrency(kpi.value) :
                   kpi.unit === "percentage" ? formatPercentage(kpi.value * 100) :
                   kpi.unit === "multiplier" ? `${kpi.value}x` :
                   formatNumber(kpi.value)}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* AI Insights + Athena Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Needs Attention */}
        {isLoadingInsights ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : insights ? (
          <Card className="border-rose-500/20 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                Needs Attention
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {insights.needsAttention.map(insight => (
                  <div key={insight.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <p className="font-medium text-sm mb-1">{insight.title}</p>
                    <p className="text-xs text-muted-foreground">{insight.description}</p>
                    {insight.action && (
                      <div className="mt-3">
                        <Badge variant="outline" className="text-xs cursor-pointer hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/30 transition-colors">
                          {insight.action}
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
                {insights.needsAttention.length === 0 && (
                  <div className="p-6 text-center text-muted-foreground text-sm">No critical issues.</div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Opportunities */}
        {isLoadingInsights ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : insights ? (
          <Card className="border-amber-500/20 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {insights.opportunities.map(insight => (
                  <div key={insight.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <p className="font-medium text-sm mb-1">{insight.title}</p>
                    <p className="text-xs text-muted-foreground">{insight.description}</p>
                    {insight.action && (
                      <div className="mt-3">
                        <Badge variant="outline" className="text-xs cursor-pointer hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/30 transition-colors">
                          {insight.action}
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
                {insights.opportunities.length === 0 && (
                  <div className="p-6 text-center text-muted-foreground text-sm">No new opportunities.</div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Athena AI Chat Panel */}
        <DashboardAthenaChat />
      </div>

      {/* Charts + Platform Connections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Spend Trend */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Spend Trend</CardTitle>
            <CardDescription>Daily spend across platforms</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSpendTrend ? (
              <Skeleton className="h-[220px] w-full" />
            ) : spendTrend ? (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={spendTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false} tickLine={false} dy={10}
                    />
                    <YAxis
                      tickFormatter={(v) => `₹${v / 1000}k`}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false} tickLine={false} dx={-10}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                      formatter={(v: number) => [formatCurrency(v), "Spend"]}
                      labelFormatter={(l) => new Date(l).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    />
                    <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Platform Performance */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Platform Performance</CardTitle>
            <CardDescription>ROAS and Spend by platform</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPlatformComp ? (
              <Skeleton className="h-[220px] w-full" />
            ) : platformComp ? (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformComp} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tickFormatter={(v) => `₹${v / 1000}k`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="platform" type="category" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                      formatter={(v: number, name: string) => [
                        name === "spend" ? formatCurrency(v) : name === "roas" ? `${v}x` : v,
                        name.charAt(0).toUpperCase() + name.slice(1)
                      ]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="spend" name="Spend" radius={[0, 4, 4, 0]} maxBarSize={30}>
                      {platformComp.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getPlatformColor(entry.platform)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Platform Quick Connect */}
        <div className="lg:col-span-1">
          <DashboardIntegrations />
        </div>
      </div>

      {/* Top Performers */}
      {insights && (
        <Card className="border-emerald-500/20 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-500" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/50">
              {insights.topPerformers.map(insight => (
                <div key={insight.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <p className="font-medium text-sm mb-1">{insight.title}</p>
                  <p className="text-xs text-muted-foreground">{insight.description}</p>
                </div>
              ))}
              {insights.topPerformers.length === 0 && (
                <div className="p-6 text-center text-muted-foreground text-sm col-span-3">No top performers data.</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Sheet */}
      <DashboardSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onKeyUpdated={(isSet) => {
          setGeminiKeySet(isSet);
        }}
      />
    </div>
  );
}
