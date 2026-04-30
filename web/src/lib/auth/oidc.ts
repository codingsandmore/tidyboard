/**
 * OIDC Authorization Code + PKCE flow against AWS Cognito.
 *
 * Cognito's Hosted UI is the IdP — we never see Google directly, just receive
 * Cognito-issued tokens after the user federates through. The flow:
 *
 *   1. signIn(): generate code_verifier + code_challenge (PKCE), stash the
 *      verifier + state in sessionStorage, redirect to Cognito's /login.
 *   2. User picks Google (or Cognito-native email/password) and consents.
 *   3. Cognito redirects to /auth/callback?code=<authcode>&state=<…>.
 *   4. handleCallback(): verify state matches, POST to /oauth2/token with
 *      the auth code + the original verifier, receive id_token + access_token.
 *   5. Store id_token (it's the JWT the Go middleware validates) and discard
 *      the access_token — Cognito's access_tokens don't carry email/name and
 *      we use id_token as the bearer per the backend's design.
 *
 * No external libraries: PKCE = Web Crypto + base64url, token exchange = fetch.
 */

const STORAGE_PREFIX = "tb-oidc";
const VERIFIER_KEY = `${STORAGE_PREFIX}-verifier`;
const STATE_KEY = `${STORAGE_PREFIX}-state`;
const RETURN_TO_KEY = `${STORAGE_PREFIX}-return-to`;

export interface OIDCConfig {
  domain: string; // e.g. tidyboard-prod.auth.us-east-1.amazoncognito.com
  clientId: string; // app client ID, public
  redirectUri: string; // e.g. https://tidyboard.org/auth/callback
  logoutUri: string; // e.g. https://tidyboard.org/
}

export interface TokenResponse {
  id_token: string;
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: "Bearer";
}

/** Read the OIDC config from NEXT_PUBLIC_* env vars. Returns null if any are missing. */
export function readOIDCConfig(): OIDCConfig | null {
  const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
  if (!domain || !clientId) return null;

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://tidyboard.org";
  return {
    domain,
    clientId,
    redirectUri: `${origin}/auth/callback`,
    logoutUri: `${origin}/`,
  };
}

// ── PKCE primitives ──────────────────────────────────────────────────────────

/** Generates a cryptographically random URL-safe string of `byteLen` bytes. */
function randomString(byteLen: number): string {
  const buf = new Uint8Array(byteLen);
  crypto.getRandomValues(buf);
  return base64UrlEncode(buf);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** SHA-256 + base64url; returns the PKCE code_challenge for a given verifier. */
async function codeChallengeFor(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Build the Cognito Hosted UI authorize URL and redirect the browser to it.
 * Stashes the PKCE verifier + state in sessionStorage so handleCallback can
 * complete the exchange.
 *
 * `returnTo` is captured so the callback page can land the user back where
 * they came from after sign-in (defaults to "/").
 */
export async function signIn(cfg: OIDCConfig, returnTo: string = "/"): Promise<void> {
  const verifier = randomString(48); // 64 base64url chars after encoding
  const state = randomString(16);
  const challenge = await codeChallengeFor(verifier);

  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(RETURN_TO_KEY, returnTo);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  window.location.assign(`https://${cfg.domain}/oauth2/authorize?${params.toString()}`);
}

/** Result of a callback exchange. */
export interface CallbackResult {
  idToken: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
  returnTo: string;
}

/**
 * Complete the OIDC code exchange. Reads `code` + `state` from the current
 * URL, validates state, swaps the auth code for tokens, returns the id_token
 * the rest of the app uses as a Bearer.
 *
 * Throws if state mismatches, the code is missing, or Cognito rejects the
 * exchange — caller should redirect to /login on failure.
 */
export async function handleCallback(cfg: OIDCConfig): Promise<CallbackResult> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const stateInUrl = url.searchParams.get("state");

  if (!code) throw new Error("oidc: missing authorization code");

  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  const stateStored = sessionStorage.getItem(STATE_KEY);
  const returnTo = sessionStorage.getItem(RETURN_TO_KEY) ?? "/";
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(RETURN_TO_KEY);

  if (!verifier) throw new Error("oidc: missing PKCE verifier (session expired?)");
  if (!stateStored || stateStored !== stateInUrl) {
    throw new Error("oidc: state mismatch — possible CSRF");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: cfg.clientId,
    code,
    redirect_uri: cfg.redirectUri,
    code_verifier: verifier,
  });

  const resp = await fetch(`https://${cfg.domain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`oidc: token exchange failed (${resp.status}): ${text}`);
  }
  const tok = (await resp.json()) as TokenResponse;
  if (!tok.id_token) throw new Error("oidc: token response missing id_token");

  return {
    idToken: tok.id_token,
    refreshToken: tok.refresh_token,
    expiresAt: Date.now() + tok.expires_in * 1000,
    returnTo,
  };
}

/**
 * Clear local tokens and redirect to Cognito's /logout endpoint, which
 * clears the Cognito session cookie and redirects back to logoutUri.
 */
export function signOut(cfg: OIDCConfig): void {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    logout_uri: cfg.logoutUri,
  });
  window.location.assign(`https://${cfg.domain}/logout?${params.toString()}`);
}
