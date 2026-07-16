import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const [generated, setGenerated] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!ageOk) navigate({ to: "/age" });
    else if (!username) navigate({ to: "/login" });
  }, [ready, ageOk, username, navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = name.trim();
    if (trimmed.length < 2) return setError("please enter your real name.");
    const v = isValidDob(dob);
    if (!v.ok) return setError(v.reason ?? "invalid date.");
    const code = savePinSetup(trimmed, dob);
    setGenerated(code);
    setRevealed(true);
  };

  const today = new Date().toISOString().slice(0, 10);
  const maxDob = new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);

  if (generated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-6 py-10">
        <div className="w-full max-w-md">
          <p className="font-display text-marker text-xl lowercase italic">all set,</p>
          <h1 className="mt-2 font-display text-[56px] leading-[1.05] lowercase text-cocoa">
            your <span className="marker-underline">pin</span> is ready.
          </h1>
          <p className="mt-4 text-[17px] text-charcoal/80">
            we made it from your date of birth (ddmmyy). this is the only time we'll show it — memorise it now.
          </p>

          <div className="mt-8 rounded-2xl border-[1.5px] border-charcoal bg-dew px-6 py-8 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-charcoal/60">
              your pin
            </p>
            <p className="mt-3 font-display text-[56px] tracking-[0.4em] text-cocoa">
              {revealed ? generated : "••••••"}
            </p>
            {revealed && (
              <button
                type="button"
                onClick={() => setRevealed(false)}
                className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-charcoal/60 underline underline-offset-4 hover:text-cocoa"
              >
                hide pin
              </button>
            )}
            {!revealed && (
              <p className="mt-4 text-xs text-charcoal/50">
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
    <div className="flex min-h-screen items-center justify-center bg-cream px-6 py-10">
      <div className="w-full max-w-md">
        <p className="font-display text-marker text-xl lowercase italic">quick setup,</p>
        <h1 className="mt-2 font-display text-[56px] leading-[1.05] lowercase text-cocoa">
          let's make your <span className="marker-underline">pin.</span>
        </h1>
        <p className="mt-4 text-[17px] text-charcoal/80">
          tell us your real name and date of birth. everything stays on this device. must be 18+.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-charcoal/60">
              real name
            </span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. priya sharma"
              maxLength={80}
              className="w-full rounded-lg border-[1.5px] border-charcoal bg-cream px-4 py-3 text-lg text-charcoal placeholder:text-charcoal/40 outline-none transition focus:bg-dew"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-charcoal/60">
              date of birth
            </span>
            <input
              type="date"
              value={dob}
              min="1900-01-01"
              max={maxDob || today}
              onChange={(e) => setDobLocal(e.target.value)}
              className="w-full rounded-lg border-[1.5px] border-charcoal bg-cream px-4 py-3 text-lg text-charcoal outline-none transition focus:bg-dew"
            />
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-wrap gap-3 pt-2">
            <button type="submit" className="btn-pill">
              generate my pin →
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/pin" })}
              className="text-sm text-charcoal/60 underline underline-offset-4 hover:text-cocoa"
            >
              i already have a pin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
