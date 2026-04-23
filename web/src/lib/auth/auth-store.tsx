"use client";

/**
 * Auth context for Tidyboard.
 *
 * Stores the JWT in localStorage under "tb-auth-token".
 * On mount, if a token exists it calls /v1/auth/me to hydrate account/household/member.
 * Falls back to mock "Smith Family" user when NEXT_PUBLIC_API_URL is "" (demo mode).
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { api } from "@/lib/api/client";
import { isApiFallbackMode } from "@/lib/api/fallback";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AuthAccount {
  id: string;
  email: string;
}

export interface AuthHousehold {
  id: string;
  name: string;
}

export interface AuthMember {
  id: string;
  name: string;
  role: "adult" | "child";
}

export type AuthStatus = "loading" | "unauthenticated" | "authenticated";

export interface AuthState {
  status: AuthStatus;
  account: AuthAccount | null;
  household: AuthHousehold | null;
  member: AuthMember | null;
  token: string | null;
  register(email: string, password: string): Promise<void>;
  login(email: string, password: string): Promise<void>;
  pinLogin(memberId: string, pin: string): Promise<void>;
  logout(): void;
}

// ── Backend response types ─────────────────────────────────────────────────

interface AuthResponse {
  token: string;
  account_id?: string;
  member_id?: string;
}

interface MeResponse {
  account_id: string;
  household_id?: string;
  member_id?: string;
  role: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const TOKEN_KEY = "tb-auth-token";

// ── Fallback mock auth ─────────────────────────────────────────────────────

const FALLBACK_AUTH: Pick<AuthState, "status" | "account" | "household" | "member" | "token"> = {
  status: "authenticated",
  account: { id: "demo-account", email: "demo@smithfamily.net" },
  household: { id: "demo-household", name: "Smith Family" },
  member: { id: "demo-member", name: "Sarah Smith", role: "adult" },
  token: "demo-token",
};

// ── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState>({
  status: "loading",
  account: null,
  household: null,
  member: null,
  token: null,
  register: async () => {},
  login: async () => {},
  pinLogin: async () => {},
  logout: () => {},
});

// ── Helpers ────────────────────────────────────────────────────────────────

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function persistToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

// ── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [household, setHousehold] = useState<AuthHousehold | null>(null);
  const [member, setMember] = useState<AuthMember | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Hydrate from /me using current token
  const hydrate = useCallback(async (): Promise<boolean> => {
    try {
      const me = await api.get<MeResponse>("/v1/auth/me");
      setAccount({ id: me.account_id, email: "" });
      if (me.household_id) {
        setHousehold({ id: me.household_id, name: "" });
      }
      if (me.member_id) {
        setMember({ id: me.member_id, name: "", role: me.role === "child" ? "child" : "adult" });
      }
      setStatus("authenticated");
      return true;
    } catch {
      return false;
    }
  }, []);

  // On mount: check fallback mode or try to restore session
  useEffect(() => {
    if (isApiFallbackMode()) {
      setStatus(FALLBACK_AUTH.status);
      setAccount(FALLBACK_AUTH.account);
      setHousehold(FALLBACK_AUTH.household);
      setMember(FALLBACK_AUTH.member);
      setToken(FALLBACK_AUTH.token);
      return;
    }

    const stored = readToken();
    if (!stored) {
      setStatus("unauthenticated");
      return;
    }

    setToken(stored);
    hydrate().then((ok) => {
      if (!ok) {
        clearToken();
        setToken(null);
        setStatus("unauthenticated");
      }
    });
  }, [hydrate]);

  const register = useCallback(async (email: string, password: string): Promise<void> => {
    const res = await api.post<AuthResponse>("/v1/auth/register", { email, password });
    persistToken(res.token);
    setToken(res.token);
    // Set account id from response; /me will fill the rest
    if (res.account_id) {
      setAccount({ id: res.account_id, email });
    }
    await hydrate();
    // Update email after /me (which may not return it)
    setAccount((prev) => prev ? { ...prev, email } : { id: res.account_id ?? "", email });
  }, [hydrate]);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const res = await api.post<AuthResponse>("/v1/auth/login", { email, password });
    persistToken(res.token);
    setToken(res.token);
    if (res.account_id) {
      setAccount({ id: res.account_id, email });
    }
    await hydrate();
    setAccount((prev) => prev ? { ...prev, email } : { id: res.account_id ?? "", email });
  }, [hydrate]);

  const pinLogin = useCallback(async (memberId: string, pin: string): Promise<void> => {
    const res = await api.post<AuthResponse>("/v1/auth/pin", { member_id: memberId, pin });
    persistToken(res.token);
    setToken(res.token);
    setStatus("authenticated");
    if (res.member_id) {
      setMember((prev) => prev ? { ...prev, id: res.member_id! } : { id: res.member_id!, name: "", role: "child" });
    }
  }, []);

  const logout = useCallback((): void => {
    clearToken();
    setToken(null);
    setAccount(null);
    setHousehold(null);
    setMember(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <AuthContext.Provider
      value={{ status, account, household, member, token, register, login, pinLogin, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
