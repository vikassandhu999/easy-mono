import {api} from '@/api/base';
import type {BillingCheckoutRequest, BillingCheckoutResponse, BillingResponse, BillingSummary} from '@/api/generated';

export type {BillingEvent, BillingSummary} from '@/api/generated';

const billingApi = api.injectEndpoints({
  // Hand-managed endpoints (cache tags, precise types) that share names with
  // the generated client — override makes these authoritative regardless of
  // import order.
  overrideExisting: true,
  endpoints: (build) => ({
    getBilling: build.query<BillingResponse, void>({
      query: () => '/v1/coach/billing',
      providesTags: [{type: 'Billing', id: 'SUMMARY'}],
    }),
    checkoutBilling: build.mutation<BillingCheckoutResponse, BillingCheckoutRequest>({
      query: (body) => ({
        url: '/v1/coach/billing/checkout',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        {type: 'Billing', id: 'SUMMARY'},
        {type: 'Client', id: 'LIST'},
      ],
    }),
    cancelBilling: build.mutation<BillingResponse, void>({
      query: () => ({url: '/v1/coach/billing/cancel', method: 'POST'}),
      invalidatesTags: [{type: 'Billing', id: 'SUMMARY'}],
    }),
    syncBilling: build.mutation<BillingResponse, void>({
      query: () => ({url: '/v1/coach/billing/sync', method: 'POST'}),
      invalidatesTags: [{type: 'Billing', id: 'SUMMARY'}],
    }),
  }),
});

export const {
  useGetBillingQuery,
  useCheckoutBillingMutation: useCheckoutSeatsMutation,
  useCancelBillingMutation,
  useSyncBillingMutation,
} = billingApi;

/** Extract the seat summary from a 409 seat_limit_reached error, or null. */
export function getSeatLimitError(err: unknown): {seatSummary: BillingSummary} | null {
  const e = err as {status?: number; data?: {error_code?: string; seat_summary?: BillingSummary}};
  if (e?.status === 409 && e?.data?.error_code === 'seat_limit_reached' && e.data.seat_summary) {
    return {seatSummary: e.data.seat_summary};
  }
  return null;
}
