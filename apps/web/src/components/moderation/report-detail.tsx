"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { VerdictBadge, DecisionBadge } from "@/components/moderation/badges";
import { FlaggedFrame } from "@/components/moderation/flagged-frame";
import { ReportActions } from "@/components/moderation/report-actions";
import { useModerationReport } from "@/lib/queries";
import { ShieldAlert } from "lucide-react";

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-xs tabular-nums text-right">{value}</span>
    </div>
  );
}

export function ReportDetail({ videoId }: { videoId: string }) {
  const { data: report, isLoading, error, refetch } = useModerationReport(videoId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  if (!report) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Report not found"
        description="This report may have been deleted."
      />
    );
  }

  const allDetections = report.frames.flatMap((f) =>
    f.detections.map((d) => ({ ...d, frameIndex: f.index, ts: f.timestamp_seconds })),
  );
  const flaggedFrames = report.frames.filter((f) => f.flagged && f.flagged_key);

  return (
    <div className="space-y-8">
      <div className="animate-fade-in flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 h-7">
            <Link href="/jobs">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to queue
            </Link>
          </Button>
          <h1 className="page-title break-all">{report.filename}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <VerdictBadge verdict={report.verdict} />
            <DecisionBadge decision={report.review_decision} />
            <Badge variant="outline" className="font-mono text-[11px]">
              {report.video_id}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Flagged-frame grid */}
          <Card>
            <CardHeader className="border-b border-border py-4 px-5">
              <CardTitle className="card-title">
                Flagged Frames ({report.flagged_frame_count})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {flaggedFrames.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No frames were flagged. Non-explicit detections (faces, etc.)
                  are recorded below but never flag a frame.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {flaggedFrames.map((f) => (
                    <FlaggedFrame key={f.index} frameKey={f.flagged_key as string} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Per-frame detection table */}
          <Card>
            <CardHeader className="border-b border-border py-4 px-5">
              <CardTitle className="card-title">Detections</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {allDetections.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">
                  No detections at or above the {report.threshold} threshold
                  across {report.frames_analyzed} analyzed frame(s).
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                        Frame
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                        Time
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                        Class
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                        Score
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                        Flags?
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allDetections.map((d, i) => (
                      <TableRow key={`${d.frameIndex}-${i}`}>
                        <TableCell className="font-mono text-xs tabular-nums">
                          #{d.frameIndex}
                        </TableCell>
                        <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                          {d.ts.toFixed(1)}s
                        </TableCell>
                        <TableCell className="font-mono text-xs">{d.label}</TableCell>
                        <TableCell className="font-mono text-xs tabular-nums">
                          {d.score.toFixed(3)}
                        </TableCell>
                        <TableCell>
                          {d.is_violation ? (
                            <Badge variant="destructive">Violation</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              recorded
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Raw report JSON */}
          <Card>
            <CardHeader className="border-b border-border py-4 px-5">
              <CardTitle className="card-title">Raw report JSON</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <pre className="max-h-96 overflow-auto p-5 text-xs font-mono leading-relaxed">
                {JSON.stringify(report, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-border py-4 px-5">
              <CardTitle className="card-title">Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-2.5">
              <MetaRow label="Frames analyzed" value={String(report.frames_analyzed)} />
              <MetaRow label="Flagged frames" value={String(report.flagged_frame_count)} />
              <MetaRow label="Threshold" value={String(report.threshold)} />
              <MetaRow label="Sample mode" value={report.sample_mode} />
              <MetaRow label="Sample fps" value={String(report.sample_fps)} />
              <MetaRow label="Source key" value={report.source_key} />
            </CardContent>
          </Card>

          <ReportActions report={report} />
        </div>
      </div>
    </div>
  );
}
