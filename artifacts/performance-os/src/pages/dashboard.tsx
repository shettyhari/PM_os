import { useGetDashboardSummary, useGetKpis, useGetSpendTrend, useGetPlatformComparison, useGetCurrentUser, useGetAiInsights } from "@workspace/api-client-react";
import { formatCurrency, formatNumber, formatPercentage, getPlatformColor } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, TrendingUp, AlertCircle, Lightbulb, Trophy, Play } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: user } = useGetCurrentUser();
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: kpis, isLoading: isLoadingKpis } = useGetKpis();
  const { data: spendTrend, isLoading: isLoadingSpendTrend } = useGetSpendTrend();
  const { data: platformComp, isLoading: isLoadingPlatformComp } = useGetPlatformComparison();
  const { data: insights, isLoading: isLoadingInsights } = useGetAiInsights();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Good Morning, {user?.name?.split(' ')[0] || 'User'} 👋</h1>
        <p className="text-muted-foreground">Here is what's happening with your campaigns today.</p>
      </div>

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

      {/* KPI Cards Grid */}
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
                    kpi.trend === 'up' ? 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400' : 
                    kpi.trend === 'down' ? 'text-rose-600 bg-rose-500/10 dark:text-rose-400' : 
                    'text-slate-600 bg-slate-500/10 dark:text-slate-400'
                  }`}>
                    {kpi.trend === 'up' && <ArrowUpRight className="w-3 h-3 mr-1" />}
                    {kpi.trend === 'down' && <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {kpi.trend === 'neutral' && <TrendingUp className="w-3 h-3 mr-1" />}
                    {Math.abs(kpi.trendValue)}%
                  </div>
                </div>
                <div className="text-3xl font-bold tracking-tight">
                  {kpi.unit === 'currency' ? formatCurrency(kpi.value) : 
                   kpi.unit === 'percentage' ? formatPercentage(kpi.value * 100) : 
                   kpi.unit === 'multiplier' ? `${kpi.value}x` : 
                   formatNumber(kpi.value)}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* AI Insights Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {isLoadingInsights ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)
        ) : insights ? (
          <>
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

            <Card className="border-emerald-500/20 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-emerald-500" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {insights.topPerformers.map(insight => (
                    <div key={insight.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <p className="font-medium text-sm mb-1">{insight.title}</p>
                      <p className="text-xs text-muted-foreground">{insight.description}</p>
                    </div>
                  ))}
                  {insights.topPerformers.length === 0 && (
                    <div className="p-6 text-center text-muted-foreground text-sm">No top performers data.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Spend Trend</CardTitle>
            <CardDescription>Daily spend across platforms</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSpendTrend ? (
              <Skeleton className="h-[300px] w-full" />
            ) : spendTrend ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={spendTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis 
                      tickFormatter={(value) => `₹${value / 1000}k`}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: number) => [formatCurrency(value), 'Spend']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    />
                    <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Platform Performance</CardTitle>
            <CardDescription>ROAS and Spend by platform</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPlatformComp ? (
              <Skeleton className="h-[300px] w-full" />
            ) : platformComp ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformComp} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tickFormatter={(value) => `₹${value / 1000}k`} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="platform" type="category" tick={{ fontSize: 12, fill: 'hsl(var(--foreground))', textTransform: 'capitalize' }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: number, name: string) => [
                        name === 'spend' ? formatCurrency(value) : name === 'roas' ? `${value}x` : value, 
                        name.charAt(0).toUpperCase() + name.slice(1)
                      ]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="spend" name="Spend" radius={[0, 4, 4, 0]} maxBarSize={40}>
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
      </div>
    </div>
  );
}
