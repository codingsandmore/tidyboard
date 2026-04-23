# Tidyboard API Client

A thin fetch wrapper and React Query hooks for the Tidyboard REST backend.

## Files

| File | Purpose |
|------|---------|
| `client.ts` | Low-level `api.get/post/put/delete` wrapper |
| `types.ts` | Shared types (re-exports `data.ts` types + `ApiError`, `AuthToken`, `PagedResult<T>`) |
| `hooks.ts` | React Query hooks for every backend endpoint |
| `fallback.ts` | Sample Smith-family data used when API is unavailable |
| `provider.tsx` | `<ApiProvider>` — mounts `QueryClientProvider` in `layout.tsx` |

## Environment variable

```
NEXT_PUBLIC_API_URL=http://localhost:8080   # default; set in .env.local
NEXT_PUBLIC_API_URL=                        # empty string → fallback mode (no fetch)
```

Set `NEXT_PUBLIC_API_URL=""` in `.env.local` to run the UI entirely against
sample data without any network traffic.

## Auth

The client reads `tb-auth-token` from `localStorage` and adds it as
`Authorization: Bearer <token>` on every request. No token → no auth header
(public endpoints still work).

## Fallback / dev mode

When `NEXT_PUBLIC_API_URL` is `""` or the backend returns an error, every hook
transparently returns data from `fallback.ts`, which sources from `TBD` in
`data.ts`. The UI continues to render with realistic sample data.

This is intentional during parallel development: the frontend and backend can
be built independently, with the UI always showing something sensible.

## Migration guide

Screens currently import `TBD` from `@/lib/data` directly. To migrate a screen
to live data:

1. Replace the direct `TBD.xxx` read with the corresponding hook:

```ts
// Before
import { TBD } from "@/lib/data";
const recipes = TBD.recipes;

// After
import { useRecipes } from "@/lib/api/hooks";
const { data: recipes, isLoading } = useRecipes();
```

2. Handle `isLoading` and `isError` states in the component.

3. Remove the `TBD` import if nothing else uses it.

Do NOT modify `src/lib/data.ts` — it is the canonical source of sample data
and is used by the fallback layer and existing tests.

## Available hooks

### Read

| Hook | Endpoint |
|------|----------|
| `useEvents(range?)` | `GET /v1/events?start=...&end=...` |
| `useMembers()` | `GET /v1/households/current/members` |
| `useRecipes()` | `GET /v1/recipes` |
| `useRecipe(id)` | `GET /v1/recipes/:id` |
| `useLists()` | `GET /v1/lists` |
| `useList(id)` | `GET /v1/lists/:id` |
| `useShopping()` | `GET /v1/shopping/current` |
| `useRoutines()` | `GET /v1/routines` |
| `useEquity(period?)` | `GET /v1/equity?period=...` |

### Mutations

| Hook | Description |
|------|-------------|
| `useToggleListItem()` | Mark a list item done/undone |
| `useToggleRoutineStep()` | Mark a routine step done/undone |
| `useToggleShoppingItem()` | Mark a shopping item done/undone |
| `useSetEvent()` | Create or update a calendar event |
| `useDeleteEvent()` | Delete a calendar event |

## Error shape

Non-2xx responses throw an `ApiError`:

```ts
interface ApiError {
  code: string;    // e.g. "NOT_FOUND"
  message: string; // human-readable
  status: number;  // HTTP status code
}
```
