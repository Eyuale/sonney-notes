import { getAuthSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import type { LessonBlueprint } from "@/lib/lesson-mapper";

type LessonDbDoc = {
  _id: ObjectId
  userId: string
  blueprint: LessonBlueprint
  createdAt?: Date
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session || !session.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const userId = (session.user as { id?: string }).id || session.user.email || "anonymous";

    const { id } = params;
    if (!id || !ObjectId.isValid(id)) {
      return new Response(JSON.stringify({ error: "Invalid id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const db = await getDb();
    const lessons = db.collection<LessonDbDoc>("lessons");
    const filter: { _id: ObjectId; userId: string } = { _id: new ObjectId(id), userId };
    const doc = await lessons.findOne(filter);
    if (!doc) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ id: String(doc._id), blueprint: doc.blueprint, createdAt: doc.createdAt }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("/api/lessons/[id] error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
