// stress.js — Find the breaking point: ramp 0→500 VU over 5m, hold 2m, ramp down.
// Usage: k6 run loadtest/stress.js -e BASE_URL=http://localhost:8080

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, jsonHeaders, registerAndLogin } from './helpers/config.js';
import { makeEvent } from './helpers/data.js';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // warm up
    { duration: '2m', target: 200 },  // moderate load
    { duration: '2m', target: 500 },  // stress
    { duration: '2m', target: 500 },  // hold at peak
    { duration: '1m', target: 0 },    // ramp down
  ],
  // Relaxed thresholds — the goal is to find the limit, not pass/fail.
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.10'],
  },
};

export function setup() {
  return registerAndLogin('stress');
}

export default function (data) {
  const hdrs = jsonHeaders(data.token);

  // Focus on the most load-sensitive read path.
  const r = http.get(`${BASE_URL}/v1/events`, { headers: hdrs, tags: { endpoint: 'events_list' } });
  check(r, { '2xx': (res) => res.status >= 200 && res.status < 300 });

  // Occasional writes to stress DB write path.
  if (Math.random() < 0.2) {
    const w = http.post(`${BASE_URL}/v1/events`, makeEvent(), {
      headers: hdrs,
      tags: { endpoint: 'events_create' },
    });
    check(w, { 'write 2xx': (res) => res.status >= 200 && res.status < 300 });
    if (w.status === 201) {
      const id = JSON.parse(w.body).id;
      http.del(`${BASE_URL}/v1/events/${id}`, null, {
        headers: hdrs,
        tags: { endpoint: 'events_delete' },
      });
    }
  }

  sleep(0.1); // minimal think time to maximize throughput
}
