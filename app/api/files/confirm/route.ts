import { NextRequest } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

// POST /api/files/confirm
// Body: { filename, contentType, size, sha256Hex, key }
// Ensures blob record exists (by hash) and links to user's files collection
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session || !session.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const userId = (session.user as { id?: string; email?: string }).id || session.user.email || "anonymous";

    const { filename, contentType, size, sha256Hex, key } = await req.json();
    if (!filename || !contentType || !size || !sha256Hex || !key) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: filename, contentType, size, sha256Hex, key" }),
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
    const files = db.collection("user_files");

    // Upsert blob SSOT record
    await blobs.updateOne(
      { hash: sha256Hex },
      {
        $setOnInsert: {
          hash: sha256Hex,
          objectKey: key,
          size,
          contentType,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Idempotently link to user's files by (userId, hash)
    const existingLink = await files.findOne({ userId, hash: sha256Hex });
    if (existingLink) {
      return new Response(
        JSON.stringify({
          linked: true,
          file: existingLink,
        }),
        { status: 200 }
      );
    }

    const doc = {
      userId,
      filename,
      hash: sha256Hex,
      objectKey: key,
      size,
      contentType,
      createdAt: new Date(),
    };
    const result = await files.insertOne(doc);

    return new Response(JSON.stringify({ linked: true, file: { _id: result.insertedId, ...doc } }), { status: 200 });
  } catch (err: unknown) {
    console.error("/api/files/confirm error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500 }
    );
  }
}
