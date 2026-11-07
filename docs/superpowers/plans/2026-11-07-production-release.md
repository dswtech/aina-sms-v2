# Production release implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task.

**Goal:** Release the reviewed application on the user's custom domain with an initialized production database and an owner-activated Admin.

**Architecture:** Keep production separate from preview. An explicitly enabled, short-lived CLI setup command runs only on the approved main commit, checks the direct database target, initializes an empty schema, and reuses the existing invitation command. Password entry remains with the owner.

**Tech Stack:** Laravel, PostgreSQL Neon, Vercel container, Brevo SMTP.

**Spec:** `docs/operations/vercel-deployment.md`, PRD authentication and release requirements, and the user's explicit production migration/invitation authorization in this chat.

## Global constraints

- No reset, demo seeder, copied preview account, hardcoded credential, or secret output.
- Preserve unrelated DNS records, main website and email service.
- Production setup is disabled by default, limited to 15 minutes, and bound to an exact approved commit.
- Source is delivered through PR #63; automated checks must pass before committing.

## Review focus

- Wrong environment, branch or commit must cause no database writes.
- Missing, expired or unbounded authorization must cause no database writes.
- A database target mismatch must stop before migration.
- An existing schema with pending migrations must stop for backup/operator review.
- Repeated starts must not create duplicate Admin invitations or passwords.

## Task 1: Production setup command

Files: `app/Console/Commands/PrepareProduction.php`, `config/deployment.php`, `deploy/vercel/start.sh`, `tests/Feature/Auth/ProductionSetupTest.php`.

- [x] Write and run failing guard and PostgreSQL integration tests.
- [x] Add the time/commit/environment/database/domain guards and direct-connection session lock.
- [x] Run only additive migration on an empty schema, then reuse `app:invite-first-admin`.
- [x] Verify guards on SQLite, and fresh migration/invitation/replay on an isolated PostgreSQL cluster.
- [x] Run complete CI and review the whole branch before commit.

## Task 2: Production release

Files: production environment settings, project domain and existing deployment runbook/memory.

- [x] Verify production Brevo login/key metadata after owner entry.
- [ ] Configure the exact CNAME returned by Vercel at the authoritative DNS provider; verify DNS and HTTPS.
- [ ] Confirm PR merge authorization against the concrete reviewed source.
- [ ] Bind production setup to the merged main commit, final APP_URL and verified direct database host/database metadata.
- [ ] Deploy production; inspect migration and invitation results without exposing secret URLs or activation tokens.
- [ ] Disable setup, verify provider delivery, hand password activation to the owner, and record actual limits.

## Execution ledger

- Baseline: `e187a21`, preview activation/login confirmed by owner. Production migration and matching Admin invitation explicitly authorized. Brevo credentials entered by owner; Exabytes nameservers and the exact Vercel CNAME are configured; Vercel reports misconfigured=false. HTTPS/application verification awaits the first production deployment.
- This initial production deployment does not close the separate UAT, persistent CSV archive, worker/scheduler, performance, backup/restore and monitoring gates.

- Task 1: complete. RED/GREEN guards and PostgreSQL integration verified; composer ci:check passed (404 backend passed, five skipped, 3,723 assertions; seven frontend tests). Separate PostgreSQL suite passed 42 tests/153 assertions. Fresh reviewer found no critical or important findings. No production write has run.
