# WebSocket real-time updates

Tidyboard uses a single persistent WebSocket connection per browser tab to
deliver household events in real-time without polling.

## How it works

1. `WSProvider` (`src/lib/ws/ws-provider.tsx`) mounts inside `AuthProvider`
   and `ApiProvider` in `src/app/layout.tsx`.
2. When `auth.status === 'authenticated'` and a token exists, the provider
   opens a WebSocket to:
   ```
   ws(s)://<API_HOST>/v1/ws?token=<jwt>
   ```
   The URL is derived from `NEXT_PUBLIC_API_URL` by replacing `http://` with
   `ws://` and `https://` with `wss://`. Trailing slashes are stripped.
3. Each JSON frame from the server is parsed and used to:
   - Update `lastEvent` (exposed via `useWS()`)
   - Invalidate the relevant React Query cache keys

The connection is skipped entirely during SSR and in API fallback mode
(`NEXT_PUBLIC_API_URL=""`).

## Reconnect policy

| Attempt | Delay  |
|---------|--------|
| 1       | 1 s    |
| 2       | 2 s    |
| 3       | 4 s    |
| 4       | 8 s    |
| 5       | 16 s   |
| 6+      | 30 s   |

Backoff resets to 1 s after a successful open. Manual reconnect (via
`useWS().reconnect()`) also resets the backoff.

The socket is closed cleanly on component unmount and whenever the user logs
out (auth status transitions away from `'authenticated'`).

## Query invalidation map

| WS event type prefix | React Query keys invalidated                    |
|----------------------|-------------------------------------------------|
| `event.*`            | `['events']`                                    |
| `list.*`             | `['lists']`, `['lists', payload.list_id]`       |
| `list.item.*`        | `['lists']`, `['lists', payload.list_id]`       |
| `routine.*`          | `['routines']`                                  |
| `shopping.*`         | `['shopping']`                                  |

Unknown event types are ignored (no invalidation, no crash).

## Context API

```ts
import { useWS } from "@/lib/ws/ws-provider";

const { status, lastEvent, reconnect } = useWS();
```

| Field       | Type                                                    | Description                              |
|-------------|---------------------------------------------------------|------------------------------------------|
| `status`    | `'idle' \| 'connecting' \| 'open' \| 'closed' \| 'error'` | Current connection state                 |
| `lastEvent` | `WSEvent \| null`                                       | Most recently received event frame       |
| `reconnect` | `() => void`                                            | Force a reconnect with backoff reset     |

## Event frame shape

```ts
type WSEvent = {
  type: string;         // e.g. "event.created", "shopping.item.toggled"
  household_id: string;
  payload: unknown;
  timestamp: string;    // ISO 8601
};
```

## Fallback mode

When `NEXT_PUBLIC_API_URL=""` (demo / offline mode):

- `isApiFallbackMode()` returns `true`
- `WSProvider` skips the connection entirely — no WebSocket is created
- The Connection card in Settings is hidden
- All data comes from local mock data in `src/lib/data.ts`

## Connection status indicator

`src/app/settings/page.tsx` renders a **Connection** card:

| State              | Dot color | Label                                         |
|--------------------|-----------|-----------------------------------------------|
| `open`             | Green     | Live updates · Connected                      |
| `connecting`       | Yellow    | Reconnecting…                                 |
| `closed` / `error` | Red       | Offline · Updates will appear on refresh      |
| fallback mode      | —         | Card hidden entirely                          |
