"use client";

import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { usePreviewUrl } from "@/lib/queries";

/**
 * Renders a single flagged-frame crop from B2 via a short-lived presigned URL.
 * The crop key is sample-scoped to moderation/flagged/<video_id>/frames/.
 */
export function FlaggedFrame({ frameKey }: { frameKey: string }) {
  const { data, isLoading, isError } = usePreviewUrl(frameKey, true);
  const url = data?.url;

  return (
    <div className="relative aspect-video overflow-hidden rounded-md border border-border bg-muted/30">
      {isLoading ? (
        <Skeleton className="h-full w-full" />
      ) : url && !isError ? (
        <Image
          src={url}
          alt="Flagged frame"
          fill
          sizes="(max-width: 768px) 50vw, 200px"
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
          Preview unavailable
        </div>
      )}
    </div>
  );
}
