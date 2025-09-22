import { getAuthSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session || !session.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const userId = (session.user as { id?: string }).id || session.user.email || "anonymous";

    const db = await getDb();
    const chats = db.collection("chats");

    // Return a concise list for history: newest first
    const cursor = chats
      .find({ userId }, {
        projection: { messages: 0 }, // omit potentially large messages array in list view
      })
      .sort({ createdAt: -1 })
      .limit(100);

    const items = await cursor.toArray();

    // Normalize _id to string
    const data = items.map((it) => ({
      id: String(it._id),
      type: it.type,
      chat: it.chat || it.content || "",
      lessonId: it.lessonId ? String(it.lessonId) : undefined,
      createdAt: it.createdAt,
    }));

    return new Response(JSON.stringify({ items: data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("/api/chats error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
