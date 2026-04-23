# Tidyboard — Claude Design UI Specification

**Version:** 1.0  
**Date:** April 22, 2026  
**Purpose:** Complete brief for generating all Tidyboard UI screens using Claude Design, with handoff to Claude Code for implementation.  
**Companion docs:** tidyboard-spec.md, tidyboard-design-system.md

---

## 1. Design System Setup (Claude Design Onboarding)

Before creating any screens, onboard Claude Design with the Tidyboard design system. Paste or upload the following:

### 1.1 Brand Identity

- **Name:** Tidyboard
- **Tagline:** "The family dashboard you actually own."
- **Voice:** Warm, practical, approachable. Like a parent who also knows Docker.
- **Logo:** Text mark in Cal Sans, Fern Green (#4F7942). No icon yet — text only for v0.1.

### 1.2 Color Tokens

```
Brand:
  Primary:            #4F7942 (Fern Green — warm, natural, trustworthy)
  Primary Hover:      #3D6233
  Primary Foreground: #FFFFFF
  Secondary:          #D4A574 (Warm Tan)
  Accent:             #7FB5B0 (Sage Teal)
  Destructive:        #DC2626
  Warning:            #F59E0B
  Success:            #16A34A

Backgrounds (Light):
  Primary:    #FAFAF9
  Secondary:  #F5F5F4
  Surface:    #FFFFFF
  Elevated:   #FFFFFF

Backgrounds (Dark):
  Primary:    #1C1917
  Secondary:  #292524
  Surface:    #1C1917
  Elevated:   #292524

Text (Light):
  Primary:    #1C1917
  Secondary:  #78716C
  Muted:      #A8A29E

Text (Dark):
  Primary:    #FAFAF9
  Secondary:  #A8A29E
  Muted:      #78716C

Member Color Pool (12 colors, WCAG AA on both backgrounds):
  #3B82F6, #EF4444, #22C55E, #F59E0B,
  #8B5CF6, #EC4899, #06B6D4, #F97316,
  #14B8A6, #A855F7, #6366F1, #84CC16
```

### 1.3 Typography

```
Display (headings, dashboard titles): Cal Sans, system-ui fallback
Body (all text):                       Inter, system-ui fallback
Mono (code, technical):                JetBrains Mono, monospace

Sizes:
  Body:        1rem (16px)
  Small:       0.875rem (14px)
  Large:       1.125rem (18px)
  Heading 3:   1.5rem (24px)
  Heading 2:   1.875rem (30px)
  Heading 1:   2.25rem (36px)
  Kiosk Body:  1.25rem (20px)
  Kiosk Heading: 2rem (32px)
  Kiosk Glanceable: 3rem (48px) — readable from 6 feet away
```

### 1.4 Spacing & Radii

```
Base grid: 8px
Card padding: 16px (phone), 24px (tablet), 32px (desktop)
Button radius: 0.5rem (8px)
Card radius: 0.75rem (12px)
Avatar radius: 9999px (circle)
Input radius: 0.375rem (6px)
Shadow (cards): 0 4px 6px rgba(0,0,0,0.07)
```

### 1.5 Component Style

Use shadcn/ui component patterns. Cards with subtle borders (1px #E7E5E4 light, 1px #44403C dark). Buttons: solid primary (green), outline secondary, ghost tertiary. Touch targets minimum 44px (56px in kid mode). All interactive elements show visible focus ring (2px offset, primary color).

---

## 2. Screen Specifications

Generate each screen as an interactive prototype. Each specification includes the viewport, content, interactions, and design notes.

### 2.1 Onboarding Wizard (7 screens)

**Viewport:** Phone (390×844) — most likely first-use device. Also generate tablet (768×1024).

**Screen 1: Welcome**
- Tidyboard logo (text mark, Cal Sans, green)
- Tagline: "The family dashboard you actually own."
- Illustration: warm, friendly family scene (abstract/geometric, not photographic — we don't have art budget). Use a simple SVG arrangement of colored shapes suggesting a family.
- Single CTA button: "Get Started" (primary, full-width on phone)
- Subtle footer: "Already have an account? Sign in"

**Screen 2: Create Account**
- Header: "Create your account"
- Form: Email input, Password input (with show/hide toggle, strength indicator), Confirm password
- "Or continue with" divider → Google and Apple OAuth buttons (if configured)
- CTA: "Create Account" (primary)
- Footer: "Already have an account? Sign in"
- Validation: inline errors below each field, not alerts

**Screen 3: Name Your Household**
- Header: "What should we call your family?"
- Single text input with placeholder "The Smith Family"
- Helper text: "This appears at the top of your dashboard. You can change it later."
- CTA: "Continue" (primary)

**Screen 4: Add Yourself**
- Header: "Tell us about you"
- Avatar: large circle (80px) with upload button overlay. Default: first initial on colored background.
- Name input, Display Name input (shorter, for dashboard)
- Color picker: 12 swatches from the member color pool. Tap to select. Selected = checkmark overlay.
- CTA: "Continue" (primary)

**Screen 5: Add Family Members**
- Header: "Add your family" with count badge ("2 members")
- List of added members (cards with avatar, name, role badge)
- "+ Add family member" button → expands inline form:
  - Name, Role toggle (Adult / Child), Email (adults) or PIN setup (children, 4-6 digit with number pad)
  - Color picker (auto-selects next unused color)
  - "Add" button
- "Skip for now" text link below
- CTA: "Continue" (primary)

**Screen 6: Connect Calendar (Optional)**
- Header: "Sync your existing calendar?"
- Subtext: "Your events will appear on the family dashboard."
- Google Calendar button (Google logo + "Connect Google Calendar") — large, prominent
- "Add iCal URL" text link (for other calendars)
- "Skip for now" text link
- This is the magic moment — if they connect, events appear instantly on the next screen

**Screen 7: Dashboard Landing**
- Header: "You're all set!" with confetti animation (canvas-confetti burst)
- If calendar connected: show today's events in a daily view card
- If no calendar: empty state card: "Your dashboard is ready. Create your first event or connect a calendar to get started." with two inline action buttons.
- After 2 seconds, transitions to the full dashboard view

### 2.2 Dashboard — Kiosk Tablet Layout (768×1024, portrait)

This is the primary view. Designed for a wall-mounted or counter tablet.

**Layout:**
```
┌──────────────────────────────────────┐
│ 10:34 AM  Thursday, April 22     72°F│  ← Glanceable header
├──────┬───────────────────────────────┤
│      │                               │
│ 👤Dad│  [ Daily Schedule View ]      │
│      │                               │
│ 👤Mom│  8:00  Morning standup (Dad)  │
│      │  9:00  Dentist - Jackson (Mom)│
│ 👤 J │  3:30  Soccer practice (J+E) │
│      │  5:00  Piano lesson (E)       │
│ 👤 E │  6:30  Family dinner          │
│      │                               │
│ ⭐15 │  ─────────────────            │
│ 🔥7d │  What's for dinner?           │
│      │  🍝 Spaghetti Carbonara       │
│      │  (tap for recipe)             │
│      │                               │
├──────┴───────────────────────────────┤
│ 📅 Calendar  ✅ Routines  📋 Lists  │
│ 🍳 Meals     ⭐ Stars     🏁 Races  │
└──────────────────────────────────────┘
```

**Design notes:**
- Clock + date in `kiosk-glanceable` size (3rem / 48px)
- Member avatars in left sidebar with colored rings (member color, 3px border). Selected member = elevated with glow shadow.
- Star count and streak flame below member avatars.
- Events color-coded by member. Multi-member events show stacked color dots.
- "What's for dinner?" widget pulls from today's meal plan.
- Bottom nav: 6 tabs with icons. Active tab = primary color underline + filled icon. Inactive = muted.
- Swipe left/right between tabs.

### 2.3 Dashboard — Phone Layout (390×844)

**Layout:**
```
┌────────────────────────┐
│ ≡  Tidyboard      👤  │  ← Top bar
├────────────────────────┤
│ Thursday, April 22     │
│                        │
│ ┌────────────────────┐ │
│ │ 🔵 Morning standup │ │  ← Dad's event (blue)
│ │ 8:00 - 8:30 AM     │ │
│ └────────────────────┘ │
│ ┌────────────────────┐ │
│ │ 🔴 Dentist - Jackson│ │  ← Mom's event (red)
│ │ 9:00 - 10:00 AM    │ │
│ └────────────────────┘ │
│ ...                    │
│                        │
│ 🍝 Dinner: Carbonara  │  ← Compact meal widget
│                        │
├────────────────────────┤
│ 📅  ✅  📋  🍳  ⭐   │  ← Bottom nav (5 tabs)
└────────────────────────┘
```

### 2.4 Dashboard — Desktop Layout (1440×900)

Three-column layout: member sidebar (200px) + main content (flexible) + today's summary (320px right panel with weather, meal plan, upcoming tasks).

### 2.5 Calendar Views (4 screens)

**Daily view** (default on kiosk): Column-per-member layout. Each member = one column, their color as header background. Events as colored blocks positioned by time. Current time = red horizontal line.

**Weekly view:** 7-column grid (Mon–Sun), events as compact pills. Color = member. Tap to expand.

**Monthly view:** Traditional calendar grid. Days with events show colored dots (one per member who has events). Tap day to drill into daily view.

**Agenda view:** Scrollable list, grouped by date. Each event = card with member avatar, time, title, location. Search bar at top.

### 2.6 Event Detail / Create Modal

**Slide-up modal (phone) / centered dialog (tablet/desktop):**
- Title input (large, prominent)
- Date + time pickers (start and end)
- All-day toggle
- Calendar selector dropdown (which calendar this event belongs to)
- Member assignment (avatar multi-select — tap avatars to toggle)
- Location input (optional)
- Notes textarea (optional, supports markdown)
- Recurrence selector ("Does not repeat" dropdown → daily/weekly/monthly/yearly/custom RRULE builder)
- Reminder selector (none / 5min / 15min / 30min / 1hr / 1day)
- Conflict warning (if overlapping): yellow banner with conflict details
- Delete button (destructive, bottom of modal, with confirmation dialog)
- Cancel / Save buttons (footer)

### 2.7 Routine View (Kid-Facing)

**Viewport:** Tablet kiosk — this is what a 6-year-old sees.

- Large heading: "Jackson's Morning Routine" in member color
- Progress bar (green fill, showing 3/6 steps done)
- Countdown timer: "15 minutes left" (green → yellow → red)
- Step list: large cards (min 56px height for tap targets)
  - Each step: icon (emoji or Lucide) + step name + estimated time
  - Completed steps: checkmark overlay, muted color, slide-left animation
  - Active step: highlighted with pulsing border in member color, slightly larger
  - Future steps: visible but muted
- Tap a step → satisfying checkmark animation (300ms) → star float animation (star icon floats from step to star counter in sidebar) → step slides to "completed" position
- All steps done → full-screen celebration (confetti cannon, 2 seconds)

### 2.8 Recipe Import Flow

**Screen 1: Import**
- Header: "Add a Recipe"
- Large URL input: "Paste a recipe URL"
- Helper text: "Works with 630+ recipe websites"
- "Import" button (primary)
- Dividers: "or" → "Enter manually" button (secondary), "Import from file" button (ghost)

**Screen 2: Preview (loading → loaded)**
- Loading: skeleton screen shaped like a recipe card (image placeholder, text lines, ingredient lines)
- Loaded: full recipe preview — image (downloaded), title, source domain badge, prep/cook/total time, servings, ingredients list, steps list
- All fields editable (tap to edit)
- Tags input (comma-separated)
- Rating (1-5 stars, tap to set)
- Notes textarea ("Personal notes — only your family sees these")
- Footer: "Save to Collection" (primary) / "Discard" (ghost)

### 2.9 Recipe Detail View

- Hero image (full-width, 40% viewport height on tablet)
- Title (Cal Sans, heading 1)
- Meta row: ⏱ 30 min prep · 🍳 45 min cook · 🍽 Serves 4 · ⭐ 4/5
- Serving scaler: stepper control (- 4 servings +) — ingredients update proportionally with animation
- Tabs: Ingredients | Steps | Nutrition
- **Ingredients tab:** grouped list with amounts (bold), units, names. Optional items in muted text.
- **Steps tab:** numbered list, each step = card with text + optional timer button. Tap timer → inline countdown starts.
- **Cooking mode button** (bottom, full-width): "Start Cooking" → full-screen, step-by-step view with large text, swipe navigation, keep-awake, timer alerts.

### 2.10 Meal Plan Weekly Grid

```
           Mon    Tue    Wed    Thu    Fri    Sat    Sun
Breakfast  [+]    🥣     [+]    🥣     [+]    🥞     [+]
Lunch      🥗     [+]    🥪     [+]    🥗     [+]    🍕
Dinner     🍝     🌮     🍗     🍣     🍕     [+]    🍲
Snack      [+]    [+]    [+]    [+]    [+]    [+]    [+]
```

- Each filled slot: recipe thumbnail (small, 48px), recipe name truncated
- Empty slots: "+" button with dashed border
- Tap filled slot → recipe detail modal
- Tap "+" → recipe picker (search your collection, or quick-add text entry)
- Drag recipes between slots to rearrange
- Top action bar: "Generate Shopping List" (primary), "Copy Last Week" (secondary), "Save as Template" (ghost)

### 2.11 Shopping List

- Header: "Shopping List — Week of April 20"
- Source badge: "Generated from 8 recipes"
- Items grouped by aisle/category (Produce, Dairy, Meat, Pantry, Frozen, Other)
- Each category = collapsible section with item count badge
- Each item: checkbox + amount + unit + name. Checked = strikethrough + muted, moves to bottom of section.
- "Pantry Staples" section at bottom (recurring items, different visual treatment — dotted left border)
- Manual add: floating "+" button → inline text input at top
- Swipe-left on item → delete

### 2.12 Equity Dashboard (Adults Only)

- Header: "Household Balance" with date range picker (This Week / This Month / Last 3 Months)
- **Ownership pie chart:** domains distributed between adults. Each adult's slice in their member color. Center text: "12 domains total"
- **Time balance bar chart:** two horizontal stacked bars (one per adult), showing cognitive (darker shade) vs physical (lighter shade) hours. Labeled: "Mom: 18h (12h cognitive, 6h physical)" vs "Dad: 14h (5h cognitive, 9h physical)"
- **Load indicator:** traffic light per adult — green dot "Balanced", yellow "Watch", red "Unbalanced (carrying 72%)" with suggested rebalance link
- **Personal time tracker:** two progress rings (one per adult) showing hours of personal time vs goal. "Mom: 2h of 5h goal" / "Dad: 6h of 5h goal"
- **Trend line:** rolling 4-week chart, one line per adult, showing total hours contributed. Lines should converge toward balance.
- **Domain list:** expandable cards, each showing domain name, owner avatar, hours this period, task count. Tap to drill into task-level detail.
- **Tone:** no red/green judgmental coloring on the bars themselves. Use neutral member colors. The traffic light indicator is the only place with judgment, and it's configurable.

### 2.13 Gamification — Race View

- Header: "Kitchen Clean-Up Race!" with countdown timer
- Progress track: horizontal bar for each participant (member color), items completed as filled segments
- Real-time position indicators (animated as items complete)
- Race items: checklist below the track (shared across all participants — whoever does it first)
- Winner animation: trophy + confetti when someone completes all items

### 2.14 Kiosk Lock Screen / Wallpaper

- Full-screen photo slideshow (crossfade, 30-second rotation)
- Clock overlay (large, kiosk-glanceable size, semi-transparent background)
- "Tap to unlock" hint at bottom
- Tap → member avatar grid (large circles, 80px each, names below) → PIN entry for selected member

### 2.15 Settings Screen

- Grouped list layout (iOS Settings style)
- Groups: Household, Members, Calendars, Notifications, Display, AI, Backup, About
- Each group expands to sub-settings
- Destructive actions (delete household, delete member) are red and require double confirmation

### 2.16 Dark Mode Variants

Generate dark mode versions of: Dashboard (kiosk), Calendar daily view, Recipe detail, Equity dashboard, Routine view (kid-facing). Use the dark background tokens. Ensure all text passes WCAG AA contrast. Member colors should remain vibrant on dark backgrounds.

---

## 3. Interactive Prototype Flows

Generate these as linked interactive prototypes in Claude Design:

### Flow 1: Morning Routine (Kid)
Kiosk lock screen → tap → select kid avatar → enter PIN → routine view → complete 3 steps (with animations) → all done celebration → return to dashboard

### Flow 2: Recipe Import + Meal Plan
Dashboard → Meals tab → "Add Recipe" → paste URL → preview → save → meal plan grid → drag recipe to Wednesday dinner → "Generate Shopping List" → view shopping list

### Flow 3: Onboarding
Welcome → Create Account → Name Household → Add Self → Add 2 Kids → Connect Google Calendar → Dashboard with events

### Flow 4: Equity Check-In
Dashboard → (adult user) → hamburger menu → "Household Balance" → view pie chart → drill into "Meals & Groceries" domain → see task detail → tap "Reassign" → confirm

---

## 4. Export & Handoff

After finalizing each screen in Claude Design:

1. **Export as handoff bundle** → pass to Claude Code for React + Tailwind implementation
2. **Export key screens as PDF** → include in docs/design/ for contributor reference
3. **Export interactive prototypes as HTML** → host on tidyboard.dev/preview for user testing before launch
4. **Record each flow as a video/GIF** → use in README, marketing site, and Product Hunt launch

---

## 5. Design Priority Order

Generate screens in this order (matches implementation sprints):

| Priority | Screens | Sprint |
|---|---|---|
| 1 | Onboarding wizard (7 screens), Dashboard kiosk, Dashboard phone | Sprint 0-1 |
| 2 | Calendar views (daily, weekly, monthly, agenda), Event modal | Sprint 1 |
| 3 | Routine view (kid-facing), List view, Kiosk lock screen | Sprint 2 |
| 4 | Recipe import flow, Recipe detail, Meal plan grid, Shopping list | Sprint 3 |
| 5 | Equity dashboard, Settings, Dark mode variants | Sprint 3-4 |
| 6 | Race view, Gamification screens | Sprint 4 (v0.2 prep) |
| 7 | Marketing site (tidyboard.dev) landing page | Sprint 5 |

---

## 6. Claude Design Prompts (Ready to Paste)

Use these prompts in Claude Design to generate each screen. Each prompt references this document's tokens and specifications.

### Prompt 1: Onboarding Welcome Screen
```
Design a welcome screen for "Tidyboard", an open-source family dashboard app.

Brand: Primary color #4F7942 (Fern Green), secondary #D4A574, accent #7FB5B0.
Font: Cal Sans for the logo/heading, Inter for body text.
Background: #FAFAF9 (warm off-white).

Layout (phone, 390×844):
- Tidyboard logo in Cal Sans, centered, green
- Tagline below: "The family dashboard you actually own." in Inter, muted text color #78716C
- Friendly abstract illustration in the center (geometric shapes in brand colors suggesting a family — circles for people, rectangles for a calendar grid)
- Full-width primary button: "Get Started" — #4F7942 background, white text, 0.5rem radius, 48px height
- Text link below button: "Already have an account? Sign in" in accent color #7FB5B0

Vibe: warm, inviting, not corporate. This is a family product, not enterprise software.
```

### Prompt 2: Kiosk Dashboard
```
Design a family dashboard for a wall-mounted tablet (768×1024 portrait).

This is the primary view families see all day. It must be glanceable from 6 feet away.

Brand colors: Primary #4F7942, backgrounds #FAFAF9/#FFFFFF.
Fonts: Cal Sans for headings, Inter for body.

Layout:
- Top bar: Large clock (48px, Cal Sans) + date + weather icon with temp
- Left sidebar (120px): 4 family member avatars stacked vertically, each with colored ring border (blue #3B82F6, red #EF4444, green #22C55E, yellow #F59E0B). Below avatars: star count "⭐ 15" and streak "🔥 7d" for selected member.
- Main area: Today's schedule as a timeline. Events are cards with left color border matching the member(s). Show 5 events: "Morning standup" (blue), "Dentist - Jackson" (red), "Soccer practice" (green+yellow), "Piano lesson" (yellow), "Family dinner" (all colors).
- Below timeline: "What's for dinner?" widget showing recipe name + small thumbnail.
- Bottom navigation: 6 icon tabs — Calendar, Routines, Lists, Meals, Stars, Races. Active tab has green underline.

The selected member (first one) should have a subtle glow/elevation on their avatar.
Make it feel like a smart home display, not a web app. Warm, lived-in, not clinical.
```

### Prompt 3: Kid's Routine View
```
Design a morning routine checklist for a 6-year-old child on a tablet (768×1024).

The child's name is Jackson, color is green #22C55E.

Header: "Jackson's Morning Routine" in green, Cal Sans, 32px.
Below: progress bar (3 of 6 complete, green fill on light gray track).
Below: countdown "15 minutes left" in yellow/orange (getting close to deadline).

Steps (large cards, minimum 56px height, generous padding):
1. ✅ Make bed (completed — muted, checkmark, strikethrough)
2. ✅ Brush teeth (completed)
3. ✅ Get dressed (completed)
4. 🟢 Eat breakfast (ACTIVE — pulsing green border, slightly larger, "current step" indicator)
5. ○ Pack school bag (pending — visible but muted)
6. ○ Put shoes on (pending)

Each step has: emoji icon on left, step name in large text (20px), estimated time badge on right ("5 min").

Bottom: star counter "⭐ 15 stars" with the number in green.

This must be usable by a child who can't read well — icons are the primary wayfinding. Touch targets are 56px minimum. Everything is big, clear, and rewarding.
```

*Additional prompts for each screen follow the same pattern — reference the brand tokens, specify exact layout, describe the interaction state, and set the emotional tone.*
