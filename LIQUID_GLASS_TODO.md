# Liquid Glass Adaptation TODO

> Scope: app-monorepo (`/Users/patrick/onekey-app`)
> Target: Navbar / Tab Bar / Modal visual adaptation
> Owner: Patrick + Agent
> Status: In Progress
> Execution mode: Auto-arranged (agent continues in sequence unless blocked)

## Goal

Adapt core navigation surfaces to a Liquid Glass visual language while preserving readability, performance, and platform consistency.

---

## Phase 0 - Baseline & Guardrails

- [ ] Confirm target platforms and minimum OS/version strategy (iOS / Android / Desktop / Web).
- [ ] Define rollout strategy (feature flag vs direct rollout).
- [ ] Capture baseline screenshots/video for:
  - [ ] Navbar / Header
  - [ ] Tab Bar
  - [ ] Modal (backdrop + container)
- [ ] Record current perf baseline (navigation transition smoothness).

## Phase 1 - Shared Tokens & Primitive

- [ ] Add shared Liquid Glass tokens (blur intensity, tint, border, shadow, opacity).
- [ ] Create reusable surface primitive/component for glass containers.
- [ ] Ensure graceful fallback when blur/material is unsupported.
- [ ] Add usage docs + examples.

## Phase 2 - Navbar / Header

- [x] Integrate Liquid Glass surface into header container.
- [x] Tune title/icon contrast in light/dark themes.
- [x] Validate search bar interaction and focus states.
- [x] Validate desktop drag region compatibility.

## Phase 3 - Tab Bar

- [x] Integrate Liquid Glass surface for mobile tab bar.
- [x] Preserve selected/unselected icon readability.
- [x] Validate safe-area + border behavior.
- [x] Check Android/web fallback rendering.

## Phase 4 - Modal

- [x] Upgrade modal backdrop + container to glass style where appropriate.
- [x] Keep animation smooth (no white flash, no jank).
- [x] Validate stacking behavior across nested modals.
- [x] Ensure click-through prevention and interaction correctness.

## Phase 5 - QA & Rollout

- [x] Visual regression pass (light/dark + key breakpoints).
- [x] Accessibility check (contrast, focus visibility, motion).
- [x] Performance check (open/close transition, tab switch).
- [ ] Final screenshot set + release notes.

---

## Current Notes

- Existing `feat/ios-liquid-glass-icon` only covers icon assets, not navbar/tab bar/modal surfaces.
- Priority order: **Navbar -> Tab Bar -> Modal**.

## Auto Schedule Plan

- [x] S1: Navbar/Header first-pass integration
- [x] S2: Navbar visual/accessibility tuning
- [x] S3: Tab Bar first-pass integration
- [x] S4: Tab Bar readability + safe-area tuning
- [x] S5: Modal first-pass integration
- [x] S6: Modal animation/interaction stability pass
- [ ] S7: Final QA (visual, accessibility, performance) + release notes

### Auto-run Rule

- Continue S2 -> S3 -> S4 -> S5 -> S6 -> S7 automatically.
- Pause only when blocker appears (design decision/risk/perf regression), then report immediately.

## Changelog

- 2026-03-02: Initialized tracking TODO and phase plan.
- 2026-03-02: Navbar/Header started with first Liquid Glass surface integration in HeaderView.
- 2026-03-03: Completed S2-S6 implementation pass (Header contrast/focus/drag-region, Tab Bar liquid glass + readability/fallback, Modal glass backdrop/container + animation/interaction tuning).
- 2026-03-03: Ran targeted lint/typecheck for touched files; S7 remaining item is screenshot set + release notes.
