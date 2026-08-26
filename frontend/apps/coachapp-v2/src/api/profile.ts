import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {profileKeys} from '@/api/keys';
import type {CoachProfile as CoachProfileSchema, CoachProfileUpdate, paths} from '@/api/schema';

export type CoachProfileBusiness = CoachProfileSchema['business'];
export type CoachProfileResponse = paths['/v1/coach/me']['get']['responses'][200]['content']['application/json'];
export type UpdateProfileRequest = CoachProfileUpdate;
export type DashboardSetupUpdateRequest =
  paths['/v1/businesses/me/dashboard-setup']['patch']['requestBody']['content']['application/json'];
export type BusinessResponse = paths['/v1/businesses/me']['get']['responses'][200]['content']['application/json'];
export type {Business, CoachProfile, CoachProfileUpdate} from '@/api/schema';

export function useGetCoachProfileQuery(options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: profileKeys.all,
    queryFn: () => call(client.GET('/v1/coach/me')),
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateCoachProfileMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProfileRequest) => call(client.PATCH('/v1/coach/me', {body})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: profileKeys.all});
    },
  });
}

export function useUpdateDashboardSetupMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DashboardSetupUpdateRequest) => call(client.PATCH('/v1/businesses/me/dashboard-setup', {body})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: profileKeys.all});
    },
  });
}
