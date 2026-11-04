# Phase 6 Accessibility Fixes Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task, with failing browser regressions before behavior changes.

**Goal:** Close the ten findings in the [4 November audit](accessibility-responsive-qa-2026-11-04.md).

**Architecture:** Keep the existing React/Inertia/Radix components and visual identity. Use Radix menu radio items for preferences and menu items for notifications; retain the existing dropdowns rather than add a popover dependency. Restore dialog focus explicitly where opening is controlled by page state. Correct combobox semantics at the shared component.

**Tech Stack:** Existing Laravel, React, TypeScript, Tailwind, Radix, and installed `playwright-cli`; no package changes.

**Spec:** The audit above and canonical PRD/ADR-003. This is a bugfix continuation, not a new feature or visual redesign.

**Tambahan pengguna:** Badge tujuh tahap transaksi berwarna konsisten pada Pelanggan, Transaksi, dashboard, dan drilldown Analisis. Pertahankan nama tahap; gunakan satu `StageBadge` bersama dengan palet terang/gelap yang memenuhi kontras teks biasa. Test membuktikan ketujuh tahap berbeda warna dan memenuhi 4,5:1 pada kedua tema.

## Global constraints

- No `.env` reads or changes, new packages, migration, seeder, or business-data writes.
- Tests exercise actual built components with synthetic Inertia props and intercepted responses. Local app serves assets; no account is required.
- Work on `codex/phase-6-accessibility-fixes` from merged PR #22 (`ba26af3`). Conventional Commit and PR after CI/build/browser checks pass.

## Review focus

- Keyboard preferences must remain usable after selection and Escape must restore the trigger.
- Long history must not put the initial dialog focus outside its visible area.
- Empty combobox search must not reference a nonexistent active option; Escape inside another dialog must close only the combobox.
- Larger touch targets must fit 390px menus without clipping.
- Validation IDs must refer to rendered errors and disappear when errors clear.

## Tasks

### 1. Browser regression coverage

- [x] Add `tests/Browser/accessibility.js`, runnable using `playwright-cli -s=aina-a11y run-code --filename tests/Browser/accessibility.js` after opening the local app. Intercept fixture documents and all mutation requests; keep real assets/components.
- [x] Record failing assertions for preferences and notifications by keyboard, mobile contact names, long-detail focus return, contrast, password toggle, combobox active/empty/Escape, touch targets, search label, validation associations, and main landmarks.

### 2. Shared interaction fixes

- [x] Preferences in `components/user-menu-content.tsx` and `components/color-picker.tsx`: Radix radio groups/items, retain selected-state styling and keep menu open on selection. Notifications: `DropdownMenuItem asChild` for each item, retaining its existing read/navigation handler.
- [x] `pages/customers/index.tsx`: name mobile contact links, label search, focus visible dialog heading on open, and return to the opening Detail button on dismissal without interfering with follow-on dialogs.
- [x] `components/password-input.tsx` and `pages/auth/login.tsx`: natural Tab order and reachable toggle.
- [x] `components/ui/combobox.tsx`: input combobox semantics, active option IDs, listbox relationship, empty results, focus styling, and Escape isolation. Tab must leave/close the panel without trapping focus.
- [x] Run browser regressions after building; failures must identify actual component behavior, not source text.

### 3. Visual and semantic corrections

- [x] Darken light green/orange/teal primary pairs to pass 4.5:1 with white; check all light/dark pairs through the rendered UI.
- [x] Enforce minimum 44px touch dimensions on shared input/button/menu/select/checkbox/dialog/sheet controls and known page/header overrides. Preserve a compact checkbox/swatch visual inside a larger hit area.
- [x] Connect validation errors to fields on login/profile and their related password forms with IDs, describedby, and invalid state.
- [x] Keep shell as the single main landmark; convert nested page mains to neutral containers.
- [x] Run browser regressions, three-viewport checks, and one batched screenshot review; fix confirmed regressions and confirm once.

### 4. Verification and delivery

- [x] `composer ci:check`, `pnpm run build`, browser regressions, and `git diff --check` pass.
- [x] Append closure evidence to the audit, update memory and this checklist, register documentation, and request independent review.
Delivery: commit and create PR after the checked gates; do not merge automatically. Remaining untested UAT/pilot acceptance stays open.
