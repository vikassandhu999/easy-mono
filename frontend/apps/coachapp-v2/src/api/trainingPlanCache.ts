import type {ApiResponse} from '@/api/shared';
import type {TrainingPlan} from '@/api/trainingPlans';

type TrainingPlanCacheDraft = ApiResponse<TrainingPlan>;

export function replaceTrainingPlanInCache(draft: TrainingPlanCacheDraft, plan: TrainingPlan) {
  draft.data = plan;
}
