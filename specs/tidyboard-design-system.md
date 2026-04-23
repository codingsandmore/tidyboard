# Tidyboard — UI/UX Design System

**Version:** 1.0  
**Date:** April 12, 2026  
**Companion to:** tidyboard-spec.md

---

## 1. Design Philosophy

Tidyboard serves two fundamentally different audiences in the same app: **parents who need efficiency** and **kids who need delight**. The design must feel warm and approachable (not clinical), fun but not childish (parents use it too), and fast above all else (a family in the morning rush has zero patience for slow UI).

### Core Principles

1. **Glanceable from across the room** — on a wall-mounted tablet, the most important info (next event, current routine step, "what's for dinner") must be readable from 6 feet away
2. **Touch-first, big targets** — minimum 44×44px tap targets everywhere (Apple HIG). Kiosk mode uses 56px+ for kids
3. **Member colors are the primary visual language** — every family member gets a color. Events, tasks, avatars, and calendar entries use these colors. Users should be able to identify "whose thing is this?" at a glance without reading names
4. **Animations earn their keep** — every animation must serve a purpose: feedback (task completed), delight (celebration), or wayfinding (page transition). No decorative motion. All animations respect `prefers-reduced-motion`
5. **Dark and light modes are first-class** — not an afterthought. Both modes fully designed. Auto-switching by time of day (configurable)
6. **Progressive complexity** — the default view is simple. Power-user features (analytics, audit log, plugin config) are tucked away. Kids see a simpler UI than parents. The interface adapts to the role.

---

## 2. Design Toolchain

### 2.1 Design-to-Code Pipeline

```
Figma (design source of truth)
  │
  ├── Design Tokens (colors, spacing, typography, radii, shadows)
  │   └── Exported via Tokens Studio for Figma → JSON
  │       └── Transformed by Style Dictionary → Tailwind CSS theme config
  │
  ├── Component Library (buttons, cards, inputs, modals, etc.)
  │   └── 1:1 match with code components in shadcn/ui + custom components
  │
  └── Prototypes (interactive flows for usability testing)

Storybook (component development + documentation)
  │
  ├── Every React component has a story with all states and variants
  ├── Figma designs embedded via Storybook Design Addon
  ├── Accessibility checks via a11y addon
  └── Visual regression testing via Chromatic (optional)

React + Tailwind CSS (production code)
  │
  ├── shadcn/ui components (copy-paste, full ownership)
  ├── Radix UI primitives (accessible, unstyled)
  ├── Tailwind CSS with custom theme from design tokens
  └── CSS custom properties for runtime member-color theming
```

### 2.2 Tools

| Tool | Purpose | Why This One |
|---|---|---|
| **Figma** (free tier) | UI design, prototyping, component library | Industry standard. Free for open-source teams. Variables support for design tokens. |
| **Tokens Studio for Figma** | Design token management | Exports to JSON, syncs to GitHub. W3C Design Token spec compatible. 264K+ users. |
| **Style Dictionary** | Token transformation | Converts Figma token JSON → Tailwind CSS theme → CSS custom properties. Open source (Amazon). |
| **Storybook 8+** | Component development, documentation, testing | Isolate components, document variants, embed Figma designs, a11y checks. |
| **shadcn/ui** | Component library | Copy-paste into project. Full ownership. Built on Radix + Tailwind. No version lock-in. |
| **Radix UI** | Accessible primitives | WAI-ARIA compliant. Keyboard navigation. Focus management. Screen reader tested. |
| **Tailwind CSS 4** | Utility-first styling | Design tokens map directly to Tailwind config. Purges unused CSS. Fast. |
| **Lucide React** | Icons | 1000+ icons, tree-shakeable, consistent style, MIT licensed. |
| **Lottie (lottie-react)** | Complex animations | After Effects → JSON. Celebration animations, badge unlocks, confetti. |
| **canvas-confetti** | Particle effects | 6KB. Canvas-based. Fast on old tablets. Task completion celebrations. |
| **Framer Motion** | Micro-interactions | Page transitions, layout animations, gesture responses. Respects reduced-motion. |
| **Chromatic** (optional) | Visual regression testing | Catches unintended visual changes. Screenshots every story on every PR. |
| **Contrast checker** | Accessibility | WebAIM WCAG contrast checker. Integrated into Figma via Stark plugin. |

---

## 3. Design Tokens

Design tokens are the single source of truth for all visual decisions. They are defined in Figma, exported as JSON, and consumed by Tailwind CSS.

### 3.1 Color System

**Semantic color tokens** (not raw hex values):

```json
{
  "color": {
    "background": {
      "primary": { "light": "#FAFAF9", "dark": "#1C1917" },
      "secondary": { "light": "#F5F5F4", "dark": "#292524" },
      "surface": { "light": "#FFFFFF", "dark": "#1C1917" },
      "elevated": { "light": "#FFFFFF", "dark": "#292524" }
    },
    "text": {
      "primary": { "light": "#1C1917", "dark": "#FAFAF9" },
      "secondary": { "light": "#78716C", "dark": "#A8A29E" },
      "muted": { "light": "#A8A29E", "dark": "#78716C" }
    },
    "brand": {
      "primary": "#4F7942",
      "primary-hover": "#3D6233",
      "primary-foreground": "#FFFFFF",
      "secondary": "#D4A574",
      "secondary-hover": "#C4925E",
      "accent": "#7FB5B0",
      "destructive": "#DC2626",
      "warning": "#F59E0B",
      "success": "#16A34A"
    },
    "member": {
      "pool": [
        "#3B82F6", "#EF4444", "#22C55E", "#F59E0B",
        "#8B5CF6", "#EC4899", "#06B6D4", "#F97316",
        "#14B8A6", "#A855F7", "#6366F1", "#84CC16"
      ]
    }
  }
}
```

**Brand palette rationale:**
- **Primary (#4F7942 — Fern Green)**: warm, natural, trustworthy. Not corporate blue. Not startup neon. Feels like home.
- **Secondary (#D4A574 — Warm Tan)**: earthy complement. Used for highlights, secondary actions, warm accents.
- **Accent (#7FB5B0 — Sage Teal)**: calm, distinctive. Used for informational badges, links, selected states.
- **Member color pool**: 12 saturated, distinct colors. Each color passes WCAG AA contrast against both light and dark backgrounds. Assigned to family members sequentially; users can swap.

### 3.2 Typography

```json
{
  "typography": {
    "family": {
      "display": "Cal Sans, system-ui, sans-serif",
      "body": "Inter, system-ui, sans-serif",
      "mono": "JetBrains Mono, monospace"
    },
    "size": {
      "xs": "0.75rem",
      "sm": "0.875rem",
      "base": "1rem",
      "lg": "1.125rem",
      "xl": "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "kiosk-body": "1.25rem",
      "kiosk-heading": "2rem",
      "kiosk-glanceable": "3rem"
    },
    "weight": {
      "normal": 400,
      "medium": 500,
      "semibold": 600,
      "bold": 700
    }
  }
}
```

**Font rationale:**
- **Cal Sans** (display): warm, friendly display font. Free. Used for headings and dashboard widget titles. Approachable without being childish.
- **Inter** (body): the best screen-optimized body font. Variable weight. Free. Exceptional readability at small sizes.
- **Kiosk sizes**: dedicated larger scale for wall-mounted tablets. `kiosk-glanceable` (3rem) is the "readable from 6 feet" size for the clock, next event, and "what's for dinner" widget.

### 3.3 Spacing & Layout

```json
{
  "spacing": {
    "0": "0",
    "1": "0.25rem",
    "2": "0.5rem",
    "3": "0.75rem",
    "4": "1rem",
    "5": "1.25rem",
    "6": "1.5rem",
    "8": "2rem",
    "10": "2.5rem",
    "12": "3rem",
    "16": "4rem"
  },
  "radius": {
    "sm": "0.375rem",
    "md": "0.5rem",
    "lg": "0.75rem",
    "xl": "1rem",
    "2xl": "1.5rem",
    "full": "9999px"
  },
  "shadow": {
    "sm": "0 1px 2px rgba(0,0,0,0.05)",
    "md": "0 4px 6px rgba(0,0,0,0.07)",
    "lg": "0 10px 15px rgba(0,0,0,0.1)",
    "glow": "0 0 20px rgba(79,121,66,0.3)"
  }
}
```

**Layout grid:**
- 8px base grid. All spacing is a multiple of 8.
- Card padding: 16px (mobile), 24px (tablet), 32px (desktop)
- Minimum gap between interactive elements: 8px

---

## 4. Component Library

### 4.1 Core Components (shadcn/ui base, customized)

Every component exists in Storybook with the following documented states:

| Component | States | Kid-Mode Variant? |
|---|---|---|
| Button | default, hover, active, disabled, loading | Yes (larger, rounder) |
| Avatar | image, initials, color-ring (member color) | Yes (larger, animated border) |
| Card | default, elevated, interactive (hover), selected | — |
| Calendar Event | compact (list), expanded (detail), color-coded by member | Yes (icon-based, less text) |
| Routine Step | pending, active (pulsing), completed (checkmark + animation), skipped | Yes (large icon, big tap target) |
| Star Counter | static count, incrementing animation, reward-reachable glow | Yes (always animated) |
| Task Checkbox | unchecked, checked (with completion animation), disabled | Yes (56px tap target) |
| Timer | countdown, count-up, expired (red pulse), paused | Yes (large digits, color shift) |
| Notification Toast | info, success, warning, error, celebration | — |
| Modal/Dialog | default, fullscreen (mobile), destructive confirmation | — |
| Navigation | sidebar (desktop), bottom tabs (mobile), swipe (kiosk) | Yes (icon-only, no text labels) |
| Member Selector | avatar grid, single-select, multi-select | Yes (large avatars, name labels) |
| Recipe Card | thumbnail, title, time, rating, favorite toggle | — |
| Meal Slot | empty (droppable), filled (recipe card), quick-add | — |
| Shopping Item | unchecked, checked (strikethrough), aisle badge | — |

### 4.2 Celebration Components (unique to Tidyboard)

These are the delight layer. Not just visual polish — they're the dopamine mechanism that makes kids want to use the app.

| Component | Trigger | Animation |
|---|---|---|
| **Checkmark Burst** | Single task completed | Satisfying checkmark draws itself + small particle burst in member color (canvas-confetti) |
| **Confetti Cannon** | All daily tasks completed | Full-screen confetti explosion, 2-second duration, fades gracefully (canvas-confetti) |
| **Emoji Rain** | Streak milestone (3/7/14/30 day) | Emoji characters fall from top of screen, emoji type matches streak tier |
| **Trophy Animation** | Race won / leaderboard champion | Lottie animation: trophy rises from bottom, sparkles, member name appears |
| **Badge Unlock** | Achievement earned | Lottie animation: badge icon materializes with glow effect, text slides in |
| **Reward Unlock** | Stars redeemed for reward | Lottie animation: treasure chest opens / piñata bursts / balloon pop (randomized) |
| **Streak Fire** | Active streak (3+ days) | Persistent small flame icon next to member avatar, subtle flicker animation (CSS) |
| **Star Float** | Stars earned | Star icon floats up from the completed task to the star counter (Framer Motion) |

**Performance budget for animations:**
- Max concurrent animations: 2 (prevent GPU overload on old tablets)
- Max animation duration: 3 seconds (then graceful fade)
- All animations are CSS/canvas-based (no heavy video files)
- Lottie files must be under 100KB each
- Frame rate floor: 30fps on iPad Air 2 (test target device)
- `prefers-reduced-motion`: replace all animations with instant state changes (checkmark appears, no particle burst)

---

## 5. Layout Patterns

### 5.1 Responsive Breakpoints

| Breakpoint | Width | Layout | Primary Use |
|---|---|---|---|
| **phone** | <640px | Single column, bottom nav | Phone PWA |
| **tablet-portrait** | 640–1023px | Two-column, sidebar nav | Kiosk tablet (portrait mount) |
| **tablet-landscape** | 1024–1279px | Three-column, sidebar nav | Kiosk tablet (landscape mount) |
| **desktop** | ≥1280px | Three-column, sidebar nav, wider panels | Browser, Electron app |

### 5.2 Dashboard Layout (Kiosk Mode)

```
┌──────────────────────────────────────────┐
│  Clock + Date          ☀ 72°F    ⚡ Wifi │  ← Header bar: glanceable info
├──────────┬───────────────────────────────┤
│          │                               │
│  Member  │   Active View                 │
│  Avatars │   (Calendar / Routines /      │
│          │    Lists / Meal Plan /        │
│  [👤 Dad]│    Recipes / Races)           │
│  [👤 Mom]│                               │
│  [👤 Kid]│                               │
│  [👤 Kid]│                               │
│          │                               │
│          │                               │
│  --------│                               │
│  [⭐ 15] │                               │  ← Star count for selected member
│  [🔥 7d] │                               │  ← Active streak
│          │                               │
├──────────┴───────────────────────────────┤
│  [ Calendar ] [ Routines ] [ Lists ] ... │  ← Bottom nav (swipeable)
└──────────────────────────────────────────┘
```

### 5.3 Phone Layout

```
┌──────────────────────┐
│  ≡  Tidyboard  [👤]  │  ← Top bar: hamburger + avatar
├──────────────────────┤
│                      │
│   Active View        │
│   (full width,       │
│    scrollable)       │
│                      │
│                      │
├──────────────────────┤
│ 📅  ✅  📋  🍳  ⭐ │  ← Bottom tab bar (5 tabs)
└──────────────────────┘
```

### 5.4 Kid vs Adult View Differences

| Element | Adult View | Kid View (child role) |
|---|---|---|
| Navigation | Full sidebar/tabs with labels | Icon-only, fewer tabs (routines + stars + races) |
| Typography | Standard sizes | 20% larger body text |
| Tap targets | 44px minimum | 56px minimum |
| Calendar | Full calendar with all events | "Today's schedule" — simple list of their events only |
| Task checkbox | Standard checkbox | Large, satisfying toggle with sound |
| Settings | Full settings access | No settings access |
| Star balance | Compact counter | Large, prominent, always visible |
| Celebration animations | Standard | Enhanced (longer duration, more particles) |

---

## 6. Interaction Design

### 6.1 Micro-Interactions

| Interaction | Feedback |
|---|---|
| Tap button | Subtle scale-down (0.97) + background color shift. 150ms. |
| Complete task | Checkmark animation (300ms) → star float animation (500ms) → counter increment |
| Drag recipe to meal slot | Slot highlights with dashed border + member color. Drop: smooth settle animation. |
| Swipe between views (kiosk) | Horizontal slide with momentum. Adjacent view peeks at edge. |
| Pull to refresh | Custom Tidyboard refresh animation (leaf/plant growing), not browser default |
| Long-press on event | Haptic feedback (if supported) → context menu slides up from bottom |
| Error state | Shake animation (3 oscillations, 300ms) + red border flash |
| Loading state | Skeleton screens (pulsing placeholder shapes), never spinners. Content-shaped. |

### 6.2 Transitions

| Navigation | Transition |
|---|---|
| Between main views (calendar → lists) | Shared axis: horizontal slide, 200ms ease-out |
| Open detail (event → event detail) | Container transform: card expands to fill view |
| Open modal | Fade backdrop + slide-up modal, 250ms |
| Kiosk wake (wallpaper → dashboard) | Fade, 400ms |
| Member switch (kiosk) | Crossfade with member color accent pulse, 300ms |

### 6.3 Sound Design (Optional, Off by Default)

| Event | Sound |
|---|---|
| Task completed | Short, satisfying "pop" (like bubble wrap). 100ms. |
| All daily tasks done | Triumphant little fanfare. 1.5 seconds. |
| Star earned | Gentle chime. 200ms. |
| Timer expired | Soft alarm bell — not jarring (families, not factory workers). |
| Reward redeemed | Treasure chest / unwrapping sound. 1 second. |

All sounds: WAV format, <50KB each, stored locally, loaded on demand. Master volume configurable. Respects device mute.

---

## 7. Accessibility Requirements

Beyond WCAG 2.1 AA compliance (covered in the main spec), the design system enforces:

| Requirement | Implementation |
|---|---|
| Color contrast ≥4.5:1 (text), ≥3:1 (large text + UI) | Enforced via Tokens Studio + Stark plugin in Figma. All token pairs checked. |
| No color-only information | Every status uses color + icon + label. Member colors always paired with avatar/name. |
| Focus indicators | 2px offset ring in brand primary color. Visible on all interactive elements. Never suppressed. |
| Screen reader landmarks | `<nav>`, `<main>`, `<header>`, `<footer>`, `<aside>` on all layouts. ARIA labels on all icon-only buttons. |
| Touch target minimum | 44×44px (adults), 56×56px (kid mode). Enforced via Storybook check. |
| Reduced motion | All animations replaced with instant transitions. Checked in Storybook via `prefers-reduced-motion` decorator. |
| High contrast mode | Dedicated `high-contrast` theme token set. Borders on all elements. No transparency/blur. |
| Keyboard navigation | Every flow completable with Tab + Enter + Escape + Arrow keys. Custom focus management for modals and dropdowns (Radix handles this). |

---

## 8. Design Process & Workflow

### 8.1 Figma File Structure

```
Tidyboard Design System (Figma)
├── 🎨 Tokens              (color, typography, spacing, shadow variables)
├── 📦 Components           (all UI components with variants)
│   ├── Primitives         (button, input, checkbox, avatar, badge, tooltip)
│   ├── Patterns           (card, list item, calendar event, routine step)
│   ├── Layouts            (dashboard, phone, kiosk, onboarding wizard)
│   └── Celebrations       (confetti, emoji rain, trophy, badge unlock)
├── 📱 Screens              (complete screen designs per viewport)
│   ├── Phone
│   ├── Tablet Portrait
│   ├── Tablet Landscape
│   └── Desktop
├── 🧪 Prototypes           (interactive click-through for key flows)
│   ├── Onboarding
│   ├── Morning Routine (kid)
│   ├── Meal Plan + Shopping List
│   └── Recipe Import
└── 📐 Specs                (annotated screens for developer handoff)
```

### 8.2 Component Development Workflow

1. **Design in Figma** — define component with all variants, states, and responsive behavior
2. **Export tokens** — Tokens Studio → JSON → Style Dictionary → Tailwind config
3. **Build in code** — implement React component using shadcn/ui base + Tailwind + tokens
4. **Document in Storybook** — create stories for all states, embed Figma design, add a11y checks
5. **Review** — visual comparison: Storybook output vs Figma design. Flag any drift.
6. **Ship** — component available for use in all views

### 8.3 Design Review Checklist

Before any UI ships:

- [ ] Matches Figma design (pixel comparison at 1x)
- [ ] All states covered (default, hover, active, disabled, loading, error, empty)
- [ ] Works on all 4 breakpoints (phone, tablet-portrait, tablet-landscape, desktop)
- [ ] Dark mode looks correct (not just inverted — actually designed)
- [ ] Keyboard navigable (Tab order, Enter to activate, Escape to close)
- [ ] Screen reader announces correctly (tested with VoiceOver)
- [ ] `prefers-reduced-motion` removes all animations
- [ ] Storybook story exists with all variants documented
- [ ] Touch targets ≥44px (≥56px in kid mode)
- [ ] Color contrast passes WCAG AA (checked via Stark/axe-core)
- [ ] Loading state uses skeleton, not spinner
- [ ] Empty state is helpful, not just blank
