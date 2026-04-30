# Tidyboard API Client

A thin fetch wrapper and React Query hooks for the Tidyboard REST backend.

## Files

| File | Purpose |
|------|---------|
| `client.ts` | Low-level `api.get/post/put/delete` wrapper |
| `types.ts` | Shared types (re-exports `data.ts` types + `ApiError`, `AuthToken`, `PagedResult<T>`) |
| `hooks.ts` | React Query hooks for every backend endpoint |
| `fallback.ts` | Empty compatibility values; production errors must not render sample data |
| `provider.tsx` | `<ApiProvider>` — mounts `QueryClientProvider` in `layout.tsx` |

## Environment variable

```
NEXT_PUBLIC_API_URL=http://localhost:8080   # default; set in .env.local
```

Do not set `NEXT_PUBLIC_API_URL` to an empty string for production builds.

## Auth

The client reads `tb-auth-token` from `localStorage` and adds it as
`Authorization: Bearer <token>` on every request. No token → no auth header
(public endpoints still work).

## Error handling

When the backend returns an error or cannot be reached, hooks surface the
React Query error. Screens should show a real error or empty state so backend
problems are visible and fixable.

## Live data guide

Production screens should read from the backend hooks directly:

1. Read the domain data with the corresponding hook:

```ts
import { useRecipes } from "@/lib/api/hooks";
const { data: recipes, isLoading } = useRecipes();
```

2. Handle `isLoading` and `isError` states in the component.

3. Keep `src/lib/data.ts` out of production route runtime imports.

Do not wire production routes to `src/lib/data.ts`; it is legacy fixture data
for tests and previews only.

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
