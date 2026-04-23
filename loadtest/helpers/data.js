// helpers/data.js — deterministic fake-data generators for k6 load tests.
// Uses simple LCG-based pseudo-random so the data is reproducible.

// lcg returns a seeded pseudo-random number generator (LCG).
// Returns a function that yields floats in [0, 1).
function lcg(seed) {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Default seeded RNG — override seed via SEED env var.
const seed = parseInt(__ENV.SEED || '42', 10);
const rand = lcg(seed);

const TITLES = [
  'Team meeting', 'Doctor appointment', 'Grocery run', 'School pickup',
  'Gym session', 'Date night', 'Parent-teacher conference', 'Dentist',
  'Car service', 'Birthday party', 'Book club', 'Yoga class',
];

const COLORS = ['#4A90E2', '#E94B4B', '#27AE60', '#F39C12', '#8E44AD', '#1ABC9C'];

const LIST_NAMES = [
  'Weekly groceries', 'Weekend to-do', 'Project tasks', 'Shopping list',
  'Errands', 'Meal plan', 'Home repairs', 'Kids school items',
];

// pick returns a random element from an array using the shared RNG.
function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}

// isoFuture returns an ISO-8601 datetime string N..N+delta hours from now.
function isoFuture(minHours, maxHours) {
  const now = Date.now();
  const ms = (minHours + rand() * (maxHours - minHours)) * 3600 * 1000;
  return new Date(now + ms).toISOString();
}

// makeEvent returns a JSON body suitable for POST /v1/events.
export function makeEvent() {
  const start = isoFuture(1, 48);
  const end = new Date(new Date(start).getTime() + (1 + Math.floor(rand() * 3)) * 3600 * 1000).toISOString();
  return JSON.stringify({
    title: pick(TITLES),
    description: `Auto-generated load test event (seed=${seed})`,
    start_time: start,
    end_time: end,
    all_day: false,
    color: pick(COLORS),
  });
}

// makeList returns a JSON body suitable for POST /v1/lists.
export function makeList() {
  return JSON.stringify({
    name: pick(LIST_NAMES),
    color: pick(COLORS),
  });
}

// makeListItem returns a JSON body suitable for POST /v1/lists/:id/items.
export function makeListItem(index) {
  return JSON.stringify({
    name: `Item ${index || Math.floor(rand() * 1000)}`,
    quantity: Math.floor(rand() * 5) + 1,
    unit: pick(['pcs', 'kg', 'g', 'L', 'ml', '']),
  });
}

// makePinPayload returns a JSON body for POST /v1/auth/pin.
export function makePinPayload(email, pin) {
  return JSON.stringify({ email, pin: pin || '1234' });
}
