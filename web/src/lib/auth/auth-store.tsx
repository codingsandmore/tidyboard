"use client";

/**
 * Auth context for Tidyboard.
 *
 * Cognito-issued id_token is the bearer the Go middleware validates.
 * Stored in localStorage under "tb-auth-token". On mount, if a token exists
 * the provider calls /v1/auth/me to hydrate account/household/member.
 *
 * Auth never fabricates a household. Preview fixtures may still be used by
 * preview routes, but production routes require a real token from Cognito.
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
  /** Re-read /v1/auth/me after onboarding creates household/member records. */
  refresh(): Promise<boolean>;
  /** Kiosk PIN auth — backend issues a member-scoped JWT, sets activeMember. */
  pinLogin(memberId: string, pin: string): Promise<void>;
  /** Clear local state + redirect to Cognito /logout. */
  logout(): void;
  /**
   * All households this account is a member of (fetched from GET /v1/me/households).
   * Empty until hydration completes. Populated even in single-household accounts.
   */
  availableHouseholds: AuthHousehold[];
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

// ── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState>({
  status: "loading",
  account: null,
  household: null,
  member: null,
  token: null,
  activeMember: null,
  availableHouseholds: [],
  setActiveMember: () => {},
  lockKiosk: () => {},
  signIn: async () => {},
  acceptToken: async () => {},
  refresh: async () => false,
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

function clearSessionState(
  setters: {
    setToken: (token: string | null) => void;
    setAccount: (account: AuthAccount | null) => void;
    setHousehold: (household: AuthHousehold | null) => void;
    setMember: (member: AuthMember | null) => void;
    setActiveMember: (member: AuthMember | null) => void;
    setAvailableHouseholds: (households: AuthHousehold[]) => void;
    setStatus: (status: AuthStatus) => void;
  },
  status: AuthStatus = "unauthenticated",
): void {
  setters.setToken(null);
  setters.setAccount(null);
  setters.setHousehold(null);
  setters.setMember(null);
  setters.setActiveMember(null);
  setters.setAvailableHouseholds([]);
  setters.setStatus(status);
}

// ── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [household, setHousehold] = useState<AuthHousehold | null>(null);
  const [member, setMember] = useState<AuthMember | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeMember, setActiveMemberState] = useState<AuthMember | null>(null);
  const [availableHouseholds, setAvailableHouseholds] = useState<AuthHousehold[]>([]);

  const hydrate = useCallback(async (): Promise<boolean> => {
    try {
      const me = await api.get<MeResponse>("/v1/auth/me");
      if (!me.account_id) {
        return false;
      }
      setAccount({ id: me.account_id, email: "" });
      if (me.household_id) {
        setHousehold({ id: me.household_id, name: "" });
      } else {
        setHousehold(null);
      }
      if (me.member_id) {
        const hydratedMember = {
          id: me.member_id,
          name: "",
          role: me.role === "child" ? "child" : "adult",
        } satisfies AuthMember;
        setMember(hydratedMember);
        setActiveMemberState(hydratedMember);
      } else {
        setMember(null);
        setActiveMemberState(null);
      }
      setStatus("authenticated");
      // Fetch available households in the background — non-fatal if it fails.
      api.get<{ id: string; name: string }[]>("/v1/me/households")
        .then((hhs) => setAvailableHouseholds(hhs.map((h) => ({ id: h.id, name: h.name }))))
        .catch(() => {/* leave empty — single-household fallback */});
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const stored = readToken();
    if (!stored) {
      clearSessionState({
        setToken,
        setAccount,
        setHousehold,
        setMember,
        setActiveMember: setActiveMemberState,
        setAvailableHouseholds,
        setStatus,
      });
      return;
    }

    setToken(stored);
    hydrate().then((ok) => {
      if (!ok) {
        clearToken();
        clearSessionState({
          setToken,
          setAccount,
          setHousehold,
          setMember,
          setActiveMember: setActiveMemberState,
          setAvailableHouseholds,
          setStatus,
        });
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
      const ok = await hydrate();
      if (!ok) {
        clearToken();
        clearSessionState({
          setToken,
          setAccount,
          setHousehold,
          setMember,
          setActiveMember: setActiveMemberState,
          setAvailableHouseholds,
          setStatus,
        });
      }
    },
    [hydrate],
  );

  const refresh = useCallback(async (): Promise<boolean> => {
    return hydrate();
  }, [hydrate]);

  const pinLogin = useCallback(async (memberId: string, pin: string): Promise<void> => {
    const res = await api.post<PinResponse>("/v1/auth/pin", { member_id: memberId, pin });
    persistToken(res.token);
    setToken(res.token);
    const ok = await hydrate();
    if (!ok) {
      clearToken();
      clearSessionState({
        setToken,
        setAccount,
        setHousehold,
        setMember,
        setActiveMember: setActiveMemberState,
        setAvailableHouseholds,
        setStatus,
      });
      throw new Error("auth: PIN login succeeded but account context could not be loaded");
    }
    if (res.member_id) {
      const m: AuthMember = { id: res.member_id, name: "", role: "child" };
      setMember((prev) => prev ? { ...prev, id: res.member_id! } : m);
      setActiveMemberState(m);
    }
  }, [hydrate]);

  const setActiveMember = useCallback((m: AuthMember | null): void => {
    setActiveMemberState(m);
  }, []);

  const lockKiosk = useCallback((): void => {
    setActiveMemberState(null);
  }, []);

  const logout = useCallback((): void => {
    clearToken();
    clearSessionState({
      setToken,
      setAccount,
      setHousehold,
      setMember,
      setActiveMember: setActiveMemberState,
      setAvailableHouseholds,
      setStatus,
    });
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
        availableHouseholds,
        setActiveMember,
        lockKiosk,
        signIn, acceptToken, refresh, pinLogin, logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
