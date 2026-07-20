/**
 * tracking_type → which set fields are shown, per the training schema spec table.
 *
 * Single source of truth shared by SetSheet (which fields to EDIT) and SetRow
 * (which measures to SUMMARIZE) so the row preview and the editor can never
 * disagree about what a set tracks.
 */

export interface FieldConfig {
  showReps: boolean;
  showLoad: boolean;
  showDuration: boolean;
  showDistance: boolean;
  showRpe: boolean;
}

export function fieldsForTrackingType(trackingType: string | null): FieldConfig {
  switch (trackingType) {
    case 'weight_reps':
      return {showReps: true, showLoad: true, showDuration: false, showDistance: false, showRpe: true};
    case 'bodyweight_reps':
      return {showReps: true, showLoad: false, showDuration: false, showDistance: false, showRpe: true};
    case 'weighted_bodyweight':
      return {showReps: true, showLoad: true, showDuration: false, showDistance: false, showRpe: true};
    case 'assisted_bodyweight':
      return {showReps: true, showLoad: true, showDuration: false, showDistance: false, showRpe: true};
    case 'reps_only':
      return {showReps: true, showLoad: false, showDuration: false, showDistance: false, showRpe: false};
    case 'duration':
      return {showReps: false, showLoad: false, showDuration: true, showDistance: false, showRpe: false};
    case 'weight_duration':
      return {showReps: false, showLoad: true, showDuration: true, showDistance: false, showRpe: false};
    case 'distance_duration':
      return {showReps: false, showLoad: false, showDuration: true, showDistance: true, showRpe: false};
    case 'weight_distance':
      return {showReps: false, showLoad: true, showDuration: false, showDistance: true, showRpe: false};
    default:
      return {showReps: true, showLoad: true, showDuration: false, showDistance: false, showRpe: true};
  }
}

/**
 * tracking_type → the label shown on the exercise row's chip.
 * Strings are verbatim from design-handoff/COPY.md § TB (Tracking labels).
 */
export function trackingTypeLabel(trackingType: string | null): string | null {
  switch (trackingType) {
    case 'weight_reps':
      return 'Weight & reps';
    case 'bodyweight_reps':
      return 'Bodyweight reps';
    case 'weighted_bodyweight':
      return 'Weighted bodyweight';
    case 'assisted_bodyweight':
      return 'Assisted bodyweight';
    case 'reps_only':
      return 'Reps only';
    case 'duration':
      return 'Duration';
    case 'weight_duration':
      return 'Weight & time';
    case 'distance_duration':
      return 'Distance & time';
    case 'weight_distance':
      return 'Weight & distance';
    default:
      return null;
  }
}
