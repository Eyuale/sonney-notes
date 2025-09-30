import { getAuthSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

type ChatDbDoc = {
  _id: ObjectId
  userId: string
  type: "blueprint" | "text"
  chat?: string
  content?: string
  lessonId?: ObjectId
  createdAt?: Date
  messages?: Array<{ role: "user" | "assistant"; content: string; id?: string }>
  attachments?: any[]
}

export async function PATCH(req: Request, context: any) {
  try {
    const session = await getAuthSession();
    if (!session || !session.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const userId = (session.user as { id?: string }).id || session.user.email || "anonymous";

  const { id } = context.params as { id: string };
    if (!id || !ObjectId.isValid(id)) {
      return new Response(JSON.stringify({ error: "Invalid id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as { chat?: string };
    if (typeof body.chat !== "string" || !body.chat.trim()) {
      return new Response(JSON.stringify({ error: "chat must be a non-empty string" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const db = await getDb();
    const chats = db.collection<ChatDbDoc>("chats");
    const filter: { _id: ObjectId; userId: string } = { _id: new ObjectId(id), userId };
    await chats.updateOne(filter, { $set: { chat: body.chat } });
    const doc = await chats.findOne(filter);
    if (!doc) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ id: String(doc._id), chat: doc.chat || "", type: doc.type }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("/api/chats/[id] PATCH error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(_req: Request, context: any) {
  try {
    const session = await getAuthSession();
    if (!session || !session.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const userId = (session.user as { id?: string }).id || session.user.email || "anonymous";

  const { id } = context.params as { id: string };
    if (!id || !ObjectId.isValid(id)) {
      return new Response(JSON.stringify({ error: "Invalid id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const db = await getDb();
    const chats = db.collection<ChatDbDoc>("chats");
    const filter: { _id: ObjectId; userId: string } = { _id: new ObjectId(id), userId };
    const delRes = await chats.deleteOne(filter);
    if (delRes.deletedCount === 0) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(null, { status: 204 });
  } catch (err: unknown) {
    console.error("/api/chats/[id] DELETE error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function GET(_req: Request, context: any) {
  try {
    const session = await getAuthSession();
    if (!session || !session.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const userId = (session.user as { id?: string }).id || session.user.email || "anonymous";

  const { id } = context.params as { id: string };
    if (!id || !ObjectId.isValid(id)) {
      return new Response(JSON.stringify({ error: "Invalid id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const db = await getDb();
    const chats = db.collection<ChatDbDoc>("chats");
    const filter: { _id: ObjectId; userId: string } = { _id: new ObjectId(id), userId };
    const doc = await chats.findOne(filter);
    if (!doc) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = {
      id: String(doc._id),
      type: doc.type,
      chat: doc.chat || doc.content || "",
      lessonId: doc.lessonId ? String(doc.lessonId) : undefined,
      createdAt: doc.createdAt,
      messages: doc.messages || [],
      attachments: doc.attachments || [],
    };

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("/api/chats/[id] error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
