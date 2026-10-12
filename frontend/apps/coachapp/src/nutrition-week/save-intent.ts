import type {
  NutritionPreset,
  NutritionSchedule,
  NutritionTargets,
  NutritionWeek,
  PresetBody,
  ScheduleBody,
  ScheduleUpdate,
  TargetDayBody,
} from '../api/nutrition-week';

export type SaveIntent =
  | {kind: 'add'; before: NutritionWeek; body: ScheduleBody}
  | {kind: 'meal'; before: NutritionWeek; id: string; body: PresetBody}
  | {kind: 'schedule'; before: NutritionWeek; id: string; body: ScheduleUpdate}
  | {kind: 'remove'; before: NutritionWeek; id: string; weekday: number}
  | {kind: 'targets'; before: NutritionWeek; weekday: number; body: TargetDayBody};
export type SaveResult = 'saved' | 'absent' | 'conflict';
const text = (value: string | null | undefined) => (value === '' || value == null ? null : value);
const time = (value: string | null | undefined) => (!value ? null : value.length === 5 ? `${value}:00` : value);

export function presetBodyOf(preset: NutritionPreset): PresetBody {
  return {
    type: preset.type,
    name: preset.name,
    instructions: preset.instructions,
    food_id: preset.food_id,
    amount: preset.amount,
    unit: preset.unit,
    options: preset.options.map((option) => ({
      name: option.name,
      items: option.items.map((item) => ({food_id: item.food_id, amount: item.amount, unit: item.unit})),
    })),
  };
}

export function presetMatches(preset: NutritionPreset, body: PresetBody) {
  if (
    preset.type !== body.type ||
    text(preset.name) !== text(body.name) ||
    text(preset.instructions) !== text(body.instructions)
  ) {
    return false;
  }
  if (body.type !== 'meal') {
    return preset.food_id === body.food_id && preset.amount === body.amount && preset.unit === body.unit;
  }
  const options = body.options ?? [];
  return (
    preset.options.length === options.length &&
    preset.options.every((option, index) => {
      const requested = options[index];
      return (
        requested !== undefined &&
        text(option.name) === text(requested.name) &&
        option.items.length === requested.items.length &&
        option.items.every((item, itemIndex) => {
          const row = requested.items[itemIndex];
          return (
            row !== undefined && item.food_id === row.food_id && item.amount === row.amount && item.unit === row.unit
          );
        })
      );
    })
  );
}

const sameUse = (a: NutritionSchedule, b: NutritionSchedule) =>
  a.weekdays_mask === b.weekdays_mask && a.date === b.date && time(a.time) === time(b.time);
function sameUses(a: NutritionSchedule[], b: NutritionSchedule[]) {
  if (a.length !== b.length) {
    return false;
  }
  const remaining = [...b];
  return a.every((row) => {
    const index = remaining.findIndex((candidate) => sameUse(row, candidate));
    if (index < 0) {
      return false;
    }
    remaining.splice(index, 1);
    return true;
  });
}
function sameRows<T extends {id: string}>(a: T[], b: T[], same: (a: T, b: T) => boolean) {
  return (
    a.length === b.length &&
    a.every((row) => {
      const other = b.find((candidate) => candidate.id === row.id);
      return other !== undefined && same(row, other);
    })
  );
}
const sameBounds = (a: NutritionTargets['targets'], b: NutritionTargets['targets']) => {
  const codes = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...codes].every((code) => a[code]?.min === b[code]?.min && a[code]?.max === b[code]?.max);
};
const targetMask = (week: NutritionWeek, id: string) =>
  week.target_schedules
    .filter((row) => row.nutrition_targets_id === id)
    .reduce((mask, row) => mask | (row.weekdays_mask ?? 0), 0);
const targetOn = (week: NutritionWeek, bit: number) =>
  week.target_schedules.find((row) => (row.weekdays_mask ?? 0) & bit)?.nutrition_targets_id ?? null;

function unchanged(a: NutritionWeek, b: NutritionWeek) {
  return (
    sameRows(a.presets, b.presets, (first, second) => presetMatches(second, presetBodyOf(first))) &&
    sameRows(
      a.schedules,
      b.schedules,
      (first, second) =>
        first.nutrition_preset_id === second.nutrition_preset_id &&
        first.coach_id === second.coach_id &&
        sameUse(first, second) &&
        first.from_date === second.from_date &&
        first.until_date === second.until_date,
    ) &&
    sameRows(
      a.nutrition_targets,
      b.nutrition_targets,
      (first, second) => first.name === second.name && sameBounds(first.targets, second.targets),
    ) &&
    sameRows(
      a.target_schedules,
      b.target_schedules,
      (first, second) =>
        first.nutrition_targets_id === second.nutrition_targets_id &&
        first.weekdays_mask === second.weekdays_mask &&
        first.date === second.date &&
        first.from_date === second.from_date &&
        first.until_date === second.until_date,
    )
  );
}

function addSaved(intent: Extract<SaveIntent, {kind: 'add'}>, week: NutritionWeek) {
  const {before, body} = intent;
  const original = before.presets.find((preset) => preset.id === body.nutrition_preset_id);
  const requested = body.preset ?? (original ? presetBodyOf(original) : null);
  if (!requested) {
    return false;
  }
  const rows = week.schedules.filter(
    (row) =>
      !before.schedules.some((old) => old.id === row.id) &&
      row.weekdays_mask === body.weekdays_mask &&
      time(row.time) === time(body.time),
  );
  return (
    rows.filter((row) => {
      const preset = week.presets.find((candidate) => candidate.id === row.nutrition_preset_id);
      const identity = body.preset
        ? !before.presets.some((old) => old.id === preset?.id)
        : preset?.id === body.nutrition_preset_id;
      return identity && preset !== undefined && presetMatches(preset, requested);
    }).length === 1
  );
}

function mealSaved(intent: Extract<SaveIntent, {kind: 'meal'}>, week: NutritionWeek) {
  const uses = intent.before.schedules.filter((row) => row.nutrition_preset_id === intent.id);
  return week.presets.some(
    (preset) =>
      (preset.id === intent.id || !intent.before.presets.some((old) => old.id === preset.id)) &&
      presetMatches(preset, intent.body) &&
      sameUses(
        uses,
        week.schedules.filter((row) => row.nutrition_preset_id === preset.id),
      ),
  );
}

function scheduleSaved(intent: Extract<SaveIntent, {kind: 'schedule'}>, week: NutritionWeek) {
  const original = intent.before.schedules.find((row) => row.id === intent.id);
  if (!original) {
    return false;
  }
  const presetId = intent.body.nutrition_preset_id ?? original.nutrition_preset_id;
  const preset = intent.before.presets.find((row) => row.id === presetId);
  if (!preset) {
    return false;
  }
  const body = {
    ...presetBodyOf(preset),
    ...(intent.body.amount === undefined ? {} : {amount: intent.body.amount}),
    ...(intent.body.unit === undefined ? {} : {unit: intent.body.unit}),
  };
  const expected = {
    ...original,
    weekdays_mask: intent.body.weekdays_mask ?? original.weekdays_mask,
    time: intent.body.time === undefined ? original.time : intent.body.time,
  };
  return week.schedules.some((row) => {
    if (
      (row.id !== original.id && intent.before.schedules.some((old) => old.id === row.id)) ||
      !sameUse(row, expected)
    ) {
      return false;
    }
    const saved = week.presets.find((candidate) => candidate.id === row.nutrition_preset_id);
    if (!saved || !presetMatches(saved, body)) {
      return false;
    }
    if (intent.body.amount === undefined && intent.body.unit === undefined) {
      return saved.id === presetId;
    }
    const otherUses = intent.before.schedules.filter(
      (old) => old.nutrition_preset_id === presetId && old.id !== original.id,
    );
    return sameUses(
      otherUses,
      week.schedules.filter((other) => other.nutrition_preset_id === saved.id && other.id !== row.id),
    );
  });
}

function removalSaved(intent: Extract<SaveIntent, {kind: 'remove'}>, week: NutritionWeek) {
  const original = intent.before.schedules.find((row) => row.id === intent.id);
  if (!original) {
    return false;
  }
  const bit = 1 << (intent.weekday - 1);
  const mask = (original.weekdays_mask ?? 0) & ~bit;
  const continuations = week.schedules.filter(
    (row) =>
      row.nutrition_preset_id === original.nutrition_preset_id &&
      time(row.time) === time(original.time) &&
      (row.id === original.id || !intent.before.schedules.some((old) => old.id === row.id)),
  );
  if (continuations.some((row) => (row.weekdays_mask ?? 0) & bit)) {
    return false;
  }
  return mask === 0 ? continuations.length === 0 : continuations.some((row) => row.weekdays_mask === mask);
}

function targetsSaved(intent: Extract<SaveIntent, {kind: 'targets'}>, week: NutritionWeek) {
  const bit = 1 << (intent.weekday - 1);
  const replacements = new Map<string, string>();
  for (const update of intent.body.target_updates ?? []) {
    const original = intent.before.nutrition_targets.find((set) => set.id === update.id);
    if (!original) {
      return false;
    }
    const expectedMask =
      (targetMask(intent.before, update.id) & ~bit) |
      (!intent.body.new_targets && intent.body.nutrition_targets_id === update.id ? bit : 0);
    const matching = week.nutrition_targets.filter(
      (set) =>
        (set.id === update.id || !intent.before.nutrition_targets.some((old) => old.id === set.id)) &&
        set.name === (update.name ?? original.name) &&
        sameBounds(set.targets, update.targets) &&
        targetMask(week, set.id) === expectedMask,
    );
    const saved = matching.find((set) => set.id === update.id) ?? (matching.length === 1 ? matching[0] : undefined);
    if (!saved) {
      return false;
    }
    replacements.set(update.id, saved.id);
  }
  let selectedId = intent.body.nutrition_targets_id;
  if (intent.body.new_targets) {
    const requested = intent.body.new_targets;
    const matching = week.nutrition_targets.filter(
      (set) =>
        !intent.before.nutrition_targets.some((old) => old.id === set.id) &&
        set.name === requested.name &&
        sameBounds(set.targets, requested.targets) &&
        targetMask(week, set.id) === bit,
    );
    if (matching.length !== 1) {
      return false;
    }
    selectedId = matching[0]?.id ?? null;
  } else if (selectedId) {
    selectedId = replacements.get(selectedId) ?? selectedId;
  }
  return [1, 2, 4, 8, 16, 32, 64].every((day) => {
    const beforeId = targetOn(intent.before, day);
    const expectedId = day === bit ? selectedId : beforeId ? (replacements.get(beforeId) ?? beforeId) : null;
    return targetOn(week, day) === expectedId;
  });
}

export function matchSaveIntent(intent: SaveIntent, week: NutritionWeek): SaveResult {
  const saved =
    intent.kind === 'add'
      ? addSaved(intent, week)
      : intent.kind === 'meal'
        ? mealSaved(intent, week)
        : intent.kind === 'schedule'
          ? scheduleSaved(intent, week)
          : intent.kind === 'remove'
            ? removalSaved(intent, week)
            : targetsSaved(intent, week);
  return saved ? 'saved' : unchanged(intent.before, week) ? 'absent' : 'conflict';
}
