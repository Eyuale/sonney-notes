"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function MockCheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const sessionId = searchParams?.get('session_id');
    const [status, setStatus] = useState('Processing payment...');

    useEffect(() => {
        if (sessionId) {
            // Simulator: Immediately trigger the webhook
            fetch('/api/stripe/webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'checkout.session.completed',
                    data: { object: { id: sessionId } }
                })
            }).then(() => {
                setStatus('Payment Successful! Redirecting...');
                setTimeout(() => router.push('/marketplace'), 2000);
            });
        }
    }, [sessionId, router]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <h1 className="text-2xl font-bold">{status}</h1>
        </div>
    );
}

export default function MockCheckoutPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
            <MockCheckoutContent />
        </Suspense>
    );
}
