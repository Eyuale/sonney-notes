"use client";

import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Cross2Icon } from "@radix-ui/react-icons";
import { Editor } from "@tiptap/core";

// Basic Button style if the primitive isn't easily reusable for this context
const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>((props, ref) => (
    <button
        ref={ref}
        {...props}
        className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 ${props.className}`}
    />
));
Button.displayName = "Button";

interface PublishModalProps {
    editor: Editor | null;
    trigger?: React.ReactNode;
}

export function PublishModal({ editor, trigger }: PublishModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [tags, setTags] = useState("");
    const [isPublic, setIsPublic] = useState(true);

    const handlePublish = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editor) return;
        setLoading(true);

        const content = editor.getJSON();

        try {
            const tagList = tags.split(",").map((t) => t.trim()).filter((t) => !!t);

            const res = await fetch("/api/marketplace", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    description,
                    content,
                    tags: tagList,
                    isPublic,
                }),
            });

            if (!res.ok) throw new Error("Failed to publish");

            const data = await res.json();
            alert(`Success: ${data.message}`);
            setOpen(false);
        } catch (err) {
            console.error(err);
            alert("Error publishing note");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                {trigger || <Button>Publish</Button>}
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg md:w-full text-foreground">
                    <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                        <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
                            Publish Note
                        </Dialog.Title>
                        <Dialog.Description className="text-sm text-muted-foreground">
                            Share your note with the community or create a private link.
                        </Dialog.Description>
                    </div>

                    <form onSubmit={handlePublish} className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label htmlFor="title" className="text-sm font-medium">Title</label>
                            <input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="desc" className="text-sm font-medium">Description</label>
                            <textarea
                                id="desc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="tags" className="text-sm font-medium">Tags (comma separated)</label>
                            <input
                                id="tags"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                placeholder="math, physics, notes"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="public"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor="public" className="text-sm font-medium">
                                Make Public (Visible in Marketplace)
                            </label>
                        </div>

                        <div className="flex justify-end space-x-2">
                            <Dialog.Close asChild>
                                <Button type="button" className="bg-secondary text-secondary-foreground hover:bg-secondary/80">Cancel</Button>
                            </Dialog.Close>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Publishing..." : "Publish"}
                            </Button>
                        </div>
                    </form>

                    <Dialog.Close asChild>
                        <button
                            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                        >
                            <Cross2Icon className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </button>
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
