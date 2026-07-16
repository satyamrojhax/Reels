import { useEffect, useState } from "react";
import { KEYS, get, set, remove } from "@/lib/storage";

const SESSION_PIN_KEY = "ig.session_pin_ok";

export function generatePinFromDob(dob: string): string {
  // dob format: YYYY-MM-DD → DDMMYY
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return "";
  const [, yyyy, mm, dd] = m;
  return `${dd}${mm}${yyyy.slice(2)}`;
}

export function useAuth() {
  const [ready, setReady] = useState(false);
  const [ageOk, setAgeOk] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [pinOk, setPinOk] = useState(false);
  const [pinCode, setPinCodeState] = useState<string | null>(null);
  const [realName, setRealName] = useState<string | null>(null);
  const [dob, setDob] = useState<string | null>(null);

  useEffect(() => {
    setAgeOk(get<boolean>(KEYS.age, false));
    setUsername(get<string | null>(KEYS.username, null));
    // Check session storage for PIN verification (persists for current session only)
    const sessionPinOk = sessionStorage.getItem(SESSION_PIN_KEY) === "true";
    setPinOk(sessionPinOk);
    setPinCodeState(get<string | null>(KEYS.pinCode, null));
    setRealName(get<string | null>(KEYS.realName, null));
    setDob(get<string | null>(KEYS.dob, null));
    setReady(true);
  }, []);

  return {
    ready,
    ageOk,
    username,
    pinOk,
    pinCode,
    realName,
    dob,
    confirmAge: () => {
      set(KEYS.age, true);
      setAgeOk(true);
    },
    saveUsername: (u: string) => {
      set(KEYS.username, u);
      setUsername(u);
    },
    setPinOk: (ok: boolean) => {
      set(KEYS.pin, ok);
      sessionStorage.setItem(SESSION_PIN_KEY, ok ? "true" : "false");
      setPinOk(ok);
    },
    savePinSetup: (name: string, dobStr: string) => {
      const code = generatePinFromDob(dobStr);
      set(KEYS.realName, name);
      set(KEYS.dob, dobStr);
      set(KEYS.pinCode, code);
      setRealName(name);
      setDob(dobStr);
      setPinCodeState(code);
      return code;
    },
    logout: () => {
      remove(KEYS.pin);
      setPinOk(false);
    },
  };
}
