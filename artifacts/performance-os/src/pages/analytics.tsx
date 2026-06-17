import { useState } from "react";
import { useGetAttribution, useGetConversionFunnel, useGetPerformanceForecast } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

export default function Analytics() {
  const [attrModel, setAttrModel] = useState<"first_click" | "last_click" | "linear" | "data_driven">("data_driven");
  const [forecastDays, setForecastDays] = useState<7 | 30 | 90>(30);
  
  const { data: attribution, isLoading: isLoadingAttr } = useGetAttribution({ model: attrModel });
  const { data: funnel, isLoading: isLoadingFunnel } = useGetConversionFunnel();
  const { data: forecast, isLoading: isLoadingForecast } = useGetPerformanceForecast({ days: forecastDays });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Attribution, funnels, and performance forecasting.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">Attribution</CardTitle>
              <CardDescription>Revenue by channel</CardDescription>
            </div>
            <Tabs value={attrModel} onValueChange={(v) => setAttrModel(v as any)} className="w-auto">
              <TabsList className="h-8">
                <TabsTrigger value="first_click" className="text-xs px-2 h-6">First</TabsTrigger>
                <TabsTrigger value="last_click" className="text-xs px-2 h-6">Last</TabsTrigger>
                <TabsTrigger value="linear" className="text-xs px-2 h-6">Linear</TabsTrigger>
                <TabsTrigger value="data_driven" className="text-xs px-2 h-6">Data</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoadingAttr ? (
              <Skeleton className="h-[300px] w-full rounded-xl" />
            ) : attribution ? (
              <div className="h-[300px] w-full flex items-center justify-center relative">
                <div className="absolute inset-0 flex items-center justify-center flex-col z-0">
                  <span className="text-3xl font-bold">{formatCurrency(attribution.totalRevenue)}</span>
                  <span className="text-xs text-muted-foreground">Total Revenue</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attribution.channels}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={2}
                      dataKey="revenue"
                      nameKey="channel"
                    >
                      {attribution.channels.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || `hsl(var(--chart-${(index % 5) + 1}))`} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Conversion Funnel</CardTitle>
            <CardDescription>Customer journey drop-off</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingFunnel ? (
              <Skeleton className="h-[300px] w-full rounded-xl" />
            ) : funnel ? (
              <div className="space-y-4 py-4">
                {funnel.map((stage, i) => (
                  <div key={stage.stage} className="relative">
                    <div className="flex justify-between items-end mb-1">
                      <span className="font-medium text-sm capitalize">{stage.stage.replace('_', ' ')}</span>
                      <div className="text-right">
                        <span className="text-sm font-bold">{stage.count.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground ml-2">{stage.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-1000" 
                        style={{ width: `${stage.percentage}%` }}
                      />
                    </div>
                    {i < funnel.length - 1 && (
                      <div className="flex justify-center my-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full border border-border/50">
                          <span>{funnel[i+1].dropoff.toFixed(1)}% drop-off</span>
                          <ArrowRight className="w-3 h-3 rotate-90" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">Performance Forecast</CardTitle>
              <CardDescription>AI-predicted revenue and spend</CardDescription>
            </div>
            <Tabs value={forecastDays.toString()} onValueChange={(v) => setForecastDays(parseInt(v) as any)} className="w-auto">
              <TabsList className="h-8">
                <TabsTrigger value="7" className="text-xs px-3 h-6">7d</TabsTrigger>
                <TabsTrigger value="30" className="text-xs px-3 h-6">30d</TabsTrigger>
                <TabsTrigger value="90" className="text-xs px-3 h-6">90d</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoadingForecast ? (
              <Skeleton className="h-[350px] w-full rounded-xl" />
            ) : forecast ? (
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={forecast} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
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
                      yAxisId="left"
                      tickFormatter={(value) => `₹${value / 1000}k`}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      dx={-10}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={(value) => `₹${value / 1000}k`}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      dx={10}
                    />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="predictedRevenue" name="Predicted Revenue" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" dataKey="predictedSpend" name="Predicted Spend" stroke="hsl(var(--chart-2))" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
