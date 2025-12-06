import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "dummy_key");

export async function POST(req: NextRequest) {
    try {
        const { topic, gradeLevel, days } = await req.json();

        // Check if key is mock
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            // Return mock blueprint
            return NextResponse.json({
                title: `${topic} for Grade ${gradeLevel}`,
                content: `
                    <h1>Unit: ${topic}</h1>
                    <p>Grade Level: ${gradeLevel}</p>
                    <p>Duration: ${days} days</p>
                    <h2>Day 1: Introduction</h2>
                    <p>Activities: ...</p>
                `
            });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Create a ${days}-day lesson plan for ${gradeLevel} students about "${topic}". 
        Return ONLY HTML content that can be inserted into a Tiptap editor. 
        Use <h1> for the main title, <h2> for days, <ul> for lists.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ title: topic, content: text });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
