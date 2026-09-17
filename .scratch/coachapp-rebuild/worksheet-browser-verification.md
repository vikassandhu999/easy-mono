# Worksheet browser verification

The existing training and nutrition worksheet audits now support Chromium and WebKit.
Run from `frontend/apps/coachapp` with the normal API4000 and coach2022 services:

```sh
rtk proxy pnpm test:worksheets
rtk proxy env BROWSER_ENGINE=webkit pnpm test:worksheets
```

Both engines pass at 375px and 1280px on 2026-09-17. Training covers long plan,
workout and exercise names; schedule and exercise selection; compact shared targets;
preview; removal/Undo; failed loads and saves; retained drafts; keyboard error and
success focus; repeated saved-version recovery; and persisted values after reload.
Nutrition covers long food and variation names, picker and portion changes, Undo,
hidden day/meal/portion validation, moving away from an invalid day, shadcn weekday
selection, server-calculated previews and persisted meal quantities.

No application changes were needed. The harness waits for injected sign-in to settle
and for a newly saved nutrition detail screen to finish loading before its deliberate
reload. The earlier WebKit diagnostic concerned that interrupted detail request;
page-error assertions remain enabled. Successful runs delete their authored plans,
exercise and food; disposable account/business records remain.

Reviewed WebKit captures are archived under `/tmp/coachapp-worksheets-webkit-audit`.
Build, scoped Biome, repository checks and backend precommit pass (1,784 tests).
These are existing editor audits in a second engine, not physical-device or
target-coach usability verification, nor every assignment/lifecycle interaction.
