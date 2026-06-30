"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDeleteReport, useRerunReport, useUpdateReview } from "@/lib/queries";
import type {
  ModerationReport,
  ReviewDecision,
} from "@nudenet-video-moderation/shared";

const DECISIONS: { value: ReviewDecision; label: string; hint: string }[] = [
  { value: "pending", label: "Pending", hint: "Not yet reviewed" },
  { value: "approved", label: "Approved", hint: "Safe to publish" },
  { value: "rejected", label: "Rejected", hint: "Blocked from publication" },
  { value: "escalated", label: "Escalated", hint: "Needs a senior reviewer" },
];

export function ReportActions({ report }: { report: ModerationReport }) {
  const router = useRouter();
  // Edit form opens PRE-FILLED with the report's current decision + notes.
  const [decision, setDecision] = useState<ReviewDecision>(report.review_decision);
  const [notes, setNotes] = useState(report.review_notes);

  const updateReview = useUpdateReview(report.video_id);
  const rerun = useRerunReport(report.video_id);
  const del = useDeleteReport();

  const saveDecision = () => {
    updateReview.mutate(
      { review_decision: decision, review_notes: notes },
      {
        onSuccess: () => toast.success("Review decision saved"),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Failed to save"),
      },
    );
  };

  const handleRerun = () => {
    rerun.mutate(undefined, {
      onSuccess: () => toast.success("Re-scan complete"),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Re-run failed"),
    });
  };

  const handleDelete = () => {
    del.mutate(report.video_id, {
      onSuccess: () => {
        toast.success("Report deleted");
        router.push("/jobs");
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Delete failed"),
    });
  };

  return (
    <Card>
      <CardHeader className="border-b border-border py-4 px-5">
        <CardTitle className="card-title">Review Decision</CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        <div className="space-y-3">
          <Label>Decision</Label>
          <RadioGroup
            value={decision}
            onValueChange={(v) => setDecision(v as ReviewDecision)}
            className="grid gap-2"
          >
            {DECISIONS.map((d) => (
              <label
                key={d.value}
                className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/50"
              >
                <RadioGroupItem value={d.value} className="mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">{d.label}</div>
                  <div className="text-xs text-muted-foreground">{d.hint}</div>
                </div>
              </label>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="review-notes">Notes</Label>
          <Textarea
            id="review-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional reviewer notes for the audit trail"
            className="resize-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <Button onClick={saveDecision} disabled={updateReview.isPending}>
            {updateReview.isPending ? "Saving…" : "Save decision"}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRerun}
              disabled={rerun.isPending}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1 ${rerun.isPending ? "animate-spin" : ""}`}
              />
              {rerun.isPending ? "Re-scanning…" : "Re-run scan"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  disabled={del.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this report?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes the report JSON, every flagged-frame
                    crop, and the raw source video under this video&apos;s prefix
                    in B2. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={del.isPending}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={del.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {del.isPending ? "Deleting…" : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
