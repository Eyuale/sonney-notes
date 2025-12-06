"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

export const CreatePlanModal = ({ onCreated, buttonLabel = "New Plan" }: { onCreated: () => void, buttonLabel?: string }) => {
    const [open, setOpen] = useState(false);
    const [topic, setTopic] = useState("");
    const [duration, setDuration] = useState("1 week");
    const [level, setLevel] = useState("Beginner");
    const [useContext, setUseContext] = useState(false);
    const [loading, setLoading] = useState(false);
    const [generatedPlan, setGeneratedPlan] = useState<any>(null);

    const handleGenerate = async () => {
        setLoading(true);
        const res = await fetch('/api/ai/study-plan', {
            method: 'POST',
            body: JSON.stringify({ topic, duration, level, useContext })
        });
        const data = await res.json();
        if (data.error) {
            alert(data.error);
        } else {
            setGeneratedPlan(data);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!generatedPlan) return;
        setLoading(true);
        const res = await fetch('/api/study-plans', {
            method: 'POST',
            body: JSON.stringify({
                title: generatedPlan.title,
                topics: generatedPlan.topics,
                visibility: 'private' // Default to private
            })
        });
        const data = await res.json();
        if (data.success) {
            setOpen(false);
            onCreated();
            // Reset
            setGeneratedPlan(null);
            setTopic("");
        } else {
            alert('Failed to save plan');
        }
        setLoading(false);
    };

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
                    {buttonLabel}
                </button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
                <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl border bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                    {!generatedPlan ? (
                        <>
                            <Dialog.Title className="text-xl font-bold mb-4">Create AI Study Plan</Dialog.Title>
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">What do you want to learn?</label>
                                    <input
                                        className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="e.g. Quantum Physics, Spanish Basics, React Flow"
                                        value={topic}
                                        onChange={e => setTopic(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Duration</label>
                                        <select
                                            className="w-full border px-3 py-2 rounded-lg"
                                            value={duration}
                                            onChange={e => setDuration(e.target.value)}
                                        >
                                            <option>1 day</option>
                                            <option>3 days</option>
                                            <option>1 week</option>
                                            <option>2 weeks</option>
                                            <option>1 month</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Level</label>
                                        <select
                                            className="w-full border px-3 py-2 rounded-lg"
                                            value={level}
                                            onChange={e => setLevel(e.target.value)}
                                        >
                                            <option>Beginner</option>
                                            <option>Intermediate</option>
                                            <option>Advanced</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mb-4">
                                    <input
                                        type="checkbox"
                                        id="useContext"
                                        checked={useContext}
                                        onChange={(e) => setUseContext(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor="useContext" className="text-sm text-gray-700 font-medium cursor-pointer">
                                        Include context from my notes
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={handleGenerate}
                                    disabled={loading || !topic}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50"
                                >
                                    {loading ? 'Generating Roadmap...' : 'Generate with AI ✨'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Dialog.Title className="text-xl font-bold mb-2">My Roadmap</Dialog.Title>
                            <div className="bg-gray-50 border rounded-lg p-4 mb-6 max-h-[60vh] overflow-y-auto">
                                <h3 className="font-bold text-lg mb-4">{generatedPlan.title}</h3>
                                {(generatedPlan.topics || []).map((t: any, i: number) => (
                                    <div key={i} className="mb-4">
                                        <h4 className="font-semibold text-blue-800 border-b border-blue-100 pb-1 mb-2">{t.name}</h4>
                                        <ul className="space-y-2">
                                            {t.sessions.map((s: any, j: number) => (
                                                <li key={j} className="text-sm bg-white p-2 rounded border border-gray-100 shadow-sm">
                                                    <div className="flex justify-between font-medium">
                                                        <span>{s.title}</span>
                                                        <span className="text-gray-500 text-xs bg-gray-100 px-1 py-0.5 rounded">{s.estimatedTime}</span>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setGeneratedPlan(null)}
                                    className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                                >
                                    {loading ? 'Saving...' : 'Save Plan'}
                                </button>
                            </div>
                        </>
                    )}
                    <Dialog.Close asChild>
                        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" aria-label="Close">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
