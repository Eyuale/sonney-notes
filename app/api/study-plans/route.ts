import { NextRequest, NextResponse } from "next/server";
import { createStudyPlan, getStudyPlans } from "@/lib/study-planner";
// import { nanoid } from 'nanoid'; // Use native crypto

// GET: List all plans (or filter by user)
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const visibility = searchParams.get('visibility'); // 'public' or undefined

    const filter: any = {};
    if (userId) filter.userId = userId;
    if (visibility) filter.visibility = visibility;

    const plans = await getStudyPlans(filter);
    return NextResponse.json(plans);
}

// POST: Create a new plan (e.g. saving an AI generated one)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        // Mock user
        const userId = "test-user-id";

        // const planId = nanoid(10); 
        const planId = crypto.randomUUID(); // Native UUID

        const newId = await createStudyPlan({
            ...body,
            userId,
            planId,
            visibility: body.visibility || 'private'
        });

        return NextResponse.json({ success: true, id: newId, planId });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
