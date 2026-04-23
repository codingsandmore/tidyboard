// load.js — Baseline load test: ramp 0→50 VU over 2m, steady 5m, ramp down 1m.
// Usage: k6 run loadtest/load.js -e BASE_URL=http://localhost:8080

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, defaultThresholds, jsonHeaders, registerAndLogin } from './helpers/config.js';
import { makeEvent, makeList } from './helpers/data.js';

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // ramp up
    { duration: '5m', target: 50 },   // steady state
    { duration: '1m', target: 0 },    // ramp down
  ],
  thresholds: {
    ...defaultThresholds,
    // endpoint-specific sub-thresholds
    'http_req_duration{endpoint:events_list}': ['p(95)<400'],
    'http_req_duration{endpoint:auth_me}': ['p(95)<200'],
  },
};

export function setup() {
  return registerAndLogin('load');
}

export default function (data) {
  const hdrs = jsonHeaders(data.token);
  const vuID = __VU;

  // Mix of read-heavy and write operations matching realistic usage.
  // ~60% reads, ~25% writes, ~15% deletes.
  const roll = Math.random();

  if (roll < 0.3) {
    // List events
    const r = http.get(`${BASE_URL}/v1/events`, { headers: hdrs, tags: { endpoint: 'events_list' } });
    check(r, { '2xx': (res) => res.status >= 200 && res.status < 300 });
  } else if (roll < 0.5) {
    // Auth me
    const r = http.get(`${BASE_URL}/v1/auth/me`, { headers: hdrs, tags: { endpoint: 'auth_me' } });
    check(r, { '2xx': (res) => res.status >= 200 && res.status < 300 });
  } else if (roll < 0.65) {
    // List events with range filter
    const start = new Date().toISOString();
    const end = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
    const r = http.get(`${BASE_URL}/v1/events?start=${start}&end=${end}`, {
      headers: hdrs,
      tags: { endpoint: 'events_range' },
    });
    check(r, { '2xx': (res) => res.status >= 200 && res.status < 300 });
  } else if (roll < 0.80) {
    // Create event
    const r = http.post(`${BASE_URL}/v1/events`, makeEvent(), {
      headers: hdrs,
      tags: { endpoint: 'events_create' },
    });
    check(r, { '2xx': (res) => res.status >= 200 && res.status < 300 });
    if (r.status === 201) {
      const id = JSON.parse(r.body).id;
      // Immediately delete to avoid unbounded data growth
      http.del(`${BASE_URL}/v1/events/${id}`, null, {
        headers: hdrs,
        tags: { endpoint: 'events_delete' },
      });
    }
  } else if (roll < 0.90) {
    // Create list
    const r = http.post(`${BASE_URL}/v1/lists`, makeList(), {
      headers: hdrs,
      tags: { endpoint: 'lists_create' },
    });
    check(r, { '2xx': (res) => res.status >= 200 && res.status < 300 });
    if (r.status === 201) {
      const id = JSON.parse(r.body).id;
      http.del(`${BASE_URL}/v1/lists/${id}`, null, {
        headers: hdrs,
        tags: { endpoint: 'lists_delete' },
      });
    }
  } else {
    // Health check
    const r = http.get(`${BASE_URL}/health`, { tags: { endpoint: 'health' } });
    check(r, { '2xx': (res) => res.status >= 200 && res.status < 300 });
  }

  sleep(Math.random() * 1 + 0.5); // 0.5–1.5s think time
}
