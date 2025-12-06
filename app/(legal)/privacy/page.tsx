export default function PrivacyPage() {
    return (
        <div className="container max-w-3xl py-12 md:py-24">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
                <p className="text-muted-foreground text-sm">Last updated: {new Date().toLocaleDateString()}</p>
            </div>

            <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
                <section>
                    <h2 className="text-xl font-semibold mb-3">1. Overview</h2>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        Sonney Notes ("we", "our", or "us") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our application.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">2. Data Collection</h2>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        We collect information that you voluntarily provide to us when you register on the application, express an interest in obtaining information about us or our products and services, when you participate in activities on the application, or otherwise when you contact us.
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-600 dark:text-gray-400">
                        <li>Personal Data (Name, Email address) from Google Sign-In.</li>
                        <li>Study data and generated content within the application.</li>
                        <li>Usage data for improving service performance.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">3. Use of Your Information</h2>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        We use the information we collect or receive:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-600 dark:text-gray-400">
                        <li>To facilitate account creation and logon process.</li>
                        <li>To generate personalized study plans and content.</li>
                        <li>To send you administrative information.</li>
                        <li>To protect our services from fraud and abuse.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">4. Contact Us</h2>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        If you have questions or comments about this policy, you may email us at support@sonneynotes.com.
                    </p>
                </section>
            </div>
        </div>
    )
}
