# Versioned production releases

> Execution: native, using superpowers:executing-plans.

**Goal:** Publish production only from a numbered, published GitHub Release.
**Spec:** Owner selected GitHub Release numbering in this chat, 8 November 2026; existing deployment runbook and repository safety rules apply.
**Architecture:** Disable Git-triggered deployment of main, retain branch previews, and keep automatic production domain assignment disabled. A release workflow checks the immutable release commit and successful main CI, creates a production build through Vercel REST, waits for READY and explicitly promotes it. Use Node built-ins only; machine credentials stay in GitHub Secrets.

## Constraints and review focus

- Accept only published, non-draft, non-prerelease versions vMAJOR.MINOR.PATCH.
- Refuse tags outside main, moved tags, and missing/pending/failed CI for that exact commit.
- Serialize production releases; failed or mismatched builds must never promote.
- Do not run migrations, reset, seed, or re-enable first-Admin setup.
- Never print API responses, tokens, activation URLs or application data.
- No new dependency, CLI installation or production release is needed to prepare this workflow.

## Task 1: Implement and verify release controls

- [x] Add failing Node tests for invalid release/commit/CI and failed or mismatched Vercel builds.
- [x] Add release verification/deployment script, workflow and main Git deployment exclusion.
- [x] Run Node tests and composer ci:check; review the complete diff.
- [ ] Update deployment runbook/manifest/memory, commit and open a PR from codex/versioned-production-releases.

## Task 2: Configure and hand off

- [x] Disable automatic production domain assignment through the Vercel plugin, preserving the current live deployment.
- [x] Verify settings and current production health.
- [ ] Prepare the exact GitHub Secret destination for owner-entered Vercel token; never retrieve or create the token in source.
- [ ] Merge only after review/checks. Do not publish a numbered release merely to test the configuration.

## Ledger

- Baseline origin/main d22bbe5. Working tree was clean; used a new non-default branch in place, keeping installed dependencies.
- On 8 November 2026 the owner confirmed production login. Input is manual, so persistent CSV storage was removed from current deployment scope. Weekly backup with one retained version was selected but is not configured.
- Vercel update autoAssignCustomDomains=false succeeded. Existing production alias remains unchanged. No database write or new deployment was requested by this change.
- RED/GREEN verified six release test groups. Full CI passed 404 backend/five skipped/3,724 assertions and 13 frontend tests before final platform workaround; final rerun follows the workaround. Review found no critical/important issue.
- Platform finding: promote can reset autoAssignCustomDomains (upstream issue #15095); added reassertion in finally, observed failing regression then green. No second reviewer needed for this test-covered fix.
- GitHub Secret form prepared for VERCEL_TOKEN; owner entry pending. No token read, generated or submitted by agent. YAML parsing library absent locally; no package installed; workflow syntax reviewed manually and remote GitHub validation remains part of PR checks.

- Final CI passed: 404 backend, five skipped, 3,727 assertions; 13 frontend tests; lint/TypeScript/Pint/PHPStan passed. Node syntax check and git diff --check passed. Current production /up returned 200. No release/deployment created.
