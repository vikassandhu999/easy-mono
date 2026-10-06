import type {TrainingPlan} from '../api/training-plans';

type DraftSet = TrainingPlan['content']['workouts'][number]['blocks'][number]['items'][number]['sets'][number];
export function setSummary(set: DraftSet) {
  return (
    [
      set.reps?.type === 'exact'
        ? `${set.reps.value} reps`
        : set.reps?.type === 'range'
          ? `${set.reps.min}–${set.reps.max} reps`
          : set.reps?.type === 'amrap'
            ? 'AMRAP'
            : '',
      set.load
        ? `${Math.round((Number(set.load.kg) / (set.load.entered_unit === 'lb' ? 0.45359237 : 1)) * 100) / 100} ${set.load.entered_unit}`
        : '',
      set.rpe != null ? `RPE ${set.rpe}` : '',
      set.rir != null ? `RIR ${set.rir}` : '',
      set.tempo ? `Tempo ${set.tempo}` : '',
      set.duration_s != null ? `${set.duration_s} sec` : '',
      set.distance
        ? `${Math.round((Number(set.distance.m) / (set.distance.entered_unit === 'km' ? 1000 : set.distance.entered_unit === 'mi' ? 1609.344 : 1)) * 100) / 100} ${set.distance.entered_unit}`
        : '',
      set.rest_s != null ? `Rest ${set.rest_s} sec` : '',
    ]
      .filter(Boolean)
      .join(' · ') || 'Targets not set'
  );
}
