import {useMutation, useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {billingKeys} from './keys';
import {queryClient} from './query-client';
import type {Billing, BillingCheckout} from './schema';
import {getSession} from './session';

export type {Billing, BillingCheckoutPayload, BillingEvent} from './schema';

function assertSession(id: string | undefined) {
  if (!id || getSession()?.id !== id) {
    throw new Error('Your session changed. Please try again.');
  }
}
async function saved(billing: Billing, id: string | undefined) {
  assertSession(id);
  queryClient.setQueryData(billingKeys.detail(), {data: billing});
  await queryClient.invalidateQueries();
  assertSession(id);
}
async function refreshAfterError(id: string | undefined) {
  if (id && getSession()?.id === id) {
    await queryClient.invalidateQueries({queryKey: billingKeys.all});
  }
}
export function useBilling() {
  return useQuery({
    queryKey: billingKeys.detail(),
    queryFn: ({signal}) => call(client.GET('/v1/coach/billing', {signal})),
    staleTime: 0,
  });
}
export function useCheckout() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (body: BillingCheckout) => call(client.POST('/v1/coach/billing/checkout', {body})),
    onSuccess: (result, _body, id) => saved(result.data.billing, id),
    onError: (_error, _body, id) => refreshAfterError(id),
  });
}
export function useBillingAction() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (action: 'sync' | 'cancel') =>
      action === 'sync' ? call(client.POST('/v1/coach/billing/sync')) : call(client.POST('/v1/coach/billing/cancel')),
    onSuccess: (result, _action, id) => saved(result.data, id),
    onError: (_error, _action, id) => refreshAfterError(id),
  });
}
