"use client";

import Link from "next/link";
import { ListChecks, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { VerdictBadge, DecisionBadge } from "@/components/moderation/badges";
import { useModerationReports } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export function ReviewQueue() {
  const { data: reports = [], isLoading, isFetching, error, refetch } =
    useModerationReports(200);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 space-y-0">
        <CardTitle className="card-title">
          Moderation Reports
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            moderation/reports/
          </span>
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="h-7 shrink-0 text-xs"
          disabled={isFetching}
          aria-label={isFetching ? "Refreshing reports" : "Refresh reports"}
        >
          <RefreshCw
            aria-hidden="true"
            className={`h-3.5 w-3.5 mr-1 ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="p-0" aria-busy={isLoading || isFetching}>
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorState
            error={error}
            title="Couldn't load reports"
            onRetry={() => refetch()}
            className="px-4"
          />
        ) : reports.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No reports yet"
            description="Run a scan to populate the review queue."
            action={
              <Button asChild size="sm">
                <Link href="/jobs/new">
                  <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                  New scan
                </Link>
              </Button>
            }
            className="px-4"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Video
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Verdict
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Decision
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Flagged
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Frames
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Scanned
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.video_id} className="table-row-hover">
                  <TableCell className="font-medium">
                    <Link
                      href={`/jobs/${r.video_id}`}
                      className="hover:underline"
                    >
                      {r.filename}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <VerdictBadge verdict={r.verdict} />
                  </TableCell>
                  <TableCell>
                    <DecisionBadge decision={r.review_decision} />
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                    {r.flagged_frame_count}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                    {r.frames_analyzed}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDate(r.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
