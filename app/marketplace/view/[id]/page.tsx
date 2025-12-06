"use client";

import { useEffect, useState } from 'react';
import { EditorProvider } from '@/components/editor/EditorProvider';
import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor';
import { useParams } from 'next/navigation';
import { Editor } from '@tiptap/react';

// Read-Only view of a lesson
import { StarRating } from '@/components/marketplace/StarRating';

export default function MarketplaceViewPage() {
    const params = useParams();
    const id = Array.isArray(params?.id) ? params?.id[0] : params?.id; // This is lessonId (slug)
    const [editor, setEditor] = useState<Editor | null>(null);
    const [listing, setListing] = useState<any>(null);

    useEffect(() => {
        if (!id) return;
        // Fetch listing details to get title and ID for rating
        // Current API getListings doesn't support get by lessonId directly easily unless we filter.
        // Let's assume we can filter by lessonId? Or just add a new endpoint or helper.
        // Actually, getListings supports filter.
        // But listing stores lessonId as string.
        fetch(`/api/marketplace/listings?search=${id}`).then(res => res.json()).then(data => {
            // This search is fuzzy, might return multiple.
            // Ideally we need getListingByLessonId.
            // For this MVP, let's assume the first result that matches exact lessonId is ours.
            const match = data.find((l: any) => l.lessonId === id);
            if (match) setListing(match);
        });
    }, [id]);

    const handleRate = async (rating: number) => {
        if (!listing) return;
        await fetch('/api/marketplace/rating', {
            method: 'POST',
            body: JSON.stringify({ listingId: listing._id, rating })
        });
        // OPTIONAL: Re-fetch listing to update average
        alert('Thanks for rating!');
    };

    // When we have the editor, create a read-only experience
    // In a robust implementation, we would force editable=false at the config level
    // But setting it after load is a quick way for this surgical plan.
    useEffect(() => {
        if (editor) {
            editor.setEditable(false);
        }
    }, [editor]);

    if (!id) return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="shadow-sm border-b bg-white py-4 px-6 mb-8 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <a href="/marketplace" className="text-sm text-blue-600 hover:underline">&larr; Back</a>
                    <div>
                        <h1 className="text-xl font-bold">{listing?.title || 'Loading...'}</h1>
                        {listing && <StarRating value={listing.averageRating} ratingCount={listing.ratingCount} interactive={true} onChange={handleRate} />}
                    </div>
                </div>
            </div>
            <div className="max-w-4xl mx-auto bg-white shadow-sm border rounded-xl min-h-[500px] p-8">
                <EditorProvider lessonId={id}>
                    {/* We reuse the simple editor, but the useEffect above locks it */}
                    <SimpleEditor onEditorReady={setEditor} />
                </EditorProvider>
            </div>
        </div>
    );
}
