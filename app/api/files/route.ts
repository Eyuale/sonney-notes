// no request arg needed
import { getAuthSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

// GET /api/files -> list current user's files
export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session || !session.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const userId = (session.user as { id?: string; email?: string }).id || session.user.email || "anonymous";

    const db = await getDb();
    const files = db.collection("user_files");
    const list = await files
      .find({ userId })
      .project({ userId: 0 })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return new Response(JSON.stringify({ files: list }), { status: 200 });
  } catch (err: unknown) {
    console.error("GET /api/files error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500 }
    );
  }
}
