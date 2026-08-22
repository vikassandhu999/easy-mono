import type {NutritionDay} from '../api/nutrition-plans.ts';

type NutritionDaySummary = NutritionDay['summary'];

export type NutritionDayTotalsSource = {
  summary: Pick<NutritionDaySummary, 'adherence' | 'counts' | 'has_intake'> & {
    logged: Pick<NutritionDaySummary['logged'], 'calories'>;
  };
  targets: Pick<NutritionDay['targets'], 'calories'>;
};

export type DayTotals = {
  added: number;
  adherence: NonNullable<NutritionDaySummary['adherence']> | null;
  hasIntake: boolean;
  logged: null | number;
  skipped: number;
  swapped: number;
  target: null | number | undefined;
};

export function nutritionDayTotals(day: NutritionDayTotalsSource): DayTotals {
  return {
    added: day.summary.counts.added,
    adherence: day.summary.adherence ?? null,
    hasIntake: day.summary.has_intake,
    logged: day.summary.logged.calories,
    skipped: day.summary.counts.skipped,
    swapped: day.summary.counts.swapped,
    target: day.targets.calories,
  };
}

export function caloriePct(totals: DayTotals | undefined): null | number {
  if (!totals || totals.adherence == null || totals.adherence === 'none') {
    return null;
  }
  const logged = Number(totals.logged);
  const target = Number(totals.target);
  if (!Number.isFinite(logged) || !Number.isFinite(target) || target <= 0) {
    return null;
  }
  return Math.round((logged / target) * 100);
}

export function adherenceBand(totals: DayTotals | undefined): 'danger' | 'success' | 'warning' | null {
  if (totals?.adherence === 'on') {
    return 'success';
  }
  if (totals?.adherence === 'under') {
    return 'warning';
  }
  if (totals?.adherence === 'over') {
    return 'danger';
  }
  return null;
}
