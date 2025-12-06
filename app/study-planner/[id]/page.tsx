"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { StarRating } from "@/components/marketplace/StarRating";

export default function StudyPlanDetailPage() {
    const params = useParams();
    const id = Array.isArray(params?.id) ? params?.id[0] : params?.id;
    const [plan, setPlan] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        fetch(`/api/study-plans/${id}`).then(res => res.json()).then(data => {
            setPlan(data);
            setLoading(false);
        });
    }, [id]);

    const toggleSession = (topicIndex: number, sessionIndex: number) => {
        // Toggle optimistic UI + API call
        // For MVP, just updating local state to show interactivity
        if (!plan) return;
        const newPlan = { ...plan };
        const session = newPlan.topics[topicIndex].sessions[sessionIndex];
        session.status = session.status === 'completed' ? 'pending' : 'completed';
        setPlan(newPlan);

        // TODO: Sync with backend
        // fetch(`/api/study-plans/${id}`, { method: 'PATCH', ... })
    };

    if (loading) return <div className="p-8 text-center">Loading plan...</div>;
    if (!plan) return <div className="p-8 text-center text-red-500">Plan not found</div>;

    const isOwner = plan.userId === 'test-user-id';

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <div className="mb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold text-gray-900">{plan.title}</h1>
                            {plan.visibility === 'public' && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Public</span>}
                        </div>
                        <p className="text-gray-500">Created {new Date(plan.createdAt).toLocaleDateString()}</p>
                    </div>
                    {/* Actions */}
                    <div className="flex gap-2">
                        {isOwner && (
                            <button className="bg-white border text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium">
                                Share / Publish
                            </button>
                        )}
                        <button className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-100 text-sm font-medium">
                            Sync to Calendar
                        </button>
                    </div>
                </div>

                {plan.visibility === 'public' && (
                    <div className="mt-4">
                        <StarRating value={plan.averageRating} ratingCount={plan.ratingCount} />
                    </div>
                )}
            </div>

            <div className="space-y-6">
                {plan.topics.map((topic: any, i: number) => (
                    <div key={i} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-gray-50 px-6 py-4 border-b">
                            <h2 className="font-semibold text-lg text-gray-800">{topic.name}</h2>
                        </div>
                        <div className="divide-y">
                            {topic.sessions.map((session: any, j: number) => (
                                <div key={j} className={`px-6 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors ${session.status === 'completed' ? 'bg-green-50/50' : ''}`}>
                                    <div className="pt-1">
                                        <input
                                            type="checkbox"
                                            checked={session.status === 'completed'}
                                            onChange={() => toggleSession(i, j)}
                                            disabled={!isOwner}
                                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1">
                                            <h3 className={`font-medium ${session.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{session.title}</h3>
                                            <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full h-fit">{session.estimatedTime}</span>
                                        </div>
                                        {session.resources && session.resources.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {session.resources.map((res: string, k: number) => (
                                                    <span key={k} className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                                        {res}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
