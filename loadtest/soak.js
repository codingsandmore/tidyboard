// soak.js — 20 VU for 2h to catch memory leaks and connection pool exhaustion.
// Usage: k6 run loadtest/soak.js -e BASE_URL=http://localhost:8080
//
// Monitor: watch RSS growth in `docker stats`, check for leaked goroutines
// via GET /debug/pprof/goroutine (if enabled) or Prometheus metrics.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, defaultThresholds, jsonHeaders, registerAndLogin } from './helpers/config.js';
import { makeEvent, makeList, makeListItem } from './helpers/data.js';

export const options = {
  vus: 20,
  duration: '2h',
  thresholds: {
    ...defaultThresholds,
    // Slightly looser p95 for long-running test to account for GC pauses.
    http_req_duration: ['p(95)<600'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  return registerAndLogin('soak');
}

export default function (data) {
  const hdrs = jsonHeaders(data.token);
  const iter = __ITER;

  // Rotate through all major API surfaces each iteration.
  switch (iter % 5) {
    case 0: {
      // Health
      const r = http.get(`${BASE_URL}/health`, { tags: { endpoint: 'health' } });
      check(r, { '2xx': (res) => res.status >= 200 && res.status < 300 });
      break;
    }
    case 1: {
      // List events (range query)
      const start = new Date().toISOString();
      const end = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
      const r = http.get(`${BASE_URL}/v1/events?start=${start}&end=${end}`, {
        headers: hdrs,
        tags: { endpoint: 'events_range' },
      });
      check(r, { '2xx': (res) => res.status >= 200 && res.status < 300 });
      break;
    }
    case 2: {
      // Create + delete event (verify no leaked rows)
      const c = http.post(`${BASE_URL}/v1/events`, makeEvent(), {
        headers: hdrs,
        tags: { endpoint: 'events_create' },
      });
      check(c, { 'event created': (r) => r.status === 201 });
      if (c.status === 201) {
        const id = JSON.parse(c.body).id;
        const d = http.del(`${BASE_URL}/v1/events/${id}`, null, {
          headers: hdrs,
          tags: { endpoint: 'events_delete' },
        });
        check(d, { 'event deleted': (r) => r.status === 204 });
      }
      break;
    }
    case 3: {
      // Auth me
      const r = http.get(`${BASE_URL}/v1/auth/me`, { headers: hdrs, tags: { endpoint: 'auth_me' } });
      check(r, { '2xx': (res) => res.status >= 200 && res.status < 300 });
      break;
    }
    case 4: {
      // Create + delete list
      const c = http.post(`${BASE_URL}/v1/lists`, makeList(), {
        headers: hdrs,
        tags: { endpoint: 'lists_create' },
      });
      check(c, { 'list created': (r) => r.status === 201 });
      if (c.status === 201) {
        const id = JSON.parse(c.body).id;
        http.del(`${BASE_URL}/v1/lists/${id}`, null, {
          headers: hdrs,
          tags: { endpoint: 'lists_delete' },
        });
      }
      break;
    }
  }

  sleep(2); // 2s think time keeps realistic connection pressure
}
