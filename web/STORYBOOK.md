# Storybook & Chromatic Setup

## Running Storybook locally

```bash
cd web
npm run storybook
```

Opens at http://localhost:6006

## Building the static Storybook

```bash
cd web
npm run build-storybook
```

Output goes to `web/storybook-static/`.

## Chromatic Visual Regression CI

Chromatic captures screenshots of every story and diffs them against the
baseline on each pull request. The workflow (`.github/workflows/chromatic.yml`)
runs automatically on pushes to `main` and on all pull requests.

### Sign up for Chromatic

1. Go to https://www.chromatic.com and sign in with GitHub.
2. Click **Add project** and select the `tidyboard` repository.
3. Chromatic will display a **Project Token** — copy it.

### Add the GitHub secret (`CHROMATIC_PROJECT_TOKEN`)

1. Go to your GitHub repository → **Settings** → **Secrets and variables** →
   **Actions**.
2. Click **New repository secret**.
3. Name: `CHROMATIC_PROJECT_TOKEN`
4. Value: paste the token from Chromatic.
5. Save.

The CI workflow references this secret as
`${{ secrets.CHROMATIC_PROJECT_TOKEN }}`.

### TurboSnap — `onlyChanged: true`

The workflow uses `onlyChanged: true`, which enables **TurboSnap**. TurboSnap
analyses your component dependency graph and only re-captures stories whose
source files (or their dependencies) changed in the current commit. This can
cut snapshot counts — and therefore CI minutes — by 80 %+ on large story
suites. Stories unaffected by the diff reuse their last-known baseline snapshot
automatically.

### Review visual diffs

After a pull request is opened:

1. The **Chromatic** CI job runs and uploads story snapshots.
2. If pixel differences are detected, Chromatic marks the PR check as
   **pending review** in GitHub.
3. Click the Chromatic link in the PR checks to open the visual review UI.
4. Accept or reject each changed story. Accepted stories become the new
   baseline for future comparisons.
5. Once all changes are accepted (or denied), the PR check resolves.

### Bypass Chromatic for a single PR

Add `[skip chromatic]` anywhere in a commit message to skip the Chromatic run
for that push:

```bash
git commit -m "chore: tweak CSS comment [skip chromatic]"
```

Chromatic reads this token and exits early without uploading snapshots, saving
CI time for commits that only touch non-visual code (tests, docs, config).

### Updating the baseline

Merge the PR after accepting changes in Chromatic. The merged snapshots
become the new baseline for future PRs automatically.
