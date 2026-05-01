# AGENTS.md — autonomous-agent contract for this repo

This file is read by Claude Code, Codex, OpenCode and similar agents. It encodes the **non-negotiable rules** every PR (human or LLM) must satisfy.

## Coding standards

- **TDD is non-negotiable.** Write a failing test before implementation. No code without a test.
- **Real services in tests.** Postgres comes from the project's docker-compose / make harness. **Do not mock the database** — past incidents masked broken migrations.
- **Conventional commits.** `feat:` / `fix:` / `test:` / `docs:` / `refactor:` / `chore:`. Subject ≤ 72 chars.
- **Branch per issue.** Naming: `feat/<slug>` for features, `fix/<slug>` for bugs, `docs/<slug>` for documentation. Never push directly to `main`.
- **Never bypass hooks.** No `--no-verify`, no `--no-gpg-sign`. If a hook fails, fix the underlying problem.
- **Never force-push.** No `git push --force` or `--force-with-lease` to shared branches.
- **Never amend.** When a hook fails, the commit didn't happen. Fix, re-stage, create a NEW commit.
- **Domain enums.** `Member.role` is `"adult" | "child"` — never `"kid"`. Reflect this in DB, model, API, and UI.

## Build / test commands

- Go: `go build ./... && go vet ./... && go test ./... -count=1` (add `-tags=integration` for integration tests).
- Web: `cd web && npm run lint && npm run typecheck && npm test`.
- Coverage target: 80%+ on changed files.

## Auto-merge authority for `auto-implement` PRs

The autospec monitor agent has authority to admin-merge a PR with:

```
gh pr merge <#> --admin --squash --delete-branch
```

when **all** of the following are true:

1. The PR closes an issue carrying the `auto-implement` label.
2. The PR was opened from a `feat/*` or `fix/*` branch (never `main`).
3. **Required** CI checks are green. Slow optional checks (TeamCity, Chromatic, the long Web build) may remain pending — that is acceptable, those are pre-existing infrastructure debt, not regressions introduced by the PR.
4. The self-review subagent returned the literal token `LGTM`.
5. The PR's Primary smoke test (declared in the issue body) passed locally before merge.

**The monitor must not ask the user.** This authority is granted in advance.

## Hard rules for autonomous agents

- Never push to `main`.
- Never force-push.
- Never bypass hooks or signing.
- Never delete or close issues you didn't open.
- Never touch the umbrella/epic issue body — only edit it via the explicit decomposition step.
- Never run destructive git commands (`git reset --hard`, `git clean -fd`, `worktree remove --force` outside the agent's own worktree) without explicit user request.
- One issue at a time, sequential, in the monitor outer loop.

## Repository facts

- GitHub: `codingsandmore/tidyboard`.
- Default branch: `main`.
- Push to `main` triggers `.github/workflows/deploy-ec2.yml` → SSH to `98.91.94.149` → `docker compose up -d --build`. Every merged PR ships to prod.
- Worktrees live in `.worktrees/` (gitignored).
- Project memory (auto-loaded by Claude Code) lives in `~/.claude/projects/.../memory/MEMORY.md` — see for additional context.

## FEATURES.md is mandatory

Every autospec cycle that adds, modifies, or removes a user-visible feature MUST update `FEATURES.md` at the repo root. Before a child PR is mergeable, its diff must include either (a) a new row in the catalog if a new feature was introduced, or (b) updated coverage marks if existing features changed. The autospec implementer subagents are instructed to fail their PR if `FEATURES.md` was not touched alongside a feature change.

Spec: `docs/specs/2026-05-01-flintstones-design.md`, section G.

## Type-widening rule

When an autospec issue widens a shared TS type (adds an optional field), the test plan MUST cover every existing reader of the field — not just the new writer. The minimum bar: at least one Vitest fixture must reflect the live API shape (the new field present, old field absent or undefined). This is enforced by the Flintstones fixture (`web/src/test/fixtures/flintstones.ts`): any consumer that direct-accesses an optional field will crash that fixture's tests.

Spec: `docs/specs/2026-05-01-flintstones-design.md`, section G.

## Hourly rate privacy

`members.hourly_rate_cents_min`/`max` are private. Handlers MUST gate read access to (a) the rate-owner themselves, or (b) a household admin (role='owner' or 'admin'). Never log these values. Never include them in audit-log details.

Spec: `docs/specs/2026-05-01-fairplay-design.md`, section G + AGENTS.md additions.

## Bug-report token

`GITHUB_BUG_REPORT_TOKEN` env is required for the bug-report endpoint; the endpoint returns 503 with a clear message if the token is missing. The token is a fine-scoped PAT (`repo:issues:write` only). Do NOT log the token; do NOT include it in error envelopes.

Spec: `docs/specs/2026-05-01-fairplay-design.md`, section A + AGENTS.md additions.

## Time-tracking semantic

A member can have at most ONE open `chore_time_entries` row per chore at a time. Attempting to start a second open entry returns 409 with `code:"timer_already_running"`. Stopping an entry sets `ended_at = now()` server-side; the client doesn't propose the value.

Spec: `docs/specs/2026-05-01-fairplay-design.md`, section F + AGENTS.md additions.
