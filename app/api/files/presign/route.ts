import { NextRequest } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { presignPutUrl, S3_ENV } from "@/lib/s3";

// POST /api/files/presign
// Body: { filename, contentType, size, sha256Hex }
// Returns presigned PUT URL. If content exists (by hash) we skip upload.
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session || !session.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { filename, contentType, size, sha256Hex } = await req.json();
    if (!filename || !contentType || !size || !sha256Hex) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: filename, contentType, size, sha256Hex" }),
        { status: 400 }
      );
    }

    // Server-side validation
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (size > maxSize) {
      return new Response(
        JSON.stringify({ error: "File too large. Maximum size is 50MB." }),
        { status: 400 }
      );
    }

    const allowedTypes = [
      "image/", "text/", "application/", "audio/", "video/"
    ];
    const isAllowed = allowedTypes.some(type => contentType.startsWith(type));
    if (!isAllowed) {
      return new Response(
        JSON.stringify({ error: "File type not supported" }),
        { status: 400 }
      );
    }

    if (sha256Hex.length !== 64) {
      return new Response(
        JSON.stringify({ error: "Invalid SHA-256 hash" }),
        { status: 400 }
      );
    }

    const db = await getDb();
    const blobs = db.collection("file_blobs");

    const existing = await blobs.findOne<{ hash: string; objectKey: string; size: number; contentType: string }>({
      hash: sha256Hex,
    });

    if (existing) {
      return new Response(
        JSON.stringify({
          alreadyExists: true,
          key: existing.objectKey,
          bucket: S3_ENV.BUCKET,
          region: S3_ENV.REGION,
        }),
        { status: 200 }
      );
    }

    // SSOT key by content hash
    const safeHash = String(sha256Hex).toLowerCase();
    const objectKey = `ssot/${safeHash}`;

    const uploadUrl = await presignPutUrl({ key: objectKey, contentType });

    return new Response(
      JSON.stringify({ alreadyExists: false, uploadUrl, key: objectKey, bucket: S3_ENV.BUCKET, region: S3_ENV.REGION }),
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("/api/files/presign error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500 }
    );
  }
}
