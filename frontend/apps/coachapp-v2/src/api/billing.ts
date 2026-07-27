import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {billingKeys, clientKeys} from '@/api/keys';
import type {components} from '@/api/schema';

export type BillingEvent = components['schemas']['BillingEvent'];
export type BillingSummary = components['schemas']['BillingSummary'];
export type BillingResponse = components['schemas']['BillingResponse'];
export type BillingCheckoutRequest = components['schemas']['BillingCheckoutRequest'];
export type BillingCheckoutResponse = components['schemas']['BillingCheckoutResponse'];

export function useGetBillingQuery(options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: billingKeys.all,
    queryFn: () => call(client.GET('/v1/coach/billing')) as Promise<BillingResponse>,
    enabled: options?.enabled ?? true,
  });
}

export function useCheckoutSeatsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BillingCheckoutRequest) =>
      call(client.POST('/v1/coach/billing/checkout', {body})) as Promise<BillingCheckoutResponse>,
    onSuccess: () => {
      qc.invalidateQueries({queryKey: billingKeys.all});
      qc.invalidateQueries({queryKey: clientKeys.lists()});
    },
  });
}

export function useCancelBillingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => call(client.POST('/v1/coach/billing/cancel')) as Promise<BillingResponse>,
    onSuccess: () => {
      qc.invalidateQueries({queryKey: billingKeys.all});
    },
  });
}

export function useSyncBillingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => call(client.POST('/v1/coach/billing/sync')) as Promise<BillingResponse>,
    onSuccess: () => {
      qc.invalidateQueries({queryKey: billingKeys.all});
    },
  });
}

/** Extract the seat summary from a 409 seat_limit_reached error, or null. */
export function getSeatLimitError(err: unknown): {seatSummary: BillingSummary} | null {
  const e = err as {status?: number; data?: {error_code?: string; seat_summary?: BillingSummary}};
  if (e?.status === 409 && e?.data?.error_code === 'seat_limit_reached' && e.data.seat_summary) {
    return {seatSummary: e.data.seat_summary};
  }
  return null;
}
