import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {profileKeys} from '@/api/keys';
import type {components} from '@/api/schema';

export type CoachProfileBusiness = components['schemas']['CoachProfileBusiness'];
export type CoachProfile = components['schemas']['CoachProfile'];
export type CoachProfileResponse = components['schemas']['CoachProfileResponse'];
export type UpdateProfileRequest = components['schemas']['CoachProfileUpdateRequest'];
export type DashboardSetupUpdateRequest = components['schemas']['DashboardSetupUpdateRequest'];
export type BusinessResponse = components['schemas']['BusinessResponse'];

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
    mutationFn: (body: UpdateProfileRequest) =>
      call(client.PATCH('/v1/coach/me', {body})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: profileKeys.all});
    },
  });
}

export function useUpdateDashboardSetupMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DashboardSetupUpdateRequest) =>
      call(client.PATCH('/v1/businesses/me/dashboard-setup', {body})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: profileKeys.all});
    },
  });
}
