import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentScansTable } from "@/components/dashboard/recent-scans-table";
import { ScanActivityChart } from "@/components/dashboard/scan-activity-chart";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="animate-fade-in border-b border-border pb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Moderation Overview</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            NSFW screening activity across your Backblaze B2 video pipeline.
          </p>
        </div>
        <Button asChild size="sm" className="h-8">
          <Link href="/jobs/new">
            <ShieldCheck className="h-3.5 w-3.5" />
            New scan
          </Link>
        </Button>
      </div>
      <StatsCards />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="animate-fade-in-up stagger-3">
          <ScanActivityChart />
        </div>
        <div className="animate-fade-in-up stagger-4">
          <RecentScansTable />
        </div>
      </div>
    </div>
  );
}
