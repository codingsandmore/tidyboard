// events.js — Full CRUD cycle on /v1/events plus range-query load.
// Usage: k6 run loadtest/events.js -e BASE_URL=http://localhost:8080

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, defaultThresholds, jsonHeaders, registerAndLogin } from './helpers/config.js';
import { makeEvent } from './helpers/data.js';

export const options = {
  stages: [
    { duration: '1m', target: 30 },
    { duration: '3m', target: 30 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    ...defaultThresholds,
    'http_req_duration{endpoint:events_list}': ['p(95)<400'],
    'http_req_duration{endpoint:events_range}': ['p(95)<400'],
    'http_req_duration{endpoint:events_create}': ['p(95)<600'],
    'http_req_duration{endpoint:events_get}': ['p(95)<300'],
    'http_req_duration{endpoint:events_update}': ['p(95)<600'],
    'http_req_duration{endpoint:events_delete}': ['p(95)<400'],
  },
};

export function setup() {
  return registerAndLogin('events');
}

export default function (data) {
  const hdrs = jsonHeaders(data.token);
  const roll = Math.random();

  if (roll < 0.35) {
    // GET /v1/events — plain list
    const r = http.get(`${BASE_URL}/v1/events`, { headers: hdrs, tags: { endpoint: 'events_list' } });
    check(r, { '2xx': (res) => res.status >= 200 && res.status < 300 });

  } else if (roll < 0.55) {
    // GET /v1/events?start=&end= — range query
    const start = new Date(Date.now() - 86400 * 1000).toISOString(); // yesterday
    const end = new Date(Date.now() + 7 * 86400 * 1000).toISOString(); // +7 days
    const r = http.get(`${BASE_URL}/v1/events?start=${start}&end=${end}`, {
      headers: hdrs,
      tags: { endpoint: 'events_range' },
    });
    check(r, { '2xx': (res) => res.status >= 200 && res.status < 300 });

  } else {
    // Full CRUD cycle: create → get → update → delete
    const createRes = http.post(`${BASE_URL}/v1/events`, makeEvent(), {
      headers: hdrs,
      tags: { endpoint: 'events_create' },
    });
    check(createRes, { 'create 201': (r) => r.status === 201 });

    if (createRes.status !== 201) {
      sleep(1);
      return;
    }

    const id = JSON.parse(createRes.body).id;

    // GET
    const getRes = http.get(`${BASE_URL}/v1/events/${id}`, {
      headers: hdrs,
      tags: { endpoint: 'events_get' },
    });
    check(getRes, { 'get 200': (r) => r.status === 200 });

    // PATCH
    const patchRes = http.patch(
      `${BASE_URL}/v1/events/${id}`,
      JSON.stringify({ title: 'Updated by load test' }),
      { headers: hdrs, tags: { endpoint: 'events_update' } },
    );
    check(patchRes, { 'update 200': (r) => r.status === 200 });

    // DELETE
    const delRes = http.del(`${BASE_URL}/v1/events/${id}`, null, {
      headers: hdrs,
      tags: { endpoint: 'events_delete' },
    });
    check(delRes, { 'delete 204': (r) => r.status === 204 });
  }

  sleep(0.5 + Math.random() * 0.5);
}
