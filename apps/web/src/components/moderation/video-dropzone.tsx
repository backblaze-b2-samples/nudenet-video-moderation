"use client";

import { useCallback, useId } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Film, Upload } from "lucide-react";
import { humanizeBytes } from "@/lib/utils";

interface VideoDropzoneProps {
  file: File | null;
  onFilesSelected: (files: File[]) => void;
  onFilesRejected: (rejections: FileRejection[]) => void;
  disabled?: boolean;
}

const MAX_SIZE = 500 * 1024 * 1024; // 500MB

export function VideoDropzone({
  file,
  onFilesSelected,
  onFilesRejected,
  disabled,
}: VideoDropzoneProps) {
  const descriptionId = useId();

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) onFilesSelected(accepted);
    },
    [onFilesSelected],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: onFilesRejected,
    maxSize: MAX_SIZE,
    disabled,
    multiple: false,
    accept: {
      "video/*": [".mp4", ".mov", ".webm", ".mkv", ".avi", ".mpeg"],
    },
  });

  const active = isDragActive && !disabled;
  let title = "Drag & drop a video, or click to browse";
  let description = "MP4, MOV, WebM, MKV, AVI — up to 500 MB";

  if (file) {
    title = file.name;
    description = humanizeBytes(file.size);
  } else if (active) {
    title = "Drop the video here";
    description = "Release to select it.";
  }

  let stateClasses = "border-border hover:border-primary/60 hover:bg-muted/60";
  if (disabled) {
    stateClasses = "border-border";
  } else if (active) {
    stateClasses = "border-primary bg-[var(--accent-subtle)] dropzone-active";
  } else if (file) {
    stateClasses = "border-primary/40 bg-muted/40";
  }
  const disabledClasses = disabled
    ? "cursor-not-allowed bg-muted/40 text-muted-foreground opacity-80"
    : "cursor-pointer";

  return (
    <div
      {...getRootProps({
        "aria-describedby": descriptionId,
        "aria-disabled": disabled,
        "aria-label": "Upload a video to moderate",
        role: "button",
      })}
      className={[
        "flex min-h-44 flex-col items-center justify-center rounded-md",
        "border-2 border-dashed px-4 py-8 text-center transition-colors",
        stateClasses,
        disabledClasses,
      ].join(" ")}
    >
      <input
        {...getInputProps({
          "aria-describedby": descriptionId,
          "aria-label": "Choose a video to moderate",
        })}
      />
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-md bg-muted border border-border">
          {file ? (
            <Film className="h-5 w-5 text-primary" aria-hidden="true" />
          ) : (
            <Upload className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 max-w-full">
          <p className="text-base font-semibold [overflow-wrap:anywhere]">
            {title}
          </p>
          <p id={descriptionId} className="mt-1 text-xs text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
