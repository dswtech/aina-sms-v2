# Basic production monitoring

> Execute natively with superpowers:executing-plans; one final independent review.

**Goal:** Detect production access failures and use the owner's existing GitHub Actions failure notifications.
**Spec:** Owner accepted basic monitoring in this chat; operational scope follows docs/operations/vercel-deployment.md. Worker/scheduler and backup remain postponed.
**Architecture:** GitHub Actions on main runs GET-only HTTPS probes every approximately 15 minutes, off the hour. Node built-ins check /up and /login, with a bounded timeout and one retry after 10 seconds. A persistent failure exits nonzero and produces a sanitized summary. No package, secret, authenticated session, business-data mutation, deployment or paid service is needed. Laravel may create temporary anonymous sessions for /login.

## Constraints and review focus

- Never follow redirects or disable TLS validation; a wrong/login-protection page must fail.
- Expect HTTP 200 and the known Laravel health or Inertia login marker.
- Never record response bodies, exception messages, cookies or tokens in public workflow logs.
- Failed probes retry once; successful paths are not needlessly retried.
- GitHub scheduling is best effort, may be delayed, and public-repo schedules disable after 60 days without activity. This is not an uptime SLA or an authenticated/database functional check.
- Other routes' HTTP 500 errors still require Vercel log review. This task does not add secret-bearing log export.

## Task 1: Monitor and regression tests

- [x] Write failing tests for health success, HTTP errors, redirects, unexpected pages, network/timeouts and retry/recovery.
- [x] Implement the Node monitor and scheduled/manual workflow; run regression tests and full CI.
- [x] Verify read-only probes against production and perform one independent review.
- [ ] Update operations docs/manifest/memory, commit and deliver through a PR; activate the authorized monitoring after checks.

## Task 2: Verify activation

- [x] Verify owner GitHub Actions notifications already use Email (Failed workflows only); do not change global preferences.
- [ ] Merge reviewed monitoring without publishing an application release, dispatch a real read-only check and confirm it succeeds.
- [ ] Verify production alias is unchanged and record remaining notification/SLA limitations.

## Ledger

- Baseline fe493bf. Paused worker/backup changes saved in named Git stash and a patch outside the repository; monitoring branch excludes daemons.
- Initial Vercel runtime-errors query found no clusters in the last hour. This is a bounded provider result, not proof every application route is error-free.
- Notification email settings verified in UI; actual delivery of a failure email has not been tested.

- Four probe regression groups verified RED/GREEN. Full composer ci:check passed: 404 backend, five skipped, 3,722 assertions; 17 frontend tests. Independent review found no critical/important issues. Node syntax and diff checks passed. Report wording clarified that Laravel may create temporary anonymous sessions; it does not imply business-data mutation.
