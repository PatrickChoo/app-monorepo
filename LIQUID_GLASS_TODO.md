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
- [ ] Tune title/icon contrast in light/dark themes.
- [ ] Validate search bar interaction and focus states.
- [ ] Validate desktop drag region compatibility.

## Phase 3 - Tab Bar
- [ ] Integrate Liquid Glass surface for mobile tab bar.
- [ ] Preserve selected/unselected icon readability.
- [ ] Validate safe-area + border behavior.
- [ ] Check Android/web fallback rendering.

## Phase 4 - Modal
- [ ] Upgrade modal backdrop + container to glass style where appropriate.
- [ ] Keep animation smooth (no white flash, no jank).
- [ ] Validate stacking behavior across nested modals.
- [ ] Ensure click-through prevention and interaction correctness.

## Phase 5 - QA & Rollout
- [ ] Visual regression pass (light/dark + key breakpoints).
- [ ] Accessibility check (contrast, focus visibility, motion).
- [ ] Performance check (open/close transition, tab switch).
- [ ] Final screenshot set + release notes.

---

## Current Notes
- Existing `feat/ios-liquid-glass-icon` only covers icon assets, not navbar/tab bar/modal surfaces.
- Priority order: **Navbar -> Tab Bar -> Modal**.

## Auto Schedule Plan
- [x] S1: Navbar/Header first-pass integration
- [ ] S2: Navbar visual/accessibility tuning
- [ ] S3: Tab Bar first-pass integration
- [ ] S4: Tab Bar readability + safe-area tuning
- [ ] S5: Modal first-pass integration
- [ ] S6: Modal animation/interaction stability pass
- [ ] S7: Final QA (visual, accessibility, performance) + release notes

### Auto-run Rule
- Continue S2 -> S3 -> S4 -> S5 -> S6 -> S7 automatically.
- Pause only when blocker appears (design decision/risk/perf regression), then report immediately.

## Changelog
- 2026-03-02: Initialized tracking TODO and phase plan.
- 2026-03-02: Navbar/Header started with first Liquid Glass surface integration in HeaderView.
