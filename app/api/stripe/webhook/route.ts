import { NextRequest, NextResponse } from "next/server";
import { completePurchase } from "@/lib/marketplace";

export async function POST(req: NextRequest) {
    // In real life, verify signature
    const body = await req.json();

    if (body.type === 'checkout.session.completed') {
        const sessionId = body.data.object.id;
        await completePurchase(sessionId);
        return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
}
