"use client";

/**
 * Auth context for Tidyboard.
 *
 * Cognito-issued id_token is the bearer the Go middleware validates.
 * Stored in localStorage under "tb-auth-token". On mount, if a token exists
 * the provider calls /v1/auth/me to hydrate account/household/member.
 *
 * Demo mode (NEXT_PUBLIC_API_URL == "") still mocks the Smith Family.
 *
 * Sign-in is OIDC redirect to Cognito's Hosted UI (PKCE Authorization Code).
 * The callback page (/auth/callback) calls completeCallback() which finishes
 * the exchange and stores the resulting id_token via this provider.
 *
 * The legacy email/password register/login methods are gone — Cognito owns
 * those flows. pinLogin stays for kiosk auth.
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
import { readOIDCConfig, signIn as oidcSignIn, signOut as oidcSignOut } from "@/lib/auth/oidc";

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
  /**
   * The currently "active" member in kiosk mode. In non-kiosk use this is
   * the same as `member`. In kiosk mode any household member can claim the
   * active session by entering their PIN; `activeMember` reflects who did.
   */
  activeMember: AuthMember | null;
  /** Explicitly set the active member (e.g. adult switching without PIN). */
  setActiveMember(m: AuthMember | null): void;
  /** Return to the lock screen (clears activeMember, does NOT clear token). */
  lockKiosk(): void;
  /** Redirect to Cognito Hosted UI; never returns. `returnTo` defaults to "/". */
  signIn(returnTo?: string): Promise<void>;
  /** Set the Cognito-issued id_token after the callback page exchanges it. */
  acceptToken(idToken: string): Promise<void>;
  /** Kiosk PIN auth — backend issues a member-scoped JWT, sets activeMember. */
  pinLogin(memberId: string, pin: string): Promise<void>;
  /** Clear local state + redirect to Cognito /logout. */
  logout(): void;
}

// ── Backend response types ─────────────────────────────────────────────────

interface PinResponse {
  token: string;
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

const FALLBACK_AUTH: Pick<AuthState, "status" | "account" | "household" | "member" | "token" | "activeMember"> = {
  status: "authenticated",
  account: { id: "demo-account", email: "demo@smithfamily.net" },
  household: { id: "demo-household", name: "Smith Family" },
  member: { id: "demo-member", name: "Sarah Smith", role: "adult" },
  token: "demo-token",
  activeMember: { id: "demo-member", name: "Sarah Smith", role: "adult" },
};

// ── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState>({
  status: "loading",
  account: null,
  household: null,
  member: null,
  token: null,
  activeMember: null,
  setActiveMember: () => {},
  lockKiosk: () => {},
  signIn: async () => {},
  acceptToken: async () => {},
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
  const [activeMember, setActiveMemberState] = useState<AuthMember | null>(null);

  const hydrate = useCallback(async (): Promise<boolean> => {
    try {
      const me = await api.get<MeResponse>("/v1/auth/me");
      setAccount({ id: me.account_id, email: "" });
      if (me.household_id) {
        setHousehold({ id: me.household_id, name: "" });
      } else {
        setHousehold(null);
      }
      if (me.member_id) {
        setMember({
          id: me.member_id,
          name: "",
          role: me.role === "child" ? "child" : "adult",
        });
      } else {
        setMember(null);
      }
      setStatus("authenticated");
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (isApiFallbackMode()) {
      setStatus(FALLBACK_AUTH.status);
      setAccount(FALLBACK_AUTH.account);
      setHousehold(FALLBACK_AUTH.household);
      setMember(FALLBACK_AUTH.member);
      setToken(FALLBACK_AUTH.token);
      setActiveMemberState(FALLBACK_AUTH.activeMember);
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

  const signIn = useCallback(async (returnTo: string = "/"): Promise<void> => {
    const cfg = readOIDCConfig();
    if (!cfg) {
      throw new Error("auth: Cognito not configured (NEXT_PUBLIC_COGNITO_* env missing)");
    }
    await oidcSignIn(cfg, returnTo);
    // Browser redirected away — anything after this never runs.
  }, []);

  const acceptToken = useCallback(
    async (idToken: string): Promise<void> => {
      persistToken(idToken);
      setToken(idToken);
      await hydrate();
    },
    [hydrate],
  );

  const pinLogin = useCallback(async (memberId: string, pin: string): Promise<void> => {
    const res = await api.post<PinResponse>("/v1/auth/pin", { member_id: memberId, pin });
    persistToken(res.token);
    setToken(res.token);
    setStatus("authenticated");
    if (res.member_id) {
      const m: AuthMember = { id: res.member_id, name: "", role: "child" };
      setMember((prev) => prev ? { ...prev, id: res.member_id! } : m);
      setActiveMemberState(m);
    }
  }, []);

  const setActiveMember = useCallback((m: AuthMember | null): void => {
    setActiveMemberState(m);
  }, []);

  const lockKiosk = useCallback((): void => {
    setActiveMemberState(null);
  }, []);

  const logout = useCallback((): void => {
    clearToken();
    setToken(null);
    setAccount(null);
    setHousehold(null);
    setMember(null);
    setStatus("unauthenticated");
    const cfg = readOIDCConfig();
    if (cfg) {
      // Redirects to Cognito /logout, which redirects back to logoutUri.
      oidcSignOut(cfg);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        status, account, household, member, token,
        activeMember: activeMember ?? member,
        setActiveMember,
        lockKiosk,
        signIn, acceptToken, pinLogin, logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
