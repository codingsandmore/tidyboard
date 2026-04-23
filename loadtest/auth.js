// auth.js — Hammer the authentication endpoints: register, login, PIN, me.
// Useful for spotting bcrypt bottlenecks and rate-limiter behaviour.
// Usage: k6 run loadtest/auth.js -e BASE_URL=http://localhost:8080

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, defaultThresholds, jsonHeaders, registerAndLogin } from './helpers/config.js';

export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '3m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    ...defaultThresholds,
    // bcrypt is intentionally slow — allow longer p95 for login.
    'http_req_duration{endpoint:auth_login}': ['p(95)<2000'],
    'http_req_duration{endpoint:auth_register}': ['p(95)<2000'],
    'http_req_duration{endpoint:auth_me}': ['p(95)<200'],
  },
};

export function setup() {
  return registerAndLogin('auth-base');
}

export default function (data) {
  const hdrs = jsonHeaders(data.token);
  const roll = Math.random();

  if (roll < 0.15) {
    // Register a new unique account (tests bcrypt hashing at scale).
    const ts = `${Date.now()}-${__VU}-${__ITER}`;
    const email = `loadtest+${ts}@example.invalid`;
    const r = http.post(
      `${BASE_URL}/v1/auth/register`,
      JSON.stringify({ email, password: 'LoadTest!Pass1', name: `VU ${__VU}` }),
      { headers: jsonHeaders(), tags: { endpoint: 'auth_register' } },
    );
    check(r, { 'register 2xx': (res) => res.status >= 200 && res.status < 300 });
  } else if (roll < 0.40) {
    // Login with the shared test account.
    const r = http.post(
      `${BASE_URL}/v1/auth/login`,
      JSON.stringify({ email: data.email, password: data.password }),
      { headers: jsonHeaders(), tags: { endpoint: 'auth_login' } },
    );
    check(r, { 'login 200': (res) => res.status === 200 });
  } else if (roll < 0.55) {
    // Attempt PIN login (will return 401 since no PIN is set — tests error path).
    const r = http.post(
      `${BASE_URL}/v1/auth/pin`,
      JSON.stringify({ email: data.email, pin: '0000' }),
      { headers: jsonHeaders(), tags: { endpoint: 'auth_pin' } },
    );
    // 401 is expected here; we just want to ensure the server doesn't crash.
    check(r, { 'pin responds': (res) => res.status >= 200 && res.status < 500 });
  } else {
    // Auth me — cheapest auth endpoint, used to baseline JWT validation throughput.
    const r = http.get(`${BASE_URL}/v1/auth/me`, { headers: hdrs, tags: { endpoint: 'auth_me' } });
    check(r, { 'me 200': (res) => res.status === 200 });
  }

  sleep(1);
}
