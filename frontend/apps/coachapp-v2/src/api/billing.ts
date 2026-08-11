import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useCallback, useEffect, useRef, useState} from 'react';

import {call, client} from '@/api/client';
import {billingKeys, clientKeys} from '@/api/keys';
import type {components} from '@/api/schema';

export type BillingEvent = components['schemas']['BillingEvent'];
export type BillingSummary = components['schemas']['BillingSummary'];
export type BillingResponse = components['schemas']['BillingResponse'];
export type BillingCheckoutRequest = components['schemas']['BillingCheckoutRequest'];
export type BillingCheckoutResponse = components['schemas']['BillingCheckoutResponse'];

const SYNC_POLL_INTERVAL_MS = 5_000;
const SYNC_POLL_BUDGET_MS = 30_000;

/** Polls billing sync after checkout until the purchased seats land or the 30s budget expires. */
export function useActivationSync() {
  const syncBillingMutation = useSyncBillingMutation();
  const [pending, setPending] = useState<{snapshot: BillingSummary; timedOut: boolean} | null>(null);
  const timersRef = useRef<{interval?: ReturnType<typeof setInterval>; timeout?: ReturnType<typeof setTimeout>}>({});

  const stopPolling = useCallback(() => {
    if (timersRef.current.interval) {
      clearInterval(timersRef.current.interval);
    }
    if (timersRef.current.timeout) {
      clearTimeout(timersRef.current.timeout);
    }
    timersRef.current = {};
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const attemptSync = useCallback(
    async (snapshot: BillingSummary) => {
      try {
        const result = await syncBillingMutation.mutateAsync();
        if (result.data.paid_seats > snapshot.paid_seats || result.data.status === 'active') {
          stopPolling();
          setPending(null);
        }
      } catch {
        // Keep polling; callers render the pending state.
      }
    },
    [stopPolling, syncBillingMutation],
  );

  const start = useCallback(
    (snapshot: BillingSummary) => {
      stopPolling();
      setPending({snapshot, timedOut: false});
      attemptSync(snapshot);
      timersRef.current.interval = setInterval(() => attemptSync(snapshot), SYNC_POLL_INTERVAL_MS);
      timersRef.current.timeout = setTimeout(() => {
        if (timersRef.current.interval) {
          clearInterval(timersRef.current.interval);
        }
        setPending((previous) => (previous ? {...previous, timedOut: true} : previous));
      }, SYNC_POLL_BUDGET_MS);
    },
    [attemptSync, stopPolling],
  );

  return {pending, start};
}

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
      qc.invalidateQueries({queryKey: clientKeys.details()});
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
      qc.invalidateQueries({queryKey: clientKeys.details()});
      qc.invalidateQueries({queryKey: clientKeys.lists()});
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
