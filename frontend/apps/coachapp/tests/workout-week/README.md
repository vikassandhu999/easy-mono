# Workout browser test

Start Phoenix on port 4000 and the coach app on port 2022. From the repository root, run:

```sh
rtk pnpm -C frontend/apps/coachapp test:workout
```

Each run clears only workout data owned by `workout-week-375` and `workout-week-1280`, then seeds accepted clients, a workout with past schedule dates, a library workout and an empty builder workout. A failed run cannot affect the next run.

The test uses the real coach app and API at 375px and 1280px. It covers superset creation, per-round targets, autosave and Retry, library copying, repeating days, time changes, removal, Undo and past-content preservation. It waits for the page's writes and save state before API reads.

Screenshots and failure details are saved in `artifacts/`. Run the command three times in sequence to check repeatability.
