import { NextRequest, NextResponse } from "next/server";
import { createPurchase } from "@/lib/marketplace";

export async function POST(req: NextRequest) {
    try {
        const { listingId, lessonId, amountCents } = await req.json();
        const buyerId = "test-buyer-id"; // From session

        // Mock Stripe Session Creation
        const mockStripeSessionId = `sess_${Math.random().toString(36).substring(7)}`;

        await createPurchase({
            buyerId,
            listingId,
            lessonId,
            amountCents,
            currency: 'USD',
            stripeSessionId: mockStripeSessionId,
            status: 'pending'
        });

        // Return the URL to "redirect" to (in real life, Stripe URL)
        // Here we just return the session ID and a fake URL that the frontend can simulate "success" with

        return NextResponse.json({
            url: `/marketplace/mock-checkout?session_id=${mockStripeSessionId}`,
            sessionId: mockStripeSessionId
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
