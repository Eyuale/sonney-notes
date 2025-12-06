import { getDb } from "@/lib/mongodb";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
    const db = await getDb();
    // Fetch public notes
    const notes = await db.collection("marketplace_notes")
        .find({ isPublic: true })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="container mx-auto p-6 space-y-8">
                <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
                        <p className="text-muted-foreground mt-1">Discover and share lesson notes.</p>
                    </div>
                    {/* Future: Add Search/Filter controls here */}
                </header>

                {notes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center border rounded-lg bg-card/50">
                        <h2 className="text-xl font-semibold">No notes found</h2>
                        <p className="text-muted-foreground mt-2">Be the first to publish a note!</p>
                        <Link
                            href="/"
                            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium"
                        >
                            Get Started
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {notes.map((note) => (
                            <Link
                                key={note._id.toString()}
                                href={`/marketplace/${note._id.toString()}`}
                                className="group block h-full"
                            >
                                <div className="h-full flex flex-col border rounded-lg overflow-hidden bg-card transition-all hover:shadow-md hover:border-primary/50">
                                    <div className="p-6 flex-1 flex flex-col gap-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                                                {note.title}
                                            </h3>
                                        </div>

                                        <p className="text-sm text-muted-foreground line-clamp-3 mb-2 flex-1">
                                            {note.description || "No description provided."}
                                        </p>

                                        <div className="flex flex-wrap gap-2 mt-auto">
                                            {(note.tags || []).slice(0, 3).map((tag: string, i: number) => (
                                                <span key={i} className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-full">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-muted/30 border-t flex items-center justify-between text-xs text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            {note.author?.name || "Anonymous"}
                                        </div>
                                        <span>
                                            {(note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt)).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
