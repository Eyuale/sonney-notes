import { NextRequest } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { presignGetUrl } from "@/lib/s3";

// GET /api/files/get-url?key=<s3Key>
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session || !session.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing key" }), { status: 400 });
    }

    const url = await presignGetUrl({ key });
    return new Response(JSON.stringify({ url }), { status: 200 });
  } catch (err: unknown) {
    console.error("/api/files/get-url error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500 }
    );
  }
}
