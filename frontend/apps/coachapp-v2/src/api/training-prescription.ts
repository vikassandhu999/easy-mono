import {TRAINING_WEEKDAYS} from '@easy/utils';

import type {components} from './schema.ts';
import {
  createLocalNodeId,
  isLocalNodeId,
  planToPrescriptionRequestForWeekdays,
  type TrainingPrescriptionReplaceRequest,
} from './training-prescription-mapper.ts';

export type {TrainingPrescriptionReplaceRequest};
export {createLocalNodeId, isLocalNodeId, planToPrescriptionRequestForWeekdays};

type TrainingPlan = components['schemas']['TrainingPlan'];

export function planToPrescriptionRequest(plan: TrainingPlan): TrainingPrescriptionReplaceRequest {
  return planToPrescriptionRequestForWeekdays(plan, TRAINING_WEEKDAYS);
}
