// smoke.js — 1 VU for 30s, sanity check that every endpoint responds.
// Usage: k6 run loadtest/smoke.js -e BASE_URL=http://localhost:8080

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, defaultThresholds, jsonHeaders, registerAndLogin } from './helpers/config.js';
import { makeEvent } from './helpers/data.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: defaultThresholds,
};

export function setup() {
  return registerAndLogin('smoke');
}

export default function (data) {
  const hdrs = jsonHeaders(data.token);

  // Health
  const health = http.get(`${BASE_URL}/health`, { tags: { endpoint: 'health' } });
  check(health, { 'health 200': (r) => r.status === 200 });

  // Auth me
  const me = http.get(`${BASE_URL}/v1/auth/me`, { headers: hdrs, tags: { endpoint: 'auth_me' } });
  check(me, { 'auth/me 200': (r) => r.status === 200 });

  // Create event
  const createEv = http.post(`${BASE_URL}/v1/events`, makeEvent(), {
    headers: hdrs,
    tags: { endpoint: 'events_create' },
  });
  check(createEv, { 'event created 201': (r) => r.status === 201 });

  let eventID;
  if (createEv.status === 201) {
    eventID = JSON.parse(createEv.body).id;
  }

  // List events
  const listEv = http.get(`${BASE_URL}/v1/events`, { headers: hdrs, tags: { endpoint: 'events_list' } });
  check(listEv, { 'events list 200': (r) => r.status === 200 });

  // Get event
  if (eventID) {
    const getEv = http.get(`${BASE_URL}/v1/events/${eventID}`, {
      headers: hdrs,
      tags: { endpoint: 'events_get' },
    });
    check(getEv, { 'event get 200': (r) => r.status === 200 });

    // Delete event
    const delEv = http.del(`${BASE_URL}/v1/events/${eventID}`, null, {
      headers: hdrs,
      tags: { endpoint: 'events_delete' },
    });
    check(delEv, { 'event delete 204': (r) => r.status === 204 });
  }

  sleep(1);
}
