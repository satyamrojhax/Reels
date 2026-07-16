import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { BrandMark } from "@/components/nav";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { ready, ageOk, saveUsername, pinCode } = useAuth();
  const [name, setName] = useState("");

  useEffect(() => {
    if (ready && !ageOk) navigate({ to: "/age" });
  }, [ready, ageOk, navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    saveUsername(trimmed);
    navigate({ to: pinCode ? "/pin" : "/pin-setup" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-2 text-charcoal">
          <BrandMark size={32} />
          <span className="font-display text-2xl lowercase text-cocoa">reels.</span>
        </div>
        <p className="font-display text-marker text-xl lowercase italic">first, a name —</p>
        <h1 className="mt-2 font-display text-[56px] leading-[1.05] lowercase text-cocoa">
          what should we <span className="marker-underline">call you?</span>
        </h1>
        <p className="mt-4 text-[17px] text-charcoal/80">
          type anything. it's just a nickname stuck to your device — no email, no server.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-charcoal/60">
              your name
            </span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mr_Hawasi"
              className="w-full rounded-lg border-[1.5px] border-charcoal bg-cream px-4 py-3 text-lg text-charcoal placeholder:text-charcoal/40 outline-none transition focus:bg-dew"
            />
          </label>
          <button type="submit" disabled={!name.trim()} className="btn-pill">
            continue →
          </button>
        </form>
      </div>
    </div>
  );
}
