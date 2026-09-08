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
            For any questions, feedback, or support, please reach out directly on Telegram:
          </p>
          <a 
            href="https://t.me/satyamrojha"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0088cc] px-6 py-2.5 text-sm font-medium text-white shadow-md shadow-[#0088cc]/20 transition hover:bg-[#0077b5] active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.08-.19-.09-.05-.21-.02-.3.01-.13.04-2.26 1.45-6.38 4.23-.6.41-1.14.61-1.63.6-.53-.01-1.54-.3-2.29-.54-.92-.3-1.64-.46-1.59-.97.03-.26.41-.53 1.15-.81 4.53-1.97 7.55-3.27 9.05-3.89 4.3-1.78 5.2 2.08 5.16 2.09z"/>
            </svg>
            Contact Admin
          </a>
        </div>
      </section>
    </div>
  );
}
