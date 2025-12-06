export default function TermsPage() {
    return (
        <div className="container max-w-3xl py-12 md:py-24">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Service</h1>
                <p className="text-muted-foreground text-sm">Last updated: {new Date().toLocaleDateString()}</p>
            </div>

            <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
                <section>
                    <h2 className="text-xl font-semibold mb-3">1. Agreement to Terms</h2>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and Sonney Notes ("we," "us" or "our"), concerning your access to and use of our application.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">2. Intellectual Property Rights</h2>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        Unless otherwise indicated, the application is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the application (collectively, the "Content") and the trademarks, service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">3. User Representations</h2>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        By using the application, you represent and warrant that:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-600 dark:text-gray-400">
                        <li>All registration information you submit will be true, accurate, current, and complete.</li>
                        <li>You will maintain the accuracy of such information and promptly update such registration information as necessary.</li>
                        <li>You have the legal capacity and you agree to comply with these Terms of Service.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">4. Limitation of Liability</h2>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        In no event will we or our directors, employees, or agents be liable to you or any third party for any direct, indirect, consequential, exemplary, incidental, special, or punitive damages.
                    </p>
                </section>
            </div>
        </div>
    )
}
