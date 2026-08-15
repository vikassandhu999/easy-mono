import type {components} from './schema.ts';

type TrainingPlanAssignRequest = components['schemas']['TrainingPlanAssignRequest'];
type TrainingPlanUpdateRequest = components['schemas']['TrainingPlanUpdateRequest'];

type Assignment = {
  body: TrainingPlanAssignRequest;
  clientId: string;
  id: string;
};

type RevisionedPlan = {
  revision: number;
};

export function trainingPlanAssignmentRequest({body, clientId, id}: Assignment) {
  return {
    params: {path: {client_id: clientId, id}},
    body,
  } as const;
}

export function trainingPlanPeriodRequest(
  plan: RevisionedPlan,
  period: Pick<TrainingPlanUpdateRequest, 'end_date' | 'start_date'>,
): TrainingPlanUpdateRequest {
  return {...period, expected_revision: plan.revision};
}
