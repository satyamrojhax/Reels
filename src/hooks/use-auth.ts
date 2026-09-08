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
  const [hash, setHash] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  useEffect(() => {
    setAgeOk(get<boolean>(KEYS.age, false));
    setUsername(get<string | null>(KEYS.username, null));
    // Check session storage for PIN verification (persists for current session only)
    const sessionPinOk = sessionStorage.getItem(SESSION_PIN_KEY) === "true";
    setPinOk(sessionPinOk);
    setPinCodeState(get<string | null>(KEYS.pinCode, null));
    setRealName(get<string | null>(KEYS.realName, null));
    setDob(get<string | null>(KEYS.dob, null));
    setHash(get<string | null>(KEYS.hash, null));
    setDeviceId(get<string | null>(KEYS.deviceId, null));
    setFingerprint(get<string | null>(KEYS.fingerprint, null));
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
    hash,
    deviceId,
    fingerprint,
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
    savePinSetup: async (name: string, dobStr: string) => {
      const code = generatePinFromDob(dobStr);
      set(KEYS.realName, name);
      set(KEYS.dob, dobStr);
      
      const encoder = new TextEncoder();
      const data = encoder.encode(name + dobStr + Date.now());
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      
      const newDeviceId = crypto.randomUUID();
      const newFingerprint = btoa(navigator.userAgent + window.screen.width + window.screen.height + newDeviceId).slice(0, 32);

      set(KEYS.hash, hashHex);
      set(KEYS.deviceId, newDeviceId);
      set(KEYS.fingerprint, newFingerprint);
      
      set(KEYS.pinCode, code);
      setRealName(name);
      setDob(dobStr);
      setHash(hashHex);
      setDeviceId(newDeviceId);
      setFingerprint(newFingerprint);
      setPinCodeState(code);
      return code;
    },
    logout: () => {
      remove(KEYS.pin);
      setPinOk(false);
    },
  };
}
