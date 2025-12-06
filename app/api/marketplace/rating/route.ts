import { NextRequest, NextResponse } from "next/server";
import { rateListing } from "@/lib/marketplace";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { listingId, rating } = body;

        // Mock user ID for now
        const userId = "test-user-id";

        if (!listingId || !rating) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const result = await rateListing(userId, listingId, rating);
        return NextResponse.json(result);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
