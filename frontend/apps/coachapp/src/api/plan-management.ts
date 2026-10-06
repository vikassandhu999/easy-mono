import {useMutation, useQuery} from '@tanstack/react-query';
import {ApiError, call, client} from './client';
import {
  clientKeys,
  exerciseKeys,
  foodKeys,
  nutritionDayKeys,
  nutritionKeys,
  recipeKeys,
  trainingPlanKeys,
} from './keys';
import {queryClient} from './query-client';
import type {paths, TrainingPlan} from './schema';
import {getSession} from './session';

export type PlanResource = 'training' | 'nutrition';
export type PlanAction = 'duplicate' | 'archive' | 'restore' | 'delete';
export type PlanVersion = Pick<TrainingPlan, 'id' | 'name' | 'revision'>;

function keys(resource: PlanResource) {
  return resource === 'training' ? trainingPlanKeys : nutritionKeys;
}
function readPlan(resource: PlanResource, id: string, signal?: AbortSignal) {
  return resource === 'training'
    ? call(client.GET('/v1/coach/training-plans/{id}', {params: {path: {id}}, ...(signal ? {signal} : {})}))
    : call(client.GET('/v1/coach/nutrition-plans/{id}', {params: {path: {id}}, ...(signal ? {signal} : {})}));
}
export function useManagedPlan(resource: PlanResource, id: string) {
  return useQuery({
    queryKey: keys(resource).detail(id),
    staleTime: 0,
    queryFn: async ({signal}) => readPlan(resource, id, signal),
  });
}
function writePlan(resource: PlanResource, action: PlanAction, plan: PlanVersion) {
  const path = {id: plan.id};
  const revision = {expected_revision: plan.revision};
  if (resource === 'training') {
    switch (action) {
      case 'duplicate':
        return call(client.POST('/v1/coach/training-plans/{id}/duplicate', {params: {path}}));
      case 'archive':
        return call(client.POST('/v1/coach/training-plans/{id}/archive', {params: {path}, body: revision}));
      case 'restore':
        return call(client.POST('/v1/coach/training-plans/{id}/restore', {params: {path}, body: revision}));
      case 'delete':
        return call(client.DELETE('/v1/coach/training-plans/{id}', {params: {path, query: revision}}));
    }
  }
  switch (action) {
    case 'duplicate':
      return call(client.POST('/v1/coach/nutrition-plans/{id}/duplicate', {params: {path}}));
    case 'archive':
      return call(client.POST('/v1/coach/nutrition-plans/{id}/archive', {params: {path}, body: revision}));
    case 'restore':
      return call(client.POST('/v1/coach/nutrition-plans/{id}/restore', {params: {path}, body: revision}));
    case 'delete':
      return call(client.DELETE('/v1/coach/nutrition-plans/{id}', {params: {path, query: revision}}));
  }
}
export function uncertainPlanWrite(error: unknown) {
  return !(error instanceof ApiError) || error.status >= 500;
}
function checkSession(id: string | undefined) {
  if (!id || getSession()?.id !== id) {
    throw new Error('Your session changed. Please try again.');
  }
}

export function useManagePlan(resource: PlanResource) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: async ({action, plan}: {action: PlanAction; plan: PlanVersion}) => {
      const sessionId = getSession()?.id;
      checkSession(sessionId);
      try {
        const result = await writePlan(resource, action, plan);
        checkSession(sessionId);
        return result && 'data' in result ? result.data.id : null;
      } catch (error) {
        checkSession(sessionId);
        if (
          action === 'duplicate' ||
          (!uncertainPlanWrite(error) && !(error instanceof ApiError && error.status === 404))
        ) {
          throw error;
        }
        // Read the same resource to reconcile an interrupted idempotent action.
        try {
          const latest = await readPlan(resource, plan.id);
          checkSession(sessionId);
          const archived = latest.data.status === 'archived';
          if ((action === 'archive' && archived) || (action === 'restore' && !archived)) {
            return plan.id;
          }
        } catch (readError) {
          checkSession(sessionId);
          if (action === 'delete' && readError instanceof ApiError && readError.status === 404) {
            return null;
          }
        }
        throw error;
      }
    },
    onSuccess: async (_result, {action, plan}, sessionId) => {
      checkSession(sessionId);
      if (action === 'delete') {
        queryClient.removeQueries({queryKey: keys(resource).detail(plan.id)});
      }
      await invalidate(resource);
      checkSession(sessionId);
    },
    onError: async (_error, _input, sessionId) => {
      if (sessionId && getSession()?.id === sessionId) {
        await invalidate(resource);
      }
    },
  });
}
function invalidate(resource: PlanResource) {
  return Promise.all([
    queryClient.invalidateQueries({queryKey: keys(resource).all}),
    queryClient.invalidateQueries({queryKey: clientKeys.all}),
    ...(resource === 'nutrition'
      ? [
          queryClient.invalidateQueries({queryKey: foodKeys.lists()}),
          queryClient.invalidateQueries({queryKey: nutritionDayKeys.all}),
          queryClient.invalidateQueries({queryKey: recipeKeys.lists()}),
        ]
      : [queryClient.invalidateQueries({queryKey: exerciseKeys.lists()})]),
  ]);
}

export type PlanDates = Pick<
  NonNullable<paths['/v1/coach/nutrition-plans/{id}']['patch']['requestBody']>['content']['application/json'],
  'start_date' | 'end_date'
>;

export function useUpdatePlanDates(resource: PlanResource) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: async ({plan, dates}: {plan: PlanVersion; dates: PlanDates}) => {
      const sessionId = getSession()?.id;
      checkSession(sessionId);
      const params = {path: {id: plan.id}};
      const body = {...dates, expected_revision: plan.revision};
      try {
        const result =
          resource === 'training'
            ? await call(client.PATCH('/v1/coach/training-plans/{id}', {params, body}))
            : await call(client.PATCH('/v1/coach/nutrition-plans/{id}', {params, body}));
        checkSession(sessionId);
        return result.data;
      } catch (error) {
        checkSession(sessionId);
        if (uncertainPlanWrite(error)) {
          const latest = await readPlan(resource, plan.id);
          checkSession(sessionId);
          if (latest.data.start_date === dates.start_date && latest.data.end_date === dates.end_date) {
            return latest.data;
          }
        }
        throw error;
      }
    },
    onSuccess: async (_result, _input, sessionId) => {
      checkSession(sessionId);
      await invalidate(resource);
      checkSession(sessionId);
    },
    onError: async (_error, _input, sessionId) => {
      if (sessionId && getSession()?.id === sessionId) {
        await invalidate(resource);
      }
    },
  });
}
