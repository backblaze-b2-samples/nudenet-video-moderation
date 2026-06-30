"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { FileRejection } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { VideoDropzone } from "./video-dropzone";
import { createModerationJob } from "@/lib/api-client";
import { humanizeBytes } from "@/lib/utils";

// Finite option sets are rendered as selectors (not free text) per the Form UX
// conventions. "1 fps" and "Every 2 seconds" both map to the fps sample mode
// with different sample_fps values; "Keyframes only" maps to the keyframes mode.
const SAMPLE_PRESETS = [
  { value: "fps-1", label: "1 fps", mode: "fps", fps: 1 },
  { value: "fps-0.5", label: "Every 2 seconds", mode: "fps", fps: 0.5 },
  { value: "keyframes", label: "Keyframes only", mode: "keyframes", fps: 1 },
] as const;

// The genuinely-NSFW exposed NudeNet classes. Advanced/optional override of the
// server default. Finite set -> rendered as a multi-select (checkbox group).
const VIOLATION_LABEL_OPTIONS = [
  "FEMALE_GENITALIA_EXPOSED",
  "MALE_GENITALIA_EXPOSED",
  "FEMALE_BREAST_EXPOSED",
  "BUTTOCKS_EXPOSED",
  "ANUS_EXPOSED",
];

export function NewScanForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<string>("fps-1");
  const [threshold, setThreshold] = useState<string>("0.25");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [labels, setLabels] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFilesSelected = useCallback((files: File[]) => {
    if (files[0]) setFile(files[0]);
  }, []);

  const handleFilesRejected = useCallback((rejections: FileRejection[]) => {
    const first = rejections[0];
    const reason =
      first?.errors[0]?.code === "file-too-large"
        ? `exceeds the size limit (${humanizeBytes(first.file.size)})`
        : first?.errors[0]?.message ?? "could not be added";
    toast.error(`${first?.file.name ?? "File"}: ${reason}`);
  }, []);

  const toggleLabel = (label: string) => {
    setLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const onSubmit = async () => {
    if (!file) {
      toast.error("Choose a video to scan first.");
      return;
    }
    const thresholdNum = Number(threshold);
    if (Number.isNaN(thresholdNum) || thresholdNum < 0 || thresholdNum > 1) {
      toast.error("Threshold must be between 0 and 1.");
      return;
    }
    const chosen = SAMPLE_PRESETS.find((p) => p.value === preset)!;

    setSubmitting(true);
    setProgress(0);
    try {
      const report = await createModerationJob(
        file,
        {
          sampleMode: chosen.mode,
          sampleFps: chosen.fps,
          threshold: thresholdNum,
          violationLabels:
            showAdvanced && labels.size > 0
              ? Array.from(labels).join(",")
              : undefined,
        },
        setProgress,
      );
      toast.success(
        report.verdict === "flagged"
          ? `Scan complete — ${report.flagged_frame_count} flagged frame(s)`
          : "Scan complete — clean",
      );
      router.push(`/jobs/${report.video_id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Scan failed";
      toast.error(message);
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="border-b border-border py-4 px-5">
        <CardTitle className="card-title">New Moderation Scan</CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-6">
        <div className="space-y-2">
          <Label>Video file</Label>
          <VideoDropzone
            file={file}
            onFilesSelected={handleFilesSelected}
            onFilesRejected={handleFilesRejected}
            disabled={submitting}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sample-mode">Sampling</Label>
            <Select value={preset} onValueChange={setPreset} disabled={submitting}>
              <SelectTrigger id="sample-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SAMPLE_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How densely frames are pulled from the video for classification.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="threshold">Detection threshold</Label>
            <Input
              id="threshold"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              disabled={submitting}
              className="w-32 font-mono tabular-nums"
            />
            {/* Safe-default hint (guidance only, no autofill button). */}
            <p className="text-xs text-muted-foreground">
              Minimum confidence to record a detection. Suggested default: 0.25.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={showAdvanced}
              onCheckedChange={(v) => setShowAdvanced(Boolean(v))}
              disabled={submitting}
            />
            Advanced: override violation labels
          </label>
          {showAdvanced && (
            <div className="rounded-md border border-border p-4 space-y-2">
              <p className="text-xs text-muted-foreground">
                Leave all unchecked to use the server policy default. Only the
                classes you check will flag a frame.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {VIOLATION_LABEL_OPTIONS.map((label) => (
                  <label
                    key={label}
                    className="flex items-center gap-2 text-xs font-mono cursor-pointer"
                  >
                    <Checkbox
                      checked={labels.has(label)}
                      onCheckedChange={() => toggleLabel(label)}
                      disabled={submitting}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {submitting && (
          <div className="space-y-2" aria-live="polite">
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground">
              {progress < 100
                ? `Uploading… ${progress}%`
                : "Running NudeNet classification on sampled frames…"}
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={onSubmit} disabled={submitting || !file}>
            {submitting ? "Scanning…" : "Upload & scan"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
