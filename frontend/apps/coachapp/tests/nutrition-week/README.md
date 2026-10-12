# Nutrition week browser test

Start the API on port 4000 and the coach app on port 2022. Run this command from the repository root:

```sh
rtk pnpm -C frontend/apps/coachapp test:nutrition
```

Each run first clears the nutrition schedules, target sets, and meals for the two fixture businesses, `nutrition-week-375` and `nutrition-week-1280`. It then seeds their weeks and tests both viewport widths. Other businesses and the food catalogue are retained.

Screenshots and failure details are saved in `tests/nutrition-week/artifacts/`. Run the command three times in sequence to check repeatability.
