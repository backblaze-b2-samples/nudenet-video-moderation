export interface FileMetadata {
  key: string;
  filename: string;
  folder: string;
  size_bytes: number;
  size_human: string;
  content_type: string;
  uploaded_at: string;
  url: string | null;
}

export interface FileMetadataDetail {
  filename: string;
  size_bytes: number;
  size_human: string;
  mime_type: string;
  extension: string;
  md5: string;
  sha256: string;
  uploaded_at: string;
  // Image-specific
  image_width: number | null;
  image_height: number | null;
  // Audio/Video
  duration_seconds: number | null;
  codec: string | null;
  bitrate: number | null;
}

export interface DailyUploadCount {
  date: string;
  uploads: number;
}

export interface UploadStats {
  total_files: number;
  total_size_bytes: number;
  total_size_human: string;
  uploads_today: number;
}

// --- Moderation domain ---

export type ReviewDecision = "pending" | "approved" | "rejected" | "escalated";

export interface FrameDetection {
  label: string;
  score: number;
  box: number[];
  is_violation: boolean;
}

export interface FrameResult {
  index: number;
  timestamp_seconds: number;
  detections: FrameDetection[];
  flagged_key: string | null;
  flagged: boolean;
}

export interface ModerationReport {
  video_id: string;
  filename: string;
  source_key: string;
  verdict: "clean" | "flagged";
  frames_analyzed: number;
  flagged_frame_count: number;
  threshold: number;
  sample_mode: string;
  sample_fps: number;
  violation_labels: string[];
  frames: FrameResult[];
  review_decision: ReviewDecision;
  review_notes: string;
  created_at: string;
  updated_at: string;
}

export interface ManifestEntry {
  video_id: string;
  filename: string;
  verdict: "clean" | "flagged";
  frames_analyzed: number;
  flagged_frame_count: number;
  review_decision: ReviewDecision;
  created_at: string;
  updated_at: string;
}

export interface ModerationStats {
  total_reports: number;
  flagged_reports: number;
  clean_reports: number;
  pending_review: number;
  total_flagged_frames: number;
  scans_today: number;
}

export interface DailyScanCount {
  date: string;
  scans: number;
}

export interface ReviewUpdate {
  review_decision: ReviewDecision;
  review_notes: string;
  threshold?: number | null;
}
