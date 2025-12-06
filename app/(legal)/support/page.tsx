import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, FileQuestion } from "lucide-react";

export default function SupportPage() {
    return (
        <div className="container max-w-4xl py-12 md:py-24">
            <div className="text-center mb-16">
                <h1 className="text-3xl font-bold tracking-tight mb-4">How can we help you?</h1>
                <p className="text-lg text-gray-500 dark:text-gray-400">
                    Find answers to common questions or get in touch with our team.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-2xl border border-gray-100 dark:border-gray-800 text-center flex flex-col items-center">
                    <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6">
                        <FileQuestion className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Documentation</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                        Browse our guides and tutorials to get the most out of Sonney Notes.
                    </p>
                    <Link href="/docs/guide" className="mt-auto">
                        <Button variant="outline" className="w-full">View Guides</Button>
                    </Link>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-2xl border border-gray-100 dark:border-gray-800 text-center flex flex-col items-center">
                    <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6">
                        <Mail className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Email Support</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                        Directly reach our support team for specific account issues.
                    </p>
                    <a href="mailto:support@sonneynotes.com" className="mt-auto w-full">
                        <Button variant="outline" className="w-full">Email Us</Button>
                    </a>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-2xl border border-gray-100 dark:border-gray-800 text-center flex flex-col items-center">
                    <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mb-6">
                        <MessageCircle className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Community</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                        Join our transparent community to ask questions and share tips.
                    </p>
                    <Link href="#" className="mt-auto w-full">
                        <Button variant="outline" className="w-full">Join Discord</Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
