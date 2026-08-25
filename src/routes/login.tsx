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
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-2 text-foreground">
          <BrandMark size={32} />
          <span className="font-display text-2xl lowercase text-foreground">reels.</span>
        </div>
        <p className="font-display text-destructive text-xl lowercase italic">first, a name —</p>
        <h1 className="mt-2 font-display text-[56px] leading-[1.05] lowercase text-foreground">
          what should we <span className="marker-underline">call you?</span>
        </h1>
        <p className="mt-4 text-[17px] text-foreground/80">
          type anything. it's just a nickname stuck to your device — no email, no server.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-foreground/60">
              your name
            </span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Satyam RojhaX"
              className="w-full rounded-lg border-[1.5px] border-foreground/30 bg-background px-4 py-3 text-lg text-foreground placeholder:text-foreground/40 outline-none transition focus:bg-muted"
            />
          </label>
          <button type="submit" disabled={!name.trim()} className="btn-pill">
            continue →
          </button>
          <p className="mt-4 text-[12px] text-foreground/80">
            This is only for you, no one will ever see this. It's just a nickname stuck to your device.
          </p>
        </form>
      </div>
    </div>
  );
}
