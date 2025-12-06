import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET /api/marketplace
// Fetch public notes with optional filtering
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const filter = searchParams.get("filter") || "recent"; // recent, rated
        const search = searchParams.get("search") || "";
        const tag = searchParams.get("tag") || "";

        const db = await getDb();
        const notesColl = db.collection("marketplace_notes");

        let query: any = { isPublic: true };

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { "author.name": { $regex: search, $options: "i" } },
            ];
        }

        if (tag) {
            query.tags = tag;
        }

        let sort: any = { createdAt: -1 };
        if (filter === "rated") {
            sort = { "rating.average": -1, "rating.count": -1 };
        }

        const notes = await notesColl.find(query).sort(sort).limit(50).toArray();

        return NextResponse.json({ notes });
    } catch (error) {
        console.error("Marketplace fetch error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/marketplace
// Publish a new note
export async function POST(req: NextRequest) {
    try {
        const session = await getAuthSession();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { title, description, content, tags, isPublic } = body;

        if (!title || !content) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const db = await getDb();
        const notesColl = db.collection("marketplace_notes");

        const newNote = {
            title,
            description,
            content,
            tags: tags || [],
            isPublic: !!isPublic,
            author: {
                name: session.user.name || "Anonymous",
                email: session.user.email,
                image: session.user.image,
            },
            rating: {
                average: 0,
                count: 0,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await notesColl.insertOne(newNote);

        return NextResponse.json({
            success: true,
            noteId: result.insertedId,
            message: isPublic ? "Note published to marketplace" : "Private note created"
        });
    } catch (error) {
        console.error("Marketplace publish error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
