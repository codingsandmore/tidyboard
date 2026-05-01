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
