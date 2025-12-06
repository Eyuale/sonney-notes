export function PreviewSection() {
    return (
        <section className="py-24 overflow-hidden">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4">
                        Designed for Focus
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-[600px] mx-auto text-lg">
                        A clean, distraction-free environment built to help you retain more and stress less.
                    </p>
                </div>

                <div className="relative mx-auto max-w-5xl">
                    <div className="rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4 shadow-2xl backdrop-blur-3xl">
                        {/* Placeholder for actual app screenshot - using a stylized mock container for now */}
                        <div className="aspect-[16/9] rounded-lg bg-background shadow-inner flex items-center justify-center border border-border overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted" />

                            {/* Mock UI Elements */}
                            <div className="absolute top-4 left-4 right-4 bottom-4 grid grid-cols-12 gap-4">
                                {/* Sidebar Mock */}
                                <div className="col-span-3 bg-card rounded-lg shadow-sm p-4 hidden md:flex flex-col gap-3 border border-border opacity-80">
                                    <div className="h-8 w-8 rounded-full bg-primary/20 mb-4" />
                                    <div className="h-2 w-24 bg-muted rounded" />
                                    <div className="h-2 w-16 bg-muted rounded" />
                                    <div className="h-2 w-20 bg-muted rounded" />
                                    <div className="mt-auto h-2 w-full bg-muted rounded" />
                                </div>

                                {/* Main Content Mock */}
                                <div className="col-span-12 md:col-span-9 bg-card rounded-lg shadow-sm p-6 border border-border flex flex-col gap-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="h-6 w-48 bg-muted rounded" />
                                        <div className="flex gap-2">
                                            <div className="h-8 w-20 bg-primary/20 rounded-md" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div className="h-24 bg-muted/50 rounded-lg border border-dashed border-border" />
                                        <div className="h-24 bg-muted/50 rounded-lg border border-dashed border-border" />
                                        <div className="h-24 bg-muted/50 rounded-lg border border-dashed border-border" />
                                    </div>

                                    <div className="h-px w-full bg-border my-2" />

                                    <div className="space-y-3">
                                        <div className="h-2 w-full bg-muted rounded" />
                                        <div className="h-2 w-[90%] bg-muted rounded" />
                                        <div className="h-2 w-[95%] bg-muted rounded" />
                                    </div>
                                </div>
                            </div>

                            <div className="z-10 text-center">
                                <p className="text-muted-foreground font-medium text-sm">Dashboard Preview</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
