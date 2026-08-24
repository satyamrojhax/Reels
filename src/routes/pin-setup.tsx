import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/pin-setup")({
  component: PinSetupPage,
});

function calcAge(dob: string): number {
  const [y, m, d] = dob.split("-").map(Number);
  const today = new Date();
  let age = today.getUTCFullYear() - y;
  const mDiff = today.getUTCMonth() + 1 - m;
  if (mDiff < 0 || (mDiff === 0 && today.getUTCDate() < d)) age--;
  return age;
}

function isValidDob(dob: string): { ok: boolean; reason?: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return { ok: false, reason: "use format yyyy-mm-dd." };
  const [y, m, d] = dob.split("-").map(Number);
  if (y < 1900) return { ok: false, reason: "year looks too far back." };
  if (m < 1 || m > 12) return { ok: false, reason: "month must be 01–12." };
  if (d < 1 || d > 31) return { ok: false, reason: "day must be 01–31." };
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() + 1 !== m ||
    dt.getUTCDate() !== d
  ) {
    return { ok: false, reason: "that date doesn't exist." };
  }
  if (dt.getTime() > Date.now()) return { ok: false, reason: "date can't be in the future." };
  const age = calcAge(dob);
  if (age < 18) return { ok: false, reason: "you must be 18+ to use reels." };
  if (age > 120) return { ok: false, reason: "that age isn't plausible." };
  return { ok: true };
}

function PinSetupPage() {
  const navigate = useNavigate();
  const { ready, ageOk, username, savePinSetup } = useAuth();
  const [name, setName] = useState("");
  const [dob, setDobLocal] = useState("");
  const [email, setEmailLocal] = useState("");
  const [mobile, setMobileLocal] = useState("");
  const [generated, setGenerated] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(true);
  const [error, setError] = useState("");
  const [checked, setChecked] = useState(false);
  const loadTime = useRef<number>(Date.now());

  useEffect(() => {
    loadTime.current = Date.now();
  }, []);

  const handleCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const elapsed = Date.now() - loadTime.current;
      if (elapsed < 3000) {
        setError("padhe phele (please read first).");
        e.preventDefault();
        return;
      }
    }
    setError("");
    setChecked(e.target.checked);
  };

  useEffect(() => {
    if (!ready) return;
    if (!ageOk) navigate({ to: "/age" });
    else if (!username) navigate({ to: "/login" });
  }, [ready, ageOk, username, navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!checked) return setError("please read and accept the consent check.");
    const trimmed = name.trim();
    if (trimmed.length < 2) return setError("please enter your real name.");
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return setError("please enter your email id.");
    const trimmedMobile = mobile.trim();
    if (!trimmedMobile) return setError("please enter your mobile number.");

    const v = isValidDob(dob);
    if (!v.ok) return setError(v.reason ?? "invalid date.");
    const code = savePinSetup(trimmed, dob, trimmedEmail, trimmedMobile);
    setGenerated(code);
    setRevealed(true);
  };

  const today = new Date().toISOString().slice(0, 10);
  const maxDob = new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);

  if (generated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
        <div className="w-full max-w-md">
          <p className="font-display text-destructive text-xl lowercase italic">all set,</p>
          <h1 className="mt-2 font-display text-[56px] leading-[1.05] lowercase text-foreground">
            your <span className="marker-underline">pin</span> is ready.
          </h1>
          <p className="mt-4 text-[17px] text-foreground/80">
            we made it from your date of birth (ddmmyy). this is the only time we'll show it — memorise it now.
          </p>

          <div className="mt-8 rounded-2xl border-[1.5px] border-foreground/30 bg-muted px-6 py-8 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-foreground/60">
              your pin
            </p>
            <p className="mt-3 font-display text-[56px] tracking-[0.4em] text-foreground">
              {revealed ? generated : "••••••"}
            </p>
            {revealed && (
              <button
                type="button"
                onClick={() => setRevealed(false)}
                className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-foreground/60 underline underline-offset-4 hover:text-foreground"
              >
                hide pin
              </button>
            )}
            {!revealed && (
              <p className="mt-4 text-xs text-foreground/50">
                hidden. reveal only shows once — reset from the pin screen if forgotten.
              </p>
            )}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate({ to: "/pin" })}
              className="btn-pill"
            >
              got it, let me in →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-md">
        <p className="font-display text-destructive text-xl lowercase italic">quick setup,</p>
        <h1 className="mt-2 font-display text-[56px] leading-[1.05] lowercase text-foreground">
          let's make your <span className="marker-underline">pin.</span>
        </h1>
        <p className="mt-4 text-[17px] text-foreground/80">
          tell us your real name and date of birth. everything stays on this device. must be 18+.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-foreground/60">
              real name
            </span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. priya sharma"
              maxLength={80}
              className="w-full rounded-lg border-[1.5px] border-foreground/30 bg-background px-4 py-3 text-lg text-foreground placeholder:text-foreground/40 outline-none transition focus:bg-muted"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-foreground/60">
              date of birth
            </span>
            <input
              type="date"
              value={dob}
              min="1900-01-01"
              max={maxDob || today}
              onChange={(e) => setDobLocal(e.target.value)}
              className="w-full rounded-lg border-[1.5px] border-foreground/30 bg-background px-4 py-3 text-lg text-foreground outline-none transition focus:bg-muted"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-foreground/60">
              email id
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmailLocal(e.target.value)}
              placeholder="e.g. hello@example.com"
              className="w-full rounded-lg border-[1.5px] border-foreground/30 bg-background px-4 py-3 text-lg text-foreground placeholder:text-foreground/40 outline-none transition focus:bg-muted"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-foreground/60">
              mobile number
            </span>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobileLocal(e.target.value)}
              placeholder="e.g. +91 9876543210"
              className="w-full rounded-lg border-[1.5px] border-foreground/30 bg-background px-4 py-3 text-lg text-foreground placeholder:text-foreground/40 outline-none transition focus:bg-muted"
            />
          </label>

          <label className="mt-4 flex items-start gap-3 rounded-xl border-[1.5px] border-foreground/30 bg-muted/50 p-4 transition-colors hover:bg-muted">
            <input
              type="checkbox"
              checked={checked}
              onChange={handleCheck}
              className="mt-1 h-5 w-5 shrink-0 rounded border-foreground/30 accent-foreground"
            />
            <span className="text-sm text-foreground/90">
              I swear on my parents that I am 18+, and I accept that I might see adult content here.
            </span>
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-wrap gap-3 pt-2">
            <button type="submit" disabled={!checked} className="btn-pill disabled:opacity-50 disabled:cursor-not-allowed">
              generate my pin →
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/pin" })}
              className="text-sm text-foreground/60 underline underline-offset-4 hover:text-foreground"
            >
              i already have a pin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
