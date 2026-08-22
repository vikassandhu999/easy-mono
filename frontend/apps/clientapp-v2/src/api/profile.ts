import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {profileKeys} from '@/api/keys';
import type {components} from '@/api/schema';

export type ClientCoach = components['schemas']['ClientProfileCoach'];
export type ClientProfile = components['schemas']['ClientProfile'];
type UpdateClientProfileRequest = components['schemas']['ClientProfileUpdateRequest'];

export function useGetClientProfileQuery(options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: profileKeys.all,
    queryFn: () => call(client.GET('/v1/client/me')),
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateClientProfileMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateClientProfileRequest) => call(client.PATCH('/v1/client/me', {body})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: profileKeys.all});
    },
  });
}
