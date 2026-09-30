import { createFileRoute } from "@tanstack/react-router";
import { Heart, Shield, Zap, Smartphone, Moon, Award, Play, Bookmark, Coins, Gauge } from "lucide-react";

export const Route = createFileRoute("/_app/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* App Header */}
      <div className="flex items-center gap-4 mb-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl ig-gradient-bg shadow-lg">
          <Play className="h-7 w-7 fill-white text-white" />
        </div>
        <div>
          <h1 className="font-display text-4xl lowercase text-cocoa dark:text-cream">
            InstantReels
          </h1>
          <p className="text-sm text-charcoal/60 dark:text-cream/60 mt-0.5">
            Your ultimate short video platform
          </p>
        </div>
      </div>

      <section className="mt-8 space-y-6">
        {/* What is InstantReels */}
        <div className="paper-card p-6">
          <h2 className="font-display text-xl lowercase text-cocoa dark:text-cream">
            what is InstantReels?
          </h2>
          <p className="mt-3 text-sm text-charcoal/70 dark:text-cream/70 leading-relaxed">
            InstantReels is your ultimate destination for watching premium short video content.
            We provide a seamless, ad-free experience with a curated collection of high-quality
            reels from various creators and sources. Our platform is designed to be blazing fast,
            fully responsive, and incredibly easy to use — giving you instant access to the best
            content right at your fingertips. Whether you're on mobile or desktop, InstantReels
            delivers a buttery-smooth viewing experience every time.
          </p>
        </div>

        {/* Features */}
        <div className="paper-card p-6">
          <h2 className="font-display text-xl lowercase text-cocoa dark:text-cream">features</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <FeatureItem icon={<Play className="h-4 w-4" />} text="Watch unlimited reels from multiple sources" />
            <FeatureItem icon={<Bookmark className="h-4 w-4" />} text="Save & like your favorite reels" />
            <FeatureItem icon={<Coins className="h-4 w-4" />} text="Earn coins while watching & unlock rewards" />
            <FeatureItem icon={<Gauge className="h-4 w-4" />} text="Auto-scroll for continuous viewing" />
            <FeatureItem icon={<Shield className="h-4 w-4" />} text="Secure PIN protection for your privacy" />
            <FeatureItem icon={<Moon className="h-4 w-4" />} text="Dark/Light/Neon/Matrix theme support" />
            <FeatureItem icon={<Smartphone className="h-4 w-4" />} text="Progressive Web App (PWA) — install it!" />
            <FeatureItem icon={<Zap className="h-4 w-4" />} text="Hold to 2× speed, double-tap to like" />
            <FeatureItem icon={<Heart className="h-4 w-4" />} text="Browse creator profiles & their reels" />
            <FeatureItem icon={<Award className="h-4 w-4" />} text="Redeem coins for exclusive effects & perks" />
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="paper-card p-6">
          <h2 className="font-display text-xl lowercase text-cocoa dark:text-cream">
            privacy & security
          </h2>
          <p className="mt-3 text-sm text-charcoal/70 dark:text-cream/70 leading-relaxed">
            Your privacy is our top priority. All your data — including liked reels, saved reels,
            and personal preferences — is stored locally on your device. We don't collect or store
            any personal data on our servers. Your PIN and preferences are encrypted and stored
            securely in your browser's local storage. No tracking, no ads, no data selling — just
            pure content enjoyment.
          </p>
        </div>

        {/* Open Source */}
        <div className="paper-card p-6">
          <h2 className="font-display text-xl lowercase text-cocoa dark:text-cream">
            open source
          </h2>
          <p className="mt-3 text-sm text-charcoal/70 dark:text-cream/70 leading-relaxed">
            InstantReels is completely open source! Anyone can contribute, use, and modify the code. We believe in building together with the community. Check out our GitHub repository to get involved, submit issues, or create pull requests.
          </p>
        </div>

        {/* Credits */}
        <div className="paper-card p-6">
          <h2 className="font-display text-xl lowercase text-cocoa dark:text-cream">credits</h2>

          {/* LFRDCA Technologies Attribution */}
          <div className="mt-2">
            <p className="text-sm text-charcoal/70 dark:text-cream/70 leading-relaxed">
              This application is designed and developed by{" "}
              <a
                href="https://lfrdcatechnologies.cc.cd"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-cobalt-pop hover:text-cobalt-pop/80 transition-colors underline underline-offset-2 decoration-cobalt-pop/30 hover:decoration-cobalt-pop/60"
              >
                LFRDCA Technologies
              </a>
              . Built with modern web technologies including React, TypeScript, and TailwindCSS to provide the best possible user experience.
            </p>
          </div>
        </div>

        {/* Contact */}
        <div className="paper-card p-6">
          <h2 className="font-display text-xl lowercase text-cocoa dark:text-cream">contact</h2>
          <p className="mt-3 text-sm text-charcoal/70 dark:text-cream/70 leading-relaxed">
            For any questions, feedback, or support, please reach out directly on Telegram:
          </p>
          <a
            href="https://t.me/kritilfrdca"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0088cc] px-6 py-2.5 text-sm font-medium text-white shadow-md shadow-[#0088cc]/20 transition hover:bg-[#0077b5] active:scale-95"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 fill-current"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.08-.19-.09-.05-.21-.02-.3.01-.13.04-2.26 1.45-6.38 4.23-.6.41-1.14.61-1.63.6-.53-.01-1.54-.3-2.29-.54-.92-.3-1.64-.46-1.59-.97.03-.26.41-.53 1.15-.81 4.53-1.97 7.55-3.27 9.05-3.89 4.3-1.78 5.2 2.08 5.16 2.09z" />
            </svg>
            Contact Us
          </a>
        </div>

        {/* Version & Tech */}
        <div className="paper-card p-6">
          <h2 className="font-display text-xl lowercase text-cocoa dark:text-cream">app info</h2>
          <div className="mt-3 space-y-2 text-sm text-charcoal/70 dark:text-cream/70">
            <div className="flex justify-between">
              <span>App Name</span>
              <span className="font-semibold text-cocoa dark:text-cream">InstantReels</span>
            </div>
            <div className="flex justify-between">
              <span>Type</span>
              <span className="font-semibold text-cocoa dark:text-cream">Progressive Web App</span>
            </div>
            <div className="flex justify-between">
              <span>Built With</span>
              <span className="font-semibold text-cocoa dark:text-cream">React + TypeScript</span>
            </div>

            <div className="flex justify-between">
              <span>Company</span>
              <a
                href="https://lfrdcatechnologies.cc.cd"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-cobalt-pop hover:underline"
              >
                LFRDCA Technologies
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-10 pb-8 text-center">
        <p className="text-xs text-charcoal/40 dark:text-cream/40">
          © {new Date().getFullYear()} InstantReels · A Product By{" "}
          <a
            href="https://lfrdcatechnologies.cc.cd"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cobalt-pop transition-colors"
          >
            LFRDCA Technologies
          </a>
        </p>
      </footer>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-background/50 p-3 transition-colors hover:bg-muted/50">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cobalt-pop/10 text-cobalt-pop">
        {icon}
      </div>
      <span className="text-sm text-charcoal/70 dark:text-cream/70 leading-snug pt-1">
        {text}
      </span>
    </div>
  );
}
