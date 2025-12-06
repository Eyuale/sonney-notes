import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function Hero() {
    return (
        <section className="relative overflow-hidden bg-background pt-16 md:pt-20 lg:pt-32 pb-16">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="flex flex-col items-center space-y-4 text-center">
                    <div className="space-y-2 max-w-3xl">
                        <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/80 to-foreground animate-fade-in-up">
                            Your Personalized Study Roadmap, Instantly
                        </h1>
                        <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl mt-6 animate-fade-in-up delay-100">
                            Plan, schedule and track your learning — all in one place. Stop guessing and start mastering with AI-powered study plans.
                        </p>
                    </div>
                    <div className="space-x-4 pt-8 animate-fade-in-up delay-200">
                        <Link href="/dashboard">
                            <Button size="lg" className="h-12 px-8 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                                Start Planning <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Abstract Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute -top-[30%] -left-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-primary/10 to-purple-500/10 blur-[100px]" />
                <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-gradient-to-bl from-indigo-500/10 to-teal-500/10 blur-[100px]" />
            </div>
        </section>
    );
}
