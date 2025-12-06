"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/tiptap-ui-primitive/button/button";
import { TiptapDoc } from "@/lib/lesson-mapper";

interface GenerateLessonModalProps {
    onInsert: (content: string) => void;
}

export const GenerateLessonModal = ({ onInsert }: GenerateLessonModalProps) => {
    const [open, setOpen] = useState(false);
    const [topic, setTopic] = useState("");
    const [grade, setGrade] = useState("9");
    const [days, setDays] = useState("5");
    const [loading, setLoading] = useState(false);

    const generate = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/ai/generate-lesson-plan', {
                method: 'POST',
                body: JSON.stringify({ topic, gradeLevel: grade, days })
            });
            const data = await res.json();
            if (data.content) {
                // We received HTML content, insert it directly
                // Ideally we mock parsing it to Tiptap JSON or just insertHTML
                onInsert(data.content);
                setOpen(false);
            }
        } catch (e) {
            console.error(e);
            alert("Generation failed");
        }
        setLoading(false);
    };

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                <Button className="ml-2 bg-blue-600 text-white hover:bg-blue-700">AI Generate</Button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-background p-6 shadow-lg duration-200">
                    <Dialog.Title className="text-xl font-bold mb-4">Generate Lesson Plan</Dialog.Title>
                    <input
                        className="border p-2 mb-2 w-full rounded"
                        placeholder="Topic (e.g. Photosynthesis)"
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                    />
                    <div className="flex gap-2 mb-4">
                        <select className="border p-2 rounded flex-1" value={grade} onChange={e => setGrade(e.target.value)}>
                            <option value="K">K</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                            <option value="6">6</option>
                            <option value="7">7</option>
                            <option value="8">8</option>
                            <option value="9">9</option>
                            <option value="10">10</option>
                            <option value="11">11</option>
                            <option value="12">12</option>
                        </select>
                        <select className="border p-2 rounded flex-1" value={days} onChange={e => setDays(e.target.value)}>
                            <option value="1">1 Day</option>
                            <option value="3">3 Days</option>
                            <option value="5">5 Days</option>
                            <option value="10">2 Weeks</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button onClick={generate} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            {loading ? 'Generating...' : 'Create Plan'}
                        </Button>
                    </div>
                    <Dialog.Close asChild>
                        <button className="absolute top-2 right-2 px-2" aria-label="Close">x</button>
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
