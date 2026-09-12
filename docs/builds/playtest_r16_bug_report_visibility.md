# Human playtest R16 — visible bug reporting

Date: 2026-09-12
Product commit: `ad645dd`

## Problem

The GitHub Issue Form worked from both game menus, but its button looked like an ordinary secondary menu item and was easy to miss. Public playtest feedback depends on players finding it without instructions.

## Bounded change

- The existing **Report a bug** action now uses a distinct warm accent, left highlight and 54 px target in both the main and pause menus.
- The secondary label now says **Help improve the game**, explaining why the action is useful.
- The existing GitHub repository, issue template, version-filled title and menu positions are unchanged.
- The treatment is static, with no repeating pulse or other distracting animation.

## Verification

- Production build: PASS, 164 modules.
- `tools/bug-report-visibility-probe.mjs`: PASS with zero runtime errors.
- Main and pause menus each contain exactly one visible `Report a bug` action, measured at 366 × 54 px.
- The action opens `martingrahn-cmd/SimBuild/issues/new` with `bug_report.yml` and the current New Dollarton version in the title.
- Both full-frame captures were inspected: `shots/playtest-fixes-r16/bug-report-main.png` and `bug-report-pause.png`.

## Limits

This repairs discoverability only. It does not change the GitHub account requirement, issue form fields, gameplay, simulation or any critic score.
