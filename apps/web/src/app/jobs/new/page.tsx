import { ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { NewScanForm } from "@/components/moderation/new-scan-form";

export default function NewScanPage() {
  return (
    <div className="space-y-8">
      <div className="animate-fade-in border-b border-border pb-5">
        <h1 className="page-title">New Scan</h1>
        <p className="mt-1.5 max-w-prose text-sm text-muted-foreground text-pretty">
          Upload a video to Backblaze B2 and run the NudeNet moderation pipeline.
          Frames are sampled with ffmpeg and classified locally — no second API
          key, nothing leaves your infrastructure.
        </p>
      </div>
      <div className="animate-fade-in-up stagger-2 max-w-3xl space-y-6">
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Defensive content classification</AlertTitle>
          <AlertDescription>
            NudeNet screens user-generated footage for unsafe content. A clean
            clip legitimately produces a &ldquo;Clean — 0 violations&rdquo;
            report, the common Trust &amp; Safety case.
          </AlertDescription>
        </Alert>
        <NewScanForm />
      </div>
    </div>
  );
}
