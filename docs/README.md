# Tidyboard Documentation

## Manuals

- [Agent Operator Manual](manuals/agent-operator-manual.md) - issue, PR, CI, merge, deployment, and documentation workflow for Codex agents.
- [User Manual](manuals/user-manual.md) - family-facing setup and usage guide for production Tidyboard.
- [Production Flow Verification](manuals/production-flow-verification.md) - automated and manual smoke checks for real-account family flows.

## Product Specs

- [Production Real Family Flow Design](superpowers/specs/2026-04-30-production-real-family-flow-design.md) - real account onboarding, live household data, kiosk, calendar details, member context, and shopping generation.
- [Local Production Mode Design](superpowers/specs/2026-04-30-local-production-mode-design.md) - fully local Docker Compose deployment with local auth, local storage, and local or remote Ollama.
- [Cozyla-Informed Family Hub Design](superpowers/specs/2026-04-30-cozyla-informed-family-hub-design.md) - competitor-informed kiosk, dashboard, task, meal, AI, and display-mode roadmap.
- [Event Countdowns Design](superpowers/specs/2026-04-27-event-countdowns-design.md) - kiosk and dashboard countdown widget for upcoming household events.

## Implementation Plans

- [Event Countdowns Implementation](superpowers/plans/2026-04-27-event-countdowns-implementation.md)
- [Chore Wallet Implementation](superpowers/plans/2026-04-26-chore-wallet-implementation.md)
- [Points Rewards Implementation](superpowers/plans/2026-04-26-points-rewards-implementation.md)

## Documentation Rule

Every issue and PR must answer whether the change affects the agent manual or user manual. If a manual change is needed, update it in the same PR. If no manual change is needed, state `Manuals checked; no update needed`.
