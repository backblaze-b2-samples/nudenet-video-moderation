"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  deleteFile,
  deleteModerationReport,
  getFiles,
  getModerationActivity,
  getModerationReport,
  getModerationReports,
  getModerationStats,
  getPreviewUrl,
  rerunModerationReport,
  updateModerationReview,
} from "@/lib/api-client";
import type {
  FileMetadata,
  ManifestEntry,
  ReviewUpdate,
} from "@nudenet-video-moderation/shared";

// Single source of truth for query keys. Keep these tightly scoped so that
// invalidating one slice doesn't blow away unrelated caches, and so an IDE
// "find usages" of `qk.reports` reveals every consumer.
export const qk = {
  all: ["b2"] as const,
  files: (prefix?: string, limit?: number) =>
    [...qk.all, "files", prefix ?? "", limit ?? 100] as const,
  preview: (key: string) => [...qk.all, "preview", key] as const,
  reports: (limit?: number) => [...qk.all, "reports", limit ?? 100] as const,
  report: (videoId: string) => [...qk.all, "report", videoId] as const,
  modStats: () => [...qk.all, "moderation", "stats"] as const,
  modActivity: (days: number) =>
    [...qk.all, "moderation", "activity", days] as const,
};

// --- Bucket explorer (/files) ---

export function useFiles(prefix = "", limit = 100) {
  return useQuery<FileMetadata[], ApiError>({
    queryKey: qk.files(prefix, limit),
    queryFn: () => getFiles(prefix, limit),
  });
}

export function usePreviewUrl(key: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: qk.preview(key ?? ""),
    queryFn: () => getPreviewUrl(key as string),
    enabled: enabled && !!key,
    staleTime: 60_000,
  });
}

export function useDeleteFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileKey: string) => deleteFile(fileKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.all });
    },
  });
}

// --- Moderation ---

export function useModerationReports(limit = 100) {
  return useQuery<ManifestEntry[], ApiError>({
    queryKey: qk.reports(limit),
    queryFn: () => getModerationReports(limit),
  });
}

export function useModerationReport(videoId: string | undefined) {
  return useQuery({
    queryKey: qk.report(videoId ?? ""),
    queryFn: () => getModerationReport(videoId as string),
    enabled: !!videoId,
  });
}

export function useModerationStats() {
  return useQuery({
    queryKey: qk.modStats(),
    queryFn: getModerationStats,
  });
}

export function useModerationActivity(days = 7) {
  return useQuery({
    queryKey: qk.modActivity(days),
    queryFn: () => getModerationActivity(days),
  });
}

export function useUpdateReview(videoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReviewUpdate) => updateModerationReview(videoId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.all });
    },
  });
}

export function useRerunReport(videoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (threshold?: number) => rerunModerationReport(videoId, threshold),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.all });
    },
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (videoId: string) => deleteModerationReport(videoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.all });
    },
  });
}
