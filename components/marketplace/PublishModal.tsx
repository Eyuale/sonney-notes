"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/tiptap-ui-primitive/button/button";

export const PublishModal = ({ lessonId }: { lessonId: string }) => {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<'public' | 'private'>('public'); // 'public' | 'private'
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [generatedLink, setGeneratedLink] = useState("");

    const handlePublish = async () => {
        if (mode === 'private') {
            // Private Mode: Just generate link (collaborative)
            const link = `${window.location.origin}/lessons/${lessonId}`; // Original lesson link is collaborative
            setGeneratedLink(link);
            return;
        }

        // Public Mode: Post to marketplace
        setLoading(true);
        await fetch('/api/marketplace/listings', {
            method: 'POST',
            body: JSON.stringify({
                lessonId,
                title,
                description,
                priceCents: 0, // Free for now as per "View Notes"
                tags: []
            })
        });
        setLoading(false);
        setOpen(false);
        alert('Published to Marketplace!');
    };

    const copyLink = () => {
        navigator.clipboard.writeText(generatedLink);
        alert('Link copied!');
        setOpen(false);
        setGeneratedLink("");
    };

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/80">Share / Publish</Button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
                <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl border bg-background p-6 shadow-xl duration-200">
                    <Dialog.Title className="text-xl font-bold mb-1">Share Lesson</Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-500 mb-6">
                        Choose how you want to share this note.
                    </Dialog.Description>

                    <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
                        <button
                            onClick={() => setMode('public')}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'public' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Public (Marketplace)
                        </button>
                        <button
                            onClick={() => setMode('private')}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'private' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Private (Link)
                        </button>
                    </div>

                    {!generatedLink ? (
                        <>
                            {mode === 'public' && (
                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 block">Title</label>
                                        <input
                                            className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="e.g. Introduction to Physics"
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 block">Description</label>
                                        <textarea
                                            className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                                            placeholder="What is this lesson about?"
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 italic">
                                        Note: Viewers will see a read-only version.
                                    </p>
                                </div>
                            )}

                            {mode === 'private' && (
                                <div className="mb-6 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm">
                                    <p>Generating a private link allows anyone with the link to <strong>collaborate</strong> on this document in real-time.</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-2">
                                <Button onClick={handlePublish} disabled={loading} className="w-full bg-gray-900 text-white hover:bg-gray-800">
                                    {loading ? 'Processing...' : (mode === 'public' ? 'Publish to Marketplace' : 'Generate Link')}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-3 bg-gray-50 border rounded-lg break-all text-sm text-gray-600">
                                {generatedLink}
                            </div>
                            <Button onClick={copyLink} className="w-full bg-green-600 text-white hover:bg-green-700">
                                Copy Link
                            </Button>
                        </div>
                    )}

                    <Dialog.Close asChild>
                        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" aria-label="Close">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
