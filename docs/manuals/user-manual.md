# User Manual

This manual explains how a family uses Tidyboard in production. Production use starts with a real account and a real household. Demo data is not used on production routes.

## Account And Onboarding

Sign in with the configured account provider. After sign-in, Tidyboard checks whether your account belongs to a real household.

If you are not signed in, Tidyboard sends you to sign-in. If your signed-in account does not belong to a household yet, Tidyboard creates a real starter household and adult administrator member for that account so production routes have valid household context immediately. This is not demo data; it is persisted account data that can be edited in Settings and expanded through onboarding and member management.

Onboarding and Settings are where you refine the household and define the family roster. A complete setup includes a household name, household timezone, the signed-in adult's member profile, and a reviewed roster. The signed-in adult is an administrator for the household, and completion is based on persisted household and member data, not temporary screen state.

The family roster should include:

- Adult profiles for people who administer the household
- Child profiles for kids who use routines, chores, rewards, wallet, and calendar views
- Pet profiles for animals that need care schedules, shopping items, routines, or household reminders

Children can optionally receive a 4-6 digit kiosk PIN. Pets are first-class household profiles for calendar ownership, routines, lists, meal and shopping context, and care tasks such as walks, feeding, vet visits, grooming, and supplies. Pets do not sign in, enter PINs, receive wallet balances, redeem rewards, receive allowances, or administer settings.

## Home And Kiosk Dashboard

The home dashboard is the family command center. It shows household activity from the signed-in account and the selected household. If the account has no household yet, Tidyboard creates a real starter household/member during authenticated login so dashboard requests use valid household context instead of placeholder data.

Kiosk mode is intended for a shared tablet or wall display. `/dashboard/kiosk` and the kiosk entry render a true full-screen dashboard; they are not phone frames, tablet frames, scene previews, or static preview chrome. The kiosk uses the household's live members, calendar events, routines, lists, meal plan, recipes, and weather. If a section has no household data yet, it shows an empty state that tells the family what to add next. It should not invent events, meals, names, stars, chores, or schedules.

If the backend or a required API request fails, Tidyboard reports the error or shows the real empty state for that account. Production routes must not replace failures with demo households, sample events, sample recipes, or sample member data.

Selecting a member on the kiosk filters the schedule to that member while keeping shared household events visible. Members can use the kiosk flow to identify themselves before accessing member-scoped actions.

## Member Context

Some areas need to know which family member is active:

- Chores
- Rewards
- Wallet
- Member-specific calendar filtering
- Kid routine flows

If a signed-in account has no active member where one is required, Tidyboard should guide the family to select or unlock a member instead of showing a generic sign-in page.

Wallet and chores use this member-context flow directly. If the account is authenticated but no active member is selected, those pages show a household member selector or route to kiosk PIN unlock, then return to the original page. Adults can select their own profile and continue. Children are sent through kiosk PIN unlock and then returned to the wallet or chores page. Adult/admin wallet and chore management stays separate from child/member views. Pets are shown in planning and care areas only; they are not wallet, rewards, allowance, chores, or PIN targets.

## Calendar

The calendar shows real household events. Event rows and cards on dashboards and calendar views are clickable and open the detail view for that event. The detail view uses the event id, commonly through `/calendar?event=<event_id>`, and lets the family inspect the event title, start and end times, location, notes, repeat rule, assigned family members, and countdown visibility when present. When permitted, the family can edit or delete the event.

Missing event data is shown as an empty field, not sample content.

Calendar views may include day, week, month, and agenda layouts. Member filtering should show the events that apply to the selected person or household view.

## Routines

Routines help family members follow morning, evening, school, bedtime, pet care, and recurring household flows. Routine progress should be tied to the real member or care subject the routine belongs to.

## Tasks And Lists

Lists track household work such as errands, packing, chores, reminders, and shared tasks. Lists should use real household data and should not silently fill with sample items.

## Meals And Recipes

Recipes and meal planning help the family decide what to cook and what ingredients are needed. Recipe collections, cooking mode, and meal schedules should use the household's saved data.

The meal plan supports four meal categories per day: breakfast, lunch, dinner, and snack. Each cell on the weekly grid is labelled with its meal category so the family can scan a row at a time.

## Shopping And Pantry

Shopping lists are generated deterministically from the selected week's meal plan. The base generation path does not require AI or provider keys.

Generation follows these steps: read the selected week's meal plan, collect ingredients from planned recipes, compare against pantry staples and already-completed matching shopping items, then create or update the active shopping list with grouped quantities, units, aisles, and source recipe labels.

The shopping list view supports three grouping modes that change how the same items are arranged on screen, but never change generation:

- By aisle (default) — items grouped by produce, dairy, meat, pantry, etc., to follow a normal store layout.
- By recipe — items grouped under each recipe that contributed them. Items shared by two recipes appear under each one. Pantry staples land in their own bucket.
- No grouping — a single flat list in walking order for kitchens or stores where aisle names do not match.

Switching the grouping mode is an instant local view change and does not regenerate the list.

If required data is missing, Tidyboard explains what needs to be added instead of pretending a list was generated. Add recipes to the meal plan first, and make sure planned recipes include ingredient data. The generate button must not silently fail.

Pantry data belongs to the household. It should reflect real stored items, quantities, and needs. When pantry staples include quantity or expiration data, the shopping view shows pantry cues at the top of the list — for example, "Low on milk", "Yogurt expires in 2 days", or "Berries expired 1 day ago". Cues only render when the underlying data signals them, so the banner stays out of the way otherwise.

## Helper Inbox

The helper inbox is for approval-oriented tasks such as imported recipes, generated suggestions, or household changes that need an adult decision. Adults should be able to approve, edit, or reject items before they affect the household.

## Privacy And Display Modes

Tidyboard is designed for self-hosted or owner-controlled use. Household data should stay in the configured backend and database.

Shared displays should avoid exposing private member actions without the right active member context. Kiosk and lock flows are part of that boundary.

## Settings

Settings are where adults manage household details, family members, display preferences, integrations, AI options, notification behavior, and kiosk settings.

## Troubleshooting

If you see a sign-in screen, sign in with the real account provider.

If your household opens with only a starter adult profile, finish setup by editing household details and adding the rest of the family roster in onboarding or Settings.

If chores, wallet, or rewards ask for a member, select or unlock the family member who is using the device.

If a shopping list cannot be generated, add the missing meal plan, recipe, or pantry data and try again.

## Production Smoke Checks

After a production deployment, verify the real family flow with a real account:

- Sign-in routes unauthenticated users to sign-in and creates a real starter household/member for signed-in accounts that have no household yet.
- A household can be completed with adults, children, and at least one pet in the roster.
- The kiosk dashboard opens as a full-screen route with live household data and no preview frame.
- Calendar events open their detail view from event rows or cards.
- Chores and wallet use member selection or kiosk PIN unlock instead of a generic sign-in page for authenticated users.
- Shopping generation creates a list from planned recipes with ingredients and explains missing meal-plan or ingredient prerequisites.
