import Link from "next/link";

export function Footer() {
    return (
        <footer className="border-t border-border bg-background">
            <div className="container px-4 md:px-6 mx-auto py-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-lg tracking-tight">Sonney Notes</span>
                        <span className="text-xs text-muted-foreground border border-border px-2 py-0.5 rounded-full">v0.1.0</span>
                    </div>

                    <nav className="flex gap-6 text-sm text-muted-foreground">
                        <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                        <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
                        <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
                    </nav>

                    <div className="text-xs text-muted-foreground">
                        © {new Date().getFullYear()} Sonney Notes. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    );
}
