import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {profileKeys} from '@/api/keys';
import type {ClientProfile, ClientProfileUpdate} from '@/api/schema';

export type {ClientProfile, ClientProfileUpdate} from '@/api/schema';

export type ClientCoach = NonNullable<ClientProfile['coach']>;

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
    mutationFn: (body: ClientProfileUpdate) => call(client.PATCH('/v1/client/me', {body})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: profileKeys.all});
    },
  });
}
