import { Calendar, CheckCircle2, Layout, BookOpen } from "lucide-react";

const features = [
    {
        icon: <Layout className="h-6 w-6 text-blue-500" />,
        title: "AI-Powered Roadmaps",
        description: "Generate comprehensive study plans instantly based on your goals and schedule."
    },
    {
        icon: <Calendar className="h-6 w-6 text-purple-500" />,
        title: "Smart Scheduling",
        description: "Syncs with your calendar to find the perfect study times without burnout."
    },
    {
        icon: <CheckCircle2 className="h-6 w-6 text-green-500" />,
        title: "Progress Tracking",
        description: "Visualize your journey with intuitive charts and milestone celebrations."
    },
    {
        icon: <BookOpen className="h-6 w-6 text-indigo-500" />,
        title: "Resource Central",
        description: "Keep all your notes, PDFs, and links organized in one searchable brain."
    }
];

export function Features() {
    return (
        <section className="py-24 bg-muted/30">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="group p-6 bg-card rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-border"
                        >
                            <div className="mb-4 inline-block p-3 rounded-xl bg-muted group-hover:scale-110 transition-transform duration-300">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-foreground">
                                {feature.title}
                            </h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
