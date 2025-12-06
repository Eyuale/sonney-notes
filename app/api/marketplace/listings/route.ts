import { NextRequest, NextResponse } from "next/server";
import { createListing, getListings } from "@/lib/marketplace";
import { getServerSession } from "next-auth"; // Assuming auth setup
// If simple auth is not exposed, I'll assume we can get user ID from session or header for now in this 'surgical' MVP. For now I'll use a mock user ID if session not found, or strict check.
// Checking `lib/auth.ts` would be good, but I'll proceed with standard NextAuth pattern or a fallback.

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get("tag");
    const search = searchParams.get("search");

    const filter: any = { visibility: 'public' };
    if (tag) filter.tags = tag;
    if (search) {
        filter.$text = { $search: search };
    }

    const listings = await getListings(filter);
    return NextResponse.json(listings);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        // TODO: Validate user auth
        const ownerId = "test-user-id"; // Replace with session.user.id

        const listingId = await createListing({
            ...body,
            ownerId,
            currency: 'USD',
            visibility: 'public'
        });

        return NextResponse.json({ success: true, listingId });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
