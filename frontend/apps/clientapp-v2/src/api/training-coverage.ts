import type {components, paths} from '@/api/schema';

type ClientTrainingCoverageResponse = components['schemas']['ClientTrainingCoverageResponse'];
type ClientTrainingPlan = components['schemas']['ClientTrainingPlan'];
type CoverageQuery = paths['/v1/client/training-plans/coverage']['get']['parameters']['query'];

export function clientTrainingCoverageRequest(date?: string): {params: {query: CoverageQuery}} {
  return {params: {query: date ? {date} : {}}};
}

export function clientTrainingPlanFromCoverage(
  coverage?: ClientTrainingCoverageResponse,
): ClientTrainingPlan | undefined {
  return coverage?.data?.plan;
}
