// helpers/config.js — shared k6 configuration and setup helpers.
// Reads BASE_URL from the environment (defaults to http://localhost:8080).
// Provides a setup() helper that registers a unique test account and returns a JWT.

import http from 'k6/http';
import { check, fail } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// defaultThresholds are applied to every script unless overridden.
export const defaultThresholds = {
  http_req_duration: ['p(95)<500'],
  http_req_failed: ['rate<0.01'],
};

// jsonHeaders returns Content-Type + optional Authorization headers.
export function jsonHeaders(token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) {
    h['Authorization'] = `Bearer ${token}`;
  }
  return h;
}

// registerAndLogin creates a unique test account and returns { token, email, password }.
// Call this from a k6 setup() function so it runs once before VUs start.
export function registerAndLogin(suffix) {
  const ts = Date.now();
  const tag = suffix || ts;
  const email = `loadtest+${tag}@example.invalid`;
  const password = 'LoadTest!Pass1';

  // Register
  const regRes = http.post(
    `${BASE_URL}/v1/auth/register`,
    JSON.stringify({ email, password, name: `Load Tester ${tag}` }),
    { headers: jsonHeaders(), tags: { endpoint: 'auth_register' } },
  );

  if (!check(regRes, { 'register 2xx': (r) => r.status >= 200 && r.status < 300 })) {
    // Account may already exist from a previous interrupted run — try login directly.
  }

  // Login
  const loginRes = http.post(
    `${BASE_URL}/v1/auth/login`,
    JSON.stringify({ email, password }),
    { headers: jsonHeaders(), tags: { endpoint: 'auth_login' } },
  );

  if (!check(loginRes, { 'login 200': (r) => r.status === 200 })) {
    fail(`setup: login failed for ${email}: status=${loginRes.status} body=${loginRes.body}`);
  }

  const body = JSON.parse(loginRes.body);
  if (!body.token) {
    fail(`setup: no token in login response: ${loginRes.body}`);
  }

  return { token: body.token, email, password };
}
