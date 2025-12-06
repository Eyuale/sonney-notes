import { NextRequest, NextResponse } from "next/server";
import { getStudyPlanById, updateStudyPlan, deleteStudyPlan } from "@/lib/study-planner";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const plan = await getStudyPlanById(params.id);
    if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(plan);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    // TODO: Verify ownership
    const body = await req.json();
    await updateStudyPlan(params.id, body);
    return NextResponse.json({ success: true });
}
