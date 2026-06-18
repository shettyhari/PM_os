import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Database, RefreshCw, TrendingUp, DollarSign, MousePointerClick, Target } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Summary {
  byConnector: {
    connector: string;
    totalSpend: number;
    totalClicks: number;
    totalConversions: number;
    totalRevenue: number;
    totalLeads: number;
    roas: number;
    cpa: number;
  }[];
  totals: {
    spend: number;
    revenue: number;
    clicks: number;
    conversions: number;
    leads: number;
    roas: number;
    cpa: number;
    ctr: number;
  };
  days: number;
}

const CONNECTOR_NAMES: Record<string, string> = {
  facebook_ads: "Meta Ads",
  google_ads: "Google Ads",
  linkedin_ads: "LinkedIn Ads",
  microsoft_ads: "Microsoft Ads",
  tiktok_ads: "TikTok Ads",
  google_analytics_4: "GA4",
};

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

const ATTRIBUTION_MODELS = [
  { id: "last_click", label: "Last Click" },
  { id: "first_click", label: "First Click" },
  { id: "linear", label: "Linear" },
  { id: "data_driven", label: "Data Driven" },
];

function fmt(n: number, type: "currency" | "number" | "percent" | "roas" = "number") {
  if (type === "currency") return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (type === "percent") return `${(n * 100).toFixed(2)}%`;
  if (type === "roas") return `${n.toFixed(2)}x`;
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function Attribution() {
  const [days, setDays] = useState("7");
  const [attrModel, setAttrModel] = useState("last_click");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasWindsor, setHasWindsor] = useState<boolean | null>(null);

  useEffect(() => {
    void loadData();
  }, [days]);

  async function loadData() {
    setLoading(true);
    try {
      const [conn, sum] = await Promise.all([
        fetch(`${BASE}/api/windsor/connection`, { credentials: "include" }).then((r) => r.json()),
        fetch(`${BASE}/api/windsor/summary?days=${days}`, { credentials: "include" }).then((r) => r.ok ? r.json() : null),
      ]);
      setHasWindsor(conn?.status === "connected");
      setSummary(sum as Summary | null);
    } catch {
      setHasWindsor(false);
    } finally {
      setLoading(false);
    }
  }

  const hasData = (summary?.byConnector?.length ?? 0) > 0;

  const pieData = summary?.byConnector.map((c, i) => ({
    name: CONNECTOR_NAMES[c.connector] ?? c.connector,
    value: c.totalSpend,
    color: COLORS[i % COLORS.length]!,
  })) ?? [];

  const barData = summary?.byConnector.map((c) => ({
    name: CONNECTOR_NAMES[c.connector] ?? c.connector,
    ROAS: Number(c.roas.toFixed(2)),
    CPA: Number(c.cpa.toFixed(0)),
    Leads: c.totalLeads,
    Spend: Number(c.totalSpend.toFixed(0)),
  })) ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Attribution</h1>
          <p className="text-sm text-muted-foreground">Cross-platform performance and revenue attribution</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={attrModel} onValueChange={setAttrModel}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ATTRIBUTION_MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => void loadData()} className="h-8 text-xs">
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* No Windsor CTA */}
      {!hasWindsor && !loading && (
        <div className="p-6 rounded-xl border border-dashed border-border flex flex-col items-center text-center gap-3">
          <Database className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium">Connect Windsor.ai to see attribution data</p>
            <p className="text-sm text-muted-foreground mt-1">
              Attribution data is powered by Windsor.ai — connect your API key and sync your campaigns to get started.
            </p>
          </div>
          <Link href="/windsor">
            <Button size="sm">Connect Windsor.ai</Button>
          </Link>
        </div>
      )}

      {/* KPI Totals */}
      {(hasData || loading) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Spend", value: summary?.totals.spend, icon: DollarSign, type: "currency" as const },
            { label: "Total Revenue", value: summary?.totals.revenue, icon: TrendingUp, type: "currency" as const },
            { label: "Blended ROAS", value: summary?.totals.roas, icon: Target, type: "roas" as const },
            { label: "Total Leads", value: summary?.totals.leads, icon: MousePointerClick, type: "number" as const },
          ].map(({ label, value, icon: Icon, type }) => (
            <Card key={label} className="border-border/50">
              <CardContent className="p-4">
                {loading ? (
                  <div className="space-y-2">
                    <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                      <Icon className="h-3.5 w-3.5" />
                      <span className="text-xs">{label}</span>
                    </div>
                    <p className="text-xl font-bold">{value !== undefined ? fmt(value, type) : "—"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Last {days} days</p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {hasData && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Spend by Platform (Pie) */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Spend by Platform</CardTitle>
              <CardDescription className="text-xs">{attrModel.replace(/_/g, " ")} attribution · last {days} days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v, "currency")} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* ROAS by Platform (Bar) */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">ROAS by Platform</CardTitle>
              <CardDescription className="text-xs">Return on ad spend comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="ROAS" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Platform Detail Table */}
          <Card className="border-border/50 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Platform Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      {["Platform", "Spend", "Revenue", "ROAS", "Leads", "Conversions", "CPA"].map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summary?.byConnector.sort((a, b) => b.totalSpend - a.totalSpend).map((row, i) => (
                      <tr key={row.connector} className={cn("border-b border-border/30 hover:bg-muted/30 transition-colors", i % 2 === 0 && "bg-muted/10")}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="font-medium text-xs">{CONNECTOR_NAMES[row.connector] ?? row.connector}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono">{fmt(row.totalSpend, "currency")}</td>
                        <td className="px-4 py-3 text-xs font-mono">{fmt(row.totalRevenue, "currency")}</td>
                        <td className="px-4 py-3 text-xs">
                          <Badge variant="outline" className={cn("text-[10px]", row.roas >= 3 ? "border-green-500/40 text-green-500" : row.roas >= 2 ? "border-yellow-500/40 text-yellow-500" : "border-red-500/40 text-red-500")}>
                            {fmt(row.roas, "roas")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono">{fmt(row.totalLeads)}</td>
                        <td className="px-4 py-3 text-xs font-mono">{fmt(row.totalConversions)}</td>
                        <td className="px-4 py-3 text-xs font-mono">{row.cpa > 0 ? fmt(row.cpa, "currency") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {hasWindsor && !hasData && !loading && (
        <div className="p-8 rounded-xl border border-dashed border-border flex flex-col items-center text-center gap-3">
          <Database className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium">No synced data yet</p>
            <p className="text-sm text-muted-foreground mt-1">Run a Windsor sync to pull your campaign data.</p>
          </div>
          <Link href="/windsor">
            <Button size="sm" variant="outline">Go to Windsor Settings</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
