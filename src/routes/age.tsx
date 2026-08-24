import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/age")({
  component: AgePage,
});

function AgePage() {
  const navigate = useNavigate();
  const { confirmAge } = useAuth();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-10">
      <Sticker className="left-6 top-8 rotate-[-12deg]" color="var(--color-sky-sticker)" shape="bolt" />
      <Sticker className="right-10 top-20 rotate-[8deg]" color="var(--color-bubblegum-sticker)" shape="heart" />
      <Sticker className="bottom-14 left-12 rotate-[10deg]" color="var(--color-sprout-sticker)" shape="star" />

      <div className="relative w-full max-w-lg">
        <p className="mb-3 font-display text-destructive text-xl lowercase italic">dear grownups,</p>
        <h1 className="font-display text-[56px] leading-[1.05] lowercase text-foreground md:text-[72px]">
          are you <span className="marker-underline">eighteen</span> or older?
        </h1>
        <p className="mt-5 max-w-md text-[17px] leading-relaxed text-foreground/80">
          this playground is stitched together from adult reels. pinky-promise you're 18+ and we'll let you in.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => {
              confirmAge();
              navigate({ to: "/login" });
            }}
            className="btn-pill"
          >
            i'm 18+ — let me in
          </button>
          <a href="https://www.google.com" className="btn-pill" style={{ opacity: 0.7 }}>
            take me back
          </a>
        </div>
        <p className="mt-6 text-sm text-foreground/60">no signup, no tracking. everything lives on this device.</p>
      </div>
    </div>
  );
}

function Sticker({
  className,
  color,
  shape,
}: {
  className?: string;
  color: string;
  shape: "bolt" | "heart" | "star";
}) {
  const d =
    shape === "bolt"
      ? "M20 4 L8 24 H18 L14 40 L28 18 H18 Z"
      : shape === "heart"
      ? "M22 38 C6 26 8 12 18 12 C22 12 22 16 22 16 C22 16 22 12 26 12 C36 12 38 26 22 38 Z"
      : "M22 4 L26 16 L38 18 L29 26 L32 38 L22 32 L12 38 L15 26 L6 18 L18 16 Z";
  return (
    <svg
      className={`pointer-events-none absolute h-14 w-14 ${className ?? ""}`}
      viewBox="0 0 44 44"
      aria-hidden
    >
      <path d={d} fill={color} stroke="#171717" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
