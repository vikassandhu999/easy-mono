import {TRAINING_WEEKDAYS} from '@easy/utils';

import type {components} from '@/api/schema';
import {
  createLocalNodeId,
  isLocalNodeId,
  planToPrescriptionRequestForWeekdays,
  type TrainingPrescriptionReplaceRequest,
} from '@/api/training-prescription-mapper';

export type {TrainingPrescriptionReplaceRequest};
export {createLocalNodeId, isLocalNodeId, planToPrescriptionRequestForWeekdays};

type TrainingPlan = components['schemas']['TrainingPlan'];

export function planToPrescriptionRequest(plan: TrainingPlan): TrainingPrescriptionReplaceRequest {
  return planToPrescriptionRequestForWeekdays(plan, TRAINING_WEEKDAYS);
}
