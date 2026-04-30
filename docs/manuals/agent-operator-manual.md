# Agent Operator Manual

This manual is for Codex and subagents working the Unified Family OS roadmap. It defines the execution workflow for specs, GitHub issues, PRs, CI, merges, deployment, and documentation.

## Standing Documentation Rule

No issue is complete until the manuals have been checked.

Every issue and PR must answer: "Does this change affect the agent manual or user manual?"

- If yes, update the relevant manual in the same PR.
- If no, state `Manuals checked; no update needed` in the PR test plan or issue closure comment.
- The agent manual owns implementation process, issue workflow, PR policy, CI expectations, merge rules, deployment flow, and verification evidence.
- The user manual owns family-facing product behavior and setup flows.

## Roadmap Intent

Tidyboard production routes must serve a real household, not demo scaffolding. Work should move the app toward account-backed onboarding, live family data, kiosk-first operation, working calendar detail flows, member-scoped chores and wallet, deterministic shopping lists, and clear family-facing documentation.

## Issue Decomposition

Create issues that are small enough for one focused implementation branch.

Each issue should include:

- Problem statement
- User-facing outcome
- Technical scope
- Explicit exclusions
- Dependencies and unblocked follow-up issues
- Acceptance criteria
- Local verification commands
- Manual update decision

Prefer dependency-linked issues over broad umbrella work. A tracker issue should list child issues in delivery order and should be updated as PRs merge.

## LLM-Ready Issue Format

Use this structure for child issues:

```markdown
## Intent

## Scope

## Out of Scope

## Dependencies

## Acceptance Criteria

## Verification

## Documentation Gate
Manuals checked; update required or no update needed.
```

## Branch And Ownership

Use one branch per issue. Prefer isolated worktrees when the main workspace is dirty or multiple agents are active.

Subagents may be used for independent lanes. Give every subagent:

- The issue number and goal
- Read or write ownership
- Files or modules they may edit
- Verification expectations
- A reminder not to revert unrelated user or agent changes

The lead agent owns integration, final review, PR creation, CI, merge, deployment verification, and issue closure.

## Local Review

Before opening or updating a PR:

- Read the diff yourself.
- Check for placeholder data, stale comments, accidental generated artifacts, and unrelated churn.
- Run focused tests for changed code.
- Run broader tests or builds when shared layout, auth, routing, data contracts, or deployment behavior changes.
- Confirm manuals were updated or explicitly checked.

## Pull Requests

PRs should link the issue and include:

- Summary of user-visible and technical changes
- Test plan with commands and results
- Manual update decision
- Known risks or follow-up issues

Do not merge a PR before self-review and required checks pass.

## CI And Merge

After opening a PR:

- Refresh GitHub checks until they finish.
- If checks fail, inspect logs, fix the branch, and rerun.
- Web coverage in CI uses `npm run coverage`; keep it aligned with the forced Vitest exit reporter so the coverage job can finish and then enforce thresholds.
- If checks pass and branch protection allows it, merge the PR using the repo's normal merge strategy.
- Verify the default branch contains the merged commit.

## Production Deploy Verification

When a merged change affects production behavior and tests pass:

- Let the automatic deployment run when configured.
- If manual EC2 verification is the current deployment path, verify the deployed commit or image.
- Smoke test `/health`, `/ready`, and affected app routes.
- Record exact verification evidence in the PR or issue.

## Issue Closure Evidence

Close issues only after:

- The PR is merged.
- Required local and CI checks passed.
- Production deploy verification is complete when required.
- Manual updates are complete or explicitly not needed.
- The issue has a closure comment with PR, commit, test, deploy, and documentation evidence.
