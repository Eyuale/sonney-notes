import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: NextRequest) {
    try {
        const { topic, duration, level, additionalContext } = await req.json();

        if (!topic) {
            return NextResponse.json({ error: "Topic is required" }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        const prompt = `
            Act as an expert tutor. Create a detailed study roadmap for the following subject: "${topic}".
            Target Audience Level: ${level || 'Beginner'}.
            Total Duration Goal: ${duration || '1 week'}.
            Context/Notes: ${additionalContext || 'None'}.

            Return strictly a JSON object with the following structure:
            {
                "title": "Study Roadmap for ${topic}",
                "topics": [
                    {
                        "name": "Major Concept Name",
                        "sessions": [
                            {
                                "title": "Sub-topic/Session Title",
                                "estimatedTime": "approx time (e.g. 1h)",
                                "resources": ["Topic keyword 1", "Topic keyword 2"] 
                            }
                        ]
                    }
                ]
            }
            Do not include markdown filtering like \`\`\`json. Just the raw JSON.
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Clean up markdown if Gemini adds it despite instructions
        const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        const roadmap = JSON.parse(cleanedText);

        return NextResponse.json(roadmap);
    } catch (e: any) {
        console.error("AI Generation Error", e);
        return NextResponse.json({ error: e.message || "Failed to generate plan" }, { status: 500 });
    }
}
