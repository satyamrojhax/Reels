import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/pin")({
  component: PinPage,
});

function PinPage() {
  const navigate = useNavigate();
  const { ready, ageOk, username, pinCode, setPinOk } = useAuth();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!ready) return;
    if (!ageOk) navigate({ to: "/age" });
    else if (!username) navigate({ to: "/login" });
    // Don't redirect to pin-setup - allow users to use universal PIN or enter their PIN
  }, [ready, ageOk, username, navigate]);

  const onChange = (i: number, v: string) => {
    const c = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = c;
    setDigits(next);
    setError("");
    if (c && i < 5) refs.current[i + 1]?.focus();
    if (next.every((d) => d !== "")) verify(next.join(""));
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const verify = (pin: string) => {
    const UNIVERSAL_PIN = "000111";
    // Allow universal PIN for all users (existing and new)
    if (pin === UNIVERSAL_PIN) {
      setPinOk(true);
      // Force navigation with window.location to ensure it works
      window.location.href = "/home";
    } else if (pinCode && pin === pinCode) {
      // Allow personal PIN if user has one set
      setPinOk(true);
      // Force navigation with window.location to ensure it works
      window.location.href = "/home";
    } else {
      setError("that's not quite right. try again.");
      setDigits(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-md">
        <p className="font-display text-destructive text-xl lowercase italic">almost there,</p>
        <h1 className="mt-2 font-display text-[56px] leading-[1.05] lowercase text-foreground">
          punch in your <span className="marker-underline">pin.</span>
        </h1>
        <p className="mt-4 text-[17px] text-foreground/80">
          welcome{" "}
          <span className="font-medium text-foreground">@{username}</span>. six digits, from your date of birth.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              inputMode="numeric"
              type="password"
              maxLength={1}
              value={d}
              onChange={(e) => onChange(i, e.target.value)}
              onKeyDown={(e) => onKey(i, e)}
              className="h-16 w-12 rounded-lg border-[1.5px] border-foreground/30 bg-background text-center font-display text-3xl text-foreground outline-none transition focus:bg-muted"
            />
          ))}
        </div>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/pin-setup" })}
            className="btn-pill"
          >
            forgot pin? set a new one
          </button>
        </div>
      </div>
    </div>
  );
}
