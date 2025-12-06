import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "@radix-ui/react-icons";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function NotePage({ params }: PageProps) {
    const { id } = await params;

    try {
        const db = await getDb();
        const note = await db.collection("marketplace_notes").findOne({ _id: new ObjectId(id) });

        if (!note) return notFound();

        return (
            <div className="min-h-screen bg-background text-foreground pb-20">
                <div className="container mx-auto p-6 max-w-4xl space-y-6">
                    <div className="flex items-center gap-4">
                        <Link href="/marketplace" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <ArrowLeftIcon className="mr-1 w-4 h-4" /> Back to Marketplace
                        </Link>
                    </div>

                    <header className="space-y-4 border-b pb-6">
                        <h1 className="text-4xl font-extrabold tracking-tight">{note.title}</h1>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2 font-medium">
                                <span>By {note.author?.name || "Anonymous"}</span>
                            </div>
                            <span>•</span>
                            <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                        </div>
                        {note.description && (
                            <p className="text-lg text-muted-foreground leading-relaxed">{note.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                            {note.tags?.map((tag: string, i: number) => (
                                <span key={i} className="px-2.5 py-0.5 bg-secondary text-secondary-foreground rounded-full text-xs font-semibold">#{tag}</span>
                            ))}
                        </div>
                    </header>

                    <div className="rounded-lg border bg-card shadow-sm p-8 min-h-[500px]">
                        <SimpleEditor readOnly initialContent={note.content} />
                    </div>
                </div>
            </div>
        );
    } catch (err) {
        console.error(err);
        return notFound();
    }
}
