import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ReviewQueue } from "@/components/moderation/review-queue";

export default function ReviewQueuePage() {
  return (
    <div className="space-y-8">
      <div className="animate-fade-in flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div className="min-w-0">
          <h1 className="page-title">Review Queue</h1>
          <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
            Every moderation report stored under{" "}
            <code className="font-mono text-xs">moderation/reports/</code> in
            your bucket. Open a report to review detections and set a decision.
          </p>
        </div>
        <Button asChild size="sm" className="h-8 shrink-0">
          <Link href="/jobs/new">
            <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
            New scan
          </Link>
        </Button>
      </div>
      <div className="animate-fade-in-up stagger-2">
        <ReviewQueue />
      </div>
    </div>
  );
}
