# Dark Mode

## How it works

1. **ThemeProvider** (`src/components/theme-provider.tsx`) — React context that
   exposes `{ theme, preference, setTheme, toggle }`.  
   - `preference` is `'light' | 'dark' | 'system'` (what the user picked).  
   - `theme` is the resolved `'light' | 'dark'` value.  
   - Persists preference to `localStorage` under key `tb-theme`. Choosing
     "System" removes the key so the OS setting is followed.  
   - Listens to `prefers-color-scheme` changes and updates automatically when
     preference is "system".

2. **NoFlashScript** — tiny inline `<script>` rendered in `<head>` before any
   CSS or React hydration. Reads `localStorage` and `prefers-color-scheme`
   synchronously and adds `class="dark"` to `<html>` if needed. Eliminates the
   theme flash (FOUC) on page load.

3. **html.dark CSS rules** (`src/app/globals.css`) — fallback `background` and
   `color` for the root `<body>` when dark mode is active, covering any page
   that does not have its own dark-prop wiring.

4. **Settings toggle** (`src/app/settings/page.tsx`) — "Appearance" segmented
   control at the top of `/settings` with Light / Dark / System options.

5. **Route wiring** — each real-app route that renders a screen with a `dark`
   prop reads `useTheme()` and passes `dark={theme === 'dark'}`.

## Screens fully wired for dark mode

| Screen | Route | Mechanism |
|---|---|---|
| DashKiosk | `/` (kiosk breakpoint) | `AdaptiveDashboard` passes `dark` prop |
| CalDay | `/calendar` (Day view) | route page passes `dark` prop |
| RoutineKid | `/routines` | route page passes `dark` prop |
| Equity | `/equity` (Equity view) | route page passes `dark` prop |
| RecipeDetail | `/recipes/[id]` | `RecipeDetailThemed` client wrapper passes `dark` prop |

## Screens that still render as light in dark mode (future work)

| Screen / Route | Reason |
|---|---|
| DashPhone (`/`, phone breakpoint) | `DashPhone` component has no `dark` prop |
| DashDesktop (`/`, desktop breakpoint) | `DashDesktop` component has no `dark` prop |
| CalWeek, CalMonth, CalAgenda | Calendar screen components have no `dark` prop |
| EquityScales | `EquityScales` component has no `dark` prop |
| Recipes list (`/recipes`) | `Recipes` component has no `dark` prop |
| Shopping (`/shopping`) | `ShoppingList` component has no `dark` prop |
| Meals (`/meals`) | Meals screen has no `dark` prop |
| Race (`/race`) | Race screen has no `dark` prop |
| Lock (`/lock`) | Lock screen has no `dark` prop |
| Onboarding (`/onboarding`) | Onboarding has no `dark` prop |
| Settings preview (`/settings/preview`) | Preview-only page, not wired |

The `html.dark body` CSS rule in `globals.css` provides a minimal dark
background/text fallback for all of the above so they are not blindingly
white in dark mode, even without component-level dark support.
