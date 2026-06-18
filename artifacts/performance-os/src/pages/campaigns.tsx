import { useState } from "react";
import { useListCampaigns } from "@workspace/api-client-react";
import { formatCurrency, formatNumber, getPlatformColor } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Filter, MoreHorizontal, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SiGoogleads, SiMeta } from "react-icons/si";
import { Linkedin, Globe } from "lucide-react";

export default function Campaigns() {
  const [search, setSearch] = useState("");
  const { data: campaigns, isLoading } = useListCampaigns({ search });

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'google': case 'google_ads': return <SiGoogleads className="w-4 h-4 text-[#4285F4]" />;
      case 'meta': case 'facebook': case 'facebook_ads': return <SiMeta className="w-4 h-4 text-[#0082FB]" />;
      case 'linkedin': case 'linkedin_ads': return <Linkedin className="w-4 h-4 text-[#0A66C2]" />;
      case 'microsoft': case 'microsoft_ads': return <Globe className="w-4 h-4 text-[#00A4EF]" />;
      default: return <Globe className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'paused': return 'secondary';
      case 'ended': return 'outline';
      case 'draft': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">Manage your ad campaigns across platforms.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search campaigns..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="hidden sm:flex">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[300px]">Campaign Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right cursor-pointer hover:text-foreground">Spend <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-50" /></TableHead>
                <TableHead className="text-right cursor-pointer hover:text-foreground">CTR <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-50" /></TableHead>
                <TableHead className="text-right cursor-pointer hover:text-foreground">CPA <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-50" /></TableHead>
                <TableHead className="text-right cursor-pointer hover:text-foreground">Leads <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-50" /></TableHead>
                <TableHead className="text-right cursor-pointer hover:text-foreground">ROAS <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-50" /></TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-5 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : campaigns?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No campaigns found.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns?.map((campaign) => (
                  <TableRow key={campaign.id} className="group">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded bg-muted">
                          {getPlatformIcon(campaign.platform)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate">{campaign.name}</div>
                          {campaign.accountName && (
                            <div className="text-xs text-muted-foreground truncate">{campaign.accountName}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(campaign.status)} className="capitalize">
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(campaign.spend)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{(campaign.ctr * 100).toFixed(2)}%</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(campaign.cpa)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatNumber(campaign.leads)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">{campaign.roas.toFixed(2)}x</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
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
