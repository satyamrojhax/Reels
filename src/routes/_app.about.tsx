import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-4xl lowercase text-cocoa dark:text-cream">about us</h1>
      
      <section className="mt-8 space-y-6">
        <div className="paper-card p-6">
          <h2 className="font-display text-xl lowercase text-cocoa dark:text-cream">what is reels?</h2>
          <p className="mt-3 text-sm text-charcoal/70 dark:text-cream/70 leading-relaxed">
            Reels is your ultimate destination for watching premium 18+ video content. 
            We provide a seamless, ad-free experience with a curated collection of high-quality reels 
            from various sources. Our platform is designed to be fast, responsive, and easy to use, 
            giving you access to the best content at your fingertips.
          </p>
        </div>

        <div className="paper-card p-6">
          <h2 className="font-display text-xl lowercase text-cocoa dark:text-cream">features</h2>
          <ul className="mt-3 space-y-2 text-sm text-charcoal/70 dark:text-cream/70">
            <li className="flex items-start gap-2">
              <span className="text-marker">•</span>
              <span>Watch unlimited reels from multiple sources</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-marker">•</span>
              <span>Save your favorite reels for later</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-marker">•</span>
              <span>Earn coins while watching and unlock rewards</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-marker">•</span>
              <span>Auto-scroll for continuous viewing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-marker">•</span>
              <span>Secure PIN protection for your privacy</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-marker">•</span>
              <span>Dark/Light theme support</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-marker">•</span>
              <span>Progressive Web App (PWA) for mobile experience</span>
            </li>
          </ul>
        </div>

        <div className="paper-card p-6">
          <h2 className="font-display text-xl lowercase text-cocoa dark:text-cream">privacy & security</h2>
          <p className="mt-3 text-sm text-charcoal/70 dark:text-cream/70 leading-relaxed">
            Your privacy is our top priority. All your data including liked reels, saved reels, 
            and personal information is stored locally on your device. We don't collect or store 
            any personal data on our servers. Your PIN and preferences are encrypted and stored 
            securely in your browser's local storage.
          </p>
        </div>

        <div className="paper-card p-6">
          <h2 className="font-display text-xl lowercase text-cocoa dark:text-cream">credits</h2>
          <p className="mt-3 text-sm text-charcoal/70 dark:text-cream/70 leading-relaxed">
            This application is designed and developed by <span className="font-semibold text-marker">Satyam RojhaX</span>. 
            Built with modern web technologies including React, TypeScript, and Tailwind CSS to provide 
            the best possible user experience.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-marker to-cocoa flex items-center justify-center text-white font-display text-lg">
              SR
            </div>
            <div>
              <p className="font-display text-lg text-cocoa dark:text-cream">Satyam RojhaX</p>
              <p className="text-xs text-charcoal/60 dark:text-cream/60">Developer & Designer</p>
            </div>
          </div>
        </div>

        <div className="paper-card p-6">
          <h2 className="font-display text-xl lowercase text-cocoa dark:text-cream">contact</h2>
          <p className="mt-3 text-sm text-charcoal/70 dark:text-cream/70 leading-relaxed">
            For any questions, feedback, or support, please reach out to us at:
          </p>
          <a 
            href="mailto:epowerxlabs@gmail.com"
            className="mt-3 inline-block text-sm font-medium text-marker hover:underline"
          >
            epowerxlabs@gmail.com
          </a>
        </div>
      </section>
    </div>
  );
}
