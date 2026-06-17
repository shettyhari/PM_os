import { useState } from "react";
import { useListLeads, useGetCrmSummary } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Mail, Phone, Calendar } from "lucide-react";
import { SiGoogleads, SiMeta } from "react-icons/si";
import { Linkedin, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Crm() {
  const [search, setSearch] = useState("");
  const { data: summary, isLoading: isLoadingSummary } = useGetCrmSummary();
  const { data: leads, isLoading: isLoadingLeads } = useListLeads({ search });

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'google': return <SiGoogleads className="w-3 h-3 text-[#4285F4]" />;
      case 'meta': return <SiMeta className="w-3 h-3 text-[#0082FB]" />;
      case 'linkedin': return <Linkedin className="w-3 h-3 text-[#0A66C2]" />;
      case 'microsoft': return <Globe className="w-3 h-3 text-[#00A4EF]" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'contacted': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'qualified': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'proposal': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      case 'won': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'lost': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">CRM</h1>
        <p className="text-muted-foreground">Lead pipeline and revenue tracking.</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar">
        {isLoadingSummary ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-32 shrink-0 rounded-xl" />)
        ) : summary?.byStatus.map((stat) => (
          <Card key={stat.status} className="shrink-0 w-32 border-border/50 bg-card hover:bg-muted/30 transition-colors cursor-pointer">
            <CardContent className="p-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{stat.status}</div>
              <div className="text-2xl font-bold">{stat.count}</div>
              <div className="text-[10px] text-muted-foreground mt-1 truncate">{formatCurrency(stat.value)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/20 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search leads by name or email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Lead</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingLeads ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : leads?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No leads found.
                  </TableCell>
                </TableRow>
              ) : (
                leads?.map((lead) => (
                  <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div className="font-medium">{lead.name}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {lead.email}</span>
                        {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("capitalize px-2 py-0.5 border text-[11px] font-semibold", getStatusColor(lead.status))}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm capitalize">
                        {getSourceIcon(lead.source)}
                        <span>{lead.source}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm truncate max-w-[200px]">
                      {lead.campaign}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {lead.revenue ? formatCurrency(lead.revenue) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(lead.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
