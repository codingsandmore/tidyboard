# User Manual

This manual explains how a family uses Tidyboard in production. Production use starts with a real account and a real household. Demo data is not used on production routes.

## Account And Onboarding

Sign in with the configured account provider. After sign-in, Tidyboard checks whether your account belongs to a completed household.

If your household is not ready yet, Tidyboard sends you to onboarding. Onboarding is where you create the household and define the family roster.

Onboarding requires a household name, household timezone, the signed-in adult's member profile, and a reviewed roster before the dashboard opens. The signed-in adult becomes an administrator for the household.

The family roster should include:

- Adults who can administer the household
- Children who use routines, chores, rewards, wallet, and calendar views
- Pets that need care schedules, shopping items, routines, or household reminders

Children can optionally receive a 4-6 digit kiosk PIN. Pets are household participants for planning and care. They do not sign in, enter PINs, receive wallet balances, redeem rewards, or administer settings.

## Home And Kiosk Dashboard

The home dashboard is the family command center. It shows household activity from the signed-in account and the selected household. If the account is signed in but the household or member profile is incomplete, Tidyboard returns to onboarding instead of showing placeholder data.

Kiosk mode is intended for a shared tablet or wall display. The kiosk dashboard fills the screen directly; it is not a phone or tablet simulation. It uses the household's live members, calendar events, routines, lists, meal plan, recipes, and weather. If a section has no household data yet, it shows an empty state that tells the family what to add.

Selecting a member on the kiosk filters the schedule to that member while keeping shared household events visible. Members can use the kiosk flow to identify themselves before accessing member-scoped actions.

## Member Context

Some areas need to know which family member is active:

- Chores
- Rewards
- Wallet
- Member-specific calendar filtering
- Kid routine flows

If a signed-in account has no active member where one is required, Tidyboard should guide the family to select or unlock a member instead of showing a generic sign-in page.

Wallet and chores use this member-context flow directly. Adults can select their own profile and continue. Children are sent through kiosk PIN unlock and then returned to the wallet or chores page. Pets are shown in planning and care areas only; they are not wallet, rewards, allowance, chores, or PIN targets.

## Calendar

The calendar shows real household events. Calendar items open a detail view where the family can inspect the event title, start and end times, location, notes, repeat rule, and assigned family members, and when permitted edit or delete it.

Calendar views may include day, week, month, and agenda layouts. Member filtering should show the events that apply to the selected person or household view.

## Routines

Routines help family members follow morning, evening, school, bedtime, pet care, and recurring household flows. Routine progress should be tied to the real member or care subject the routine belongs to.

## Tasks And Lists

Lists track household work such as errands, packing, chores, reminders, and shared tasks. Lists should use real household data and should not silently fill with sample items.

## Meals And Recipes

Recipes and meal planning help the family decide what to cook and what ingredients are needed. Recipe collections, cooking mode, and meal schedules should use the household's saved data.

## Shopping And Pantry

Shopping lists are generated deterministically from the selected week's meal plan. Tidyboard reads planned recipes, collects their ingredients, groups matching items by aisle, quantity, and unit, keeps source recipe labels on each item, adds pantry staples where configured, and preserves already-completed matching items when the list is regenerated.

If required data is missing, Tidyboard explains what needs to be added instead of pretending a list was generated. Add recipes to the meal plan first, and make sure planned recipes include ingredient data.

Pantry data belongs to the household. It should reflect real stored items, quantities, and needs.

## Helper Inbox

The helper inbox is for approval-oriented tasks such as imported recipes, generated suggestions, or household changes that need an adult decision. Adults should be able to approve, edit, or reject items before they affect the household.

## Privacy And Display Modes

Tidyboard is designed for self-hosted or owner-controlled use. Household data should stay in the configured backend and database.

Shared displays should avoid exposing private member actions without the right active member context. Kiosk and lock flows are part of that boundary.

## Settings

Settings are where adults manage household details, family members, display preferences, integrations, AI options, notification behavior, and kiosk settings.

## Troubleshooting

If you see a sign-in screen, sign in with the real account provider.

If you are redirected to onboarding, the account is authenticated but the household setup is incomplete.

If chores, wallet, or rewards ask for a member, select or unlock the family member who is using the device.

If a shopping list cannot be generated, add the missing meal plan, recipe, or pantry data and try again.
