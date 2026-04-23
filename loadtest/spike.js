// spike.js — Sudden traffic spike: 10 VU → 200 VU → 10 VU.
// Tests autoscaling headroom and connection pool elasticity.
// Usage: k6 run loadtest/spike.js -e BASE_URL=http://localhost:8080

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, jsonHeaders, registerAndLogin } from './helpers/config.js';
import { makeEvent } from './helpers/data.js';

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // baseline
    { duration: '10s', target: 200 }, // spike — abrupt ramp
    { duration: '3m', target: 200 },  // sustain spike
    { duration: '10s', target: 10 },  // drop back
    { duration: '1m', target: 10 },   // recovery
    { duration: '30s', target: 0 },   // wind down
  ],
  thresholds: {
    // Allow higher p95 during spike — we care about error rate more.
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.05'],
  },
};

export function setup() {
  return registerAndLogin('spike');
}

export default function (data) {
  const hdrs = jsonHeaders(data.token);

  // Split 70/30 read/write to stress both paths during the spike.
  if (Math.random() < 0.7) {
    const r = http.get(`${BASE_URL}/v1/events`, { headers: hdrs, tags: { endpoint: 'events_list' } });
    check(r, { '2xx': (res) => res.status >= 200 && res.status < 300 });
  } else {
    const w = http.post(`${BASE_URL}/v1/events`, makeEvent(), {
      headers: hdrs,
      tags: { endpoint: 'events_create' },
    });
    check(w, { '2xx': (res) => res.status >= 200 && res.status < 300 });
    if (w.status === 201) {
      const id = JSON.parse(w.body).id;
      http.del(`${BASE_URL}/v1/events/${id}`, null, {
        headers: hdrs,
        tags: { endpoint: 'events_delete' },
      });
    }
  }

  sleep(0.5);
}
