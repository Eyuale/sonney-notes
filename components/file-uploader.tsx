"use client";

import React from "react";

async function extractTextFromFile(file: File): Promise<string | null> {
  const supportedTextTypes = [
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/json",
    "text/x-markdown",
    "text/x-csv",
    "application/csv",
    "application/json",
  ];

  const isSupported = supportedTextTypes.some((type) =>
    file.type.includes(type) ||
    file.name.endsWith(".txt") ||
    file.name.endsWith(".md") ||
    file.name.endsWith(".csv") ||
    file.name.endsWith(".json")
  );

  // Add basic validation
  const maxSize = 10 * 1024 * 1024; // 10MB limit
  if (!isSupported || file.size > maxSize) {
    return null;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}
async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type UploadedFile = {
  _id?: string;
  filename: string;
  contentType: string;
  size: number;
  hash: string;
  objectKey: string;
  createdAt?: string;
  textContent?: string; // Added for extracted text
};

export type UploadProgress = {
  file: File;
  progress: number;
  status: 'uploading' | 'extracting' | 'completed' | 'error';
  error?: string;
};

export type FileUploaderProps = {
  onUploaded?: (file: UploadedFile) => void;
  onProgress?: (progress: UploadProgress) => void;
  accept?: string;
  multiple?: boolean;
  children?: React.ReactNode;
  className?: string;
};

export function FileUploader({ onUploaded, onProgress, accept, multiple, children, className }: FileUploaderProps) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);

    try {
      for (const file of Array.from(files)) {
        // Initialize progress
        const progress: UploadProgress = {
          file,
          progress: 0,
          status: 'uploading'
        };
        onProgress?.(progress);

        // Validate file size
        const maxSize = 50 * 1024 * 1024; // 50MB limit
        if (file.size > maxSize) {
          progress.status = 'error';
          progress.error = `File ${file.name} is too large. Maximum size is 50MB.`;
          onProgress?.(progress);
          continue;
        }

        // Validate file type
        const allowedTypes = [
          "image/", "text/", "application/", "audio/", "video/"
        ];
        const isAllowed = allowedTypes.some(type => file.type.startsWith(type));
        if (!isAllowed) {
          progress.status = 'error';
          progress.error = `File type ${file.type} is not supported.`;
          onProgress?.(progress);
          continue;
        }

        const hash = await sha256Hex(file);

        // 1) Presign
        progress.status = 'uploading';
        progress.progress = 25;
        onProgress?.(progress);

        const presignRes = await fetch("/api/files/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            size: file.size,
            sha256Hex: hash,
          }),
        });
        if (!presignRes.ok) {
          const errorData = await presignRes.json().catch(() => ({}));
          progress.status = 'error';
          progress.error = errorData.error || `Presign failed: ${presignRes.status}`;
          onProgress?.(progress);
          continue;
        }
        const presign = await presignRes.json();

        // 2) Upload if needed
        if (!presign.alreadyExists) {
          progress.progress = 50;
          onProgress?.(progress);

          const putRes = await fetch(presign.uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": file.type || "application/octet-stream",
            },
            body: file,
          });
          if (!putRes.ok) {
            progress.status = 'error';
            progress.error = `S3 upload failed: ${putRes.status} ${putRes.statusText}`;
            onProgress?.(progress);
            continue;
          }
        }

        // 3) Confirm
        progress.progress = 75;
        onProgress?.(progress);

        const confirmRes = await fetch("/api/files/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            size: file.size,
            sha256Hex: hash,
            key: presign.key,
          }),
        });
        if (!confirmRes.ok) {
          const errorData = await confirmRes.json().catch(() => ({}));
          progress.status = 'error';
          progress.error = errorData.error || `Confirm failed: ${confirmRes.status}`;
          onProgress?.(progress);
          continue;
        }
        const { file: saved } = await confirmRes.json();

        // 4) Extract text if supported
        progress.status = 'extracting';
        progress.progress = 90;
        onProgress?.(progress);

        const finalFile = { ...saved, textContent: await extractTextFromFile(file) } as UploadedFile;

        progress.status = 'completed';
        progress.progress = 100;
        onProgress?.(progress);

        onUploaded?.(finalFile);
      }
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
    } finally {
      setBusy(false);
      e.target.value = ""; // reset
    }
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onChange}
        disabled={busy}
        hidden
      />

      {children ? (
        <span
          onClick={(e) => {
            e.preventDefault();
            if (busy) return;
            inputRef.current?.click();
          }}
          role="button"
          aria-disabled={busy}
          style={{ display: "inline-block" }}
        >
          {children}
        </span>
      ) : (
        <button
          type="button"
          disabled={busy}
          className="tiptap-button"
          onClick={(e) => {
            e.preventDefault();
            if (busy) return;
            inputRef.current?.click();
          }}
        >
          {busy ? "Uploading..." : "Attach file"}
        </button>
      )}

      {error && (
        <div role="alert" style={{ color: "#b91c1c", marginTop: 8 }}>
          {error}
        </div>
      )}
    </div>
  );
}
