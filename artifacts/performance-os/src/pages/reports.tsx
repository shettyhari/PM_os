import { useListReports, useCreateReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, Plus, Calendar, FileBarChart } from "lucide-react";

export default function Reports() {
  const { data: reports, isLoading } = useListReports();
  const createReport = useCreateReport();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready': return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Ready</Badge>;
      case 'generating': return <Badge variant="secondary" className="animate-pulse">Generating...</Badge>;
      case 'scheduled': return <Badge variant="outline">Scheduled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Download and schedule performance exports.</p>
        </div>
        <Button className="gap-2" onClick={() => createReport.mutate({ data: { title: "Custom Report", type: "custom" } })}>
          <Plus className="h-4 w-4" />
          New Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-40 flex flex-col justify-between">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-full mt-4" />
              </CardContent>
            </Card>
          ))
        ) : reports?.map((report) => (
          <Card key={report.id} className="flex flex-col justify-between hover:border-primary/30 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start mb-2">
                <div className="p-2 rounded bg-primary/10 text-primary w-fit">
                  {report.type === 'custom' ? <FileBarChart className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                {getStatusBadge(report.status)}
              </div>
              <CardTitle className="text-base font-semibold line-clamp-1">{report.title}</CardTitle>
              <CardDescription className="text-xs flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(report.createdAt).toLocaleDateString()} {report.period && `• ${report.period}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Button 
                variant="secondary" 
                className="w-full text-xs gap-2" 
                disabled={report.status !== 'ready'}
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
