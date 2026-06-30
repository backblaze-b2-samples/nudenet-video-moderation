"use client";

import { useParams } from "next/navigation";
import { ReportDetail } from "@/components/moderation/report-detail";

export default function ReportDetailPage() {
  const params = useParams<{ videoId: string }>();
  return <ReportDetail videoId={params.videoId} />;
}
