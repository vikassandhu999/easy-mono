import {onlineManager, useMutation} from '@tanstack/react-query';
import {ApiError, call, client} from './client';
import {authKeys, weightKeys} from './keys';
import {queryClient} from './query-client';
import type {ClientProfile, ClientProfileUpdate} from './schema';
import {getSession} from './session';

export type Goal = Required<Pick<ClientProfileUpdate, 'goal_weight_value' | 'goal_weight_unit'>>;
export type GoalSave = {goal: Goal; expected: Goal};

export function profileGoal(profile: ClientProfile): Goal {
  return {
    goal_weight_value: profile.goal_weight_value === null ? null : Number(profile.goal_weight_value),
    goal_weight_unit: profile.goal_weight_unit,
  };
}

export function sameGoal(left: Goal, right: Goal) {
  return left.goal_weight_value === right.goal_weight_value && left.goal_weight_unit === right.goal_weight_unit;
}

export class GoalConflict extends Error {
  constructor() {
    super('Your goal changed elsewhere. Review the saved goal before using your draft.');
  }
}

export function useSaveGoal() {
  const owner = getSession()?.id;
  function requireOwner() {
    if (!owner || getSession()?.id !== owner) {
      throw new Error('Your session changed. Please sign in again.');
    }
  }
  async function read() {
    const result = await call(client.GET('/v1/client/me'));
    requireOwner();
    queryClient.setQueryData(authKeys.profile(), result);
    return result;
  }
  return useMutation({
    mutationFn: async ({goal, expected}: GoalSave) => {
      requireOwner();
      if (!onlineManager.isOnline()) {
        throw new Error('Reconnect before saving your goal.');
      }
      const current = await read();
      if (sameGoal(goal, profileGoal(current.data))) {
        return current;
      }
      if (!sameGoal(expected, profileGoal(current.data))) {
        throw new GoalConflict();
      }
      try {
        const result = await call(client.PATCH('/v1/client/me', {body: goal}));
        requireOwner();
        if (!sameGoal(goal, profileGoal(result.data))) {
          throw new Error('The returned goal does not match this save.');
        }
        return result;
      } catch (error) {
        requireOwner();
        if (!(error instanceof ApiError) || error.status >= 500) {
          const saved = await read();
          if (sameGoal(goal, profileGoal(saved.data))) {
            return saved;
          }
          if (!sameGoal(expected, profileGoal(saved.data))) {
            throw new GoalConflict();
          }
        }
        throw error;
      }
    },
    onSuccess: async (result) => {
      requireOwner();
      queryClient.setQueryData(authKeys.profile(), result);
      await Promise.all([
        queryClient.invalidateQueries({queryKey: authKeys.profile()}),
        queryClient.invalidateQueries({queryKey: weightKeys.all}),
      ]);
      requireOwner();
    },
  });
}
