import { Badge } from "@/components/ui/badge";
import type { ReviewDecision } from "@nudenet-video-moderation/shared";

export function VerdictBadge({ verdict }: { verdict: string }) {
  const flagged = verdict === "flagged";
  return (
    <Badge
      variant={flagged ? "destructive" : "secondary"}
      className={
        flagged
          ? ""
          : "bg-[var(--success)]/10 text-[var(--success)] border-transparent"
      }
    >
      {flagged ? "Flagged" : "Clean"}
    </Badge>
  );
}

const DECISION_LABELS: Record<ReviewDecision, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  escalated: "Escalated",
};

export function DecisionBadge({ decision }: { decision: ReviewDecision }) {
  const styles: Record<ReviewDecision, string> = {
    pending: "bg-muted text-muted-foreground border-transparent",
    approved: "bg-[var(--success)]/10 text-[var(--success)] border-transparent",
    rejected: "bg-destructive/10 text-destructive border-transparent",
    escalated: "bg-amber-500/10 text-amber-600 border-transparent",
  };
  return (
    <Badge variant="outline" className={styles[decision]}>
      {DECISION_LABELS[decision]}
    </Badge>
  );
}
