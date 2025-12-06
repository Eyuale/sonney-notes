"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreatePlanModal } from "@/components/study-planner/CreatePlanModal";

export default function StudyPlannerPage() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/study-plans?userId=test-user-id');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setPlans(data);
        } catch (e) {
            console.error(e);
            // setPlans([]); // Keep empty if failed
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Study Plans</h1>
                    <p className="text-gray-500">Manage your learning roadmaps.</p>
                </div>
                <CreatePlanModal onCreated={fetchPlans} />
            </div>

            {loading ? (
                <div className="text-center py-12">Loading plans...</div>
            ) : plans.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-xl bg-gray-50">
                    <p className="text-xl text-gray-600 mb-4">You haven't created any study plans yet.</p>
                    <CreatePlanModal onCreated={fetchPlans} buttonLabel="Create Your First Plan" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map((plan: any) => (
                        <Link
                            key={plan._id}
                            href={`/study-planner/${plan.planId}`}
                            className="block group relative bg-white border rounded-xl p-6 hover:shadow-lg transition-all"
                        >
                            <div className="absolute top-4 right-4">
                                {plan.visibility === 'public' && <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">Public</span>}
                                {plan.visibility === 'private' && <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full font-medium">Private</span>}
                            </div>
                            <h3 className="font-bold text-xl mb-2 group-hover:text-blue-600 transition-colors">{plan.title}</h3>
                            <p className="text-sm text-gray-500 mb-4">{plan.topics?.length || 0} Topics &bull; Updated {new Date(plan.updatedAt).toLocaleDateString()}</p>

                            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                                {/* Mock progress calculation */}
                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                            </div>
                            <span className="text-xs text-gray-400">0% Complete</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
