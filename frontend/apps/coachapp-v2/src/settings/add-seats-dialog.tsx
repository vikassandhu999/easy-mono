/**
 * Self-contained "Add seats" trigger + confirmation dialog. Shared by the
 * billing page (Task 9) and the invite-client flow's seat-limit prompt
 * (Task 10) — keep the props surface minimal (`onDone`) so both callers can
 * drop it in without extra wiring.
 */
import {AlertDialog, Button, toast} from '@heroui/react';
import {useState} from 'react';
import {NumberInput} from '@/@components/number-input';
import {type BillingSummary, useCheckoutSeatsMutation, useGetBillingQuery} from '@/api/billing';
import {getApiErrorMessage} from '@/api/shared';
import {openRazorpayCheckout} from '@/lib/razorpay';

export function AddSeatsDialog({
  onDone,
  onActivating,
}: {
  onDone?: () => void;
  /**
   * Called instead of the default toast/refetch when checkout requires
   * payment confirmation (the modal path) — receives the pre-checkout
   * billing snapshot. The caller owns the pending-activation UI (Billing
   * page). When omitted, falls back to the default toast + refetch.
   */
  onActivating?: (snapshot: BillingSummary) => void;
}) {
  const [seats, setSeats] = useState<number | undefined>(1);
  const [checkout, {isLoading}] = useCheckoutSeatsMutation();
  const {data, refetch} = useGetBillingQuery();
  const price = data?.data.monthly_seat_price_inr;

  const buy = async (close: () => void) => {
    const seatsToAdd = Math.floor(seats ?? 0);
    if (seatsToAdd < 1) {
      return;
    }
    const snapshot = data?.data;
    try {
      const result = await checkout({seats_to_add: seatsToAdd}).unwrap();
      if (result.data.action === 'checkout' && result.data.checkout) {
        await openRazorpayCheckout({
          keyId: result.data.checkout.key_id,
          subscriptionId: result.data.checkout.subscription_id,
          onSuccess: () => {
            close();
            if (onActivating && snapshot) {
              onActivating(snapshot);
            } else {
              // no pending-activation UI wired up here; fall back to a toast
              toast.success('Payment received. Seats will activate shortly.');
              refetch();
              onDone?.();
            }
          },
          onDismiss: () => {
            toast.info('Checkout cancelled — no charge was made.');
          },
        });
      } else {
        toast.success(`Added ${seatsToAdd} seat${seatsToAdd > 1 ? 's' : ''}`);
        close();
        onDone?.();
      }
    } catch (err) {
      toast.danger(getApiErrorMessage(err, "Couldn't add seats"));
    }
  };

  return (
    <AlertDialog>
      <Button variant="secondary">Add seats</Button>
      <AlertDialog.Backdrop isDismissable={!isLoading}>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[400px]">
            {({close}) => (
              <>
                <AlertDialog.CloseTrigger />
                <AlertDialog.Header>
                  <AlertDialog.Heading>Add seats</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <NumberInput
                    fullWidth
                    isRequired
                    label="Seats"
                    minValue={1}
                    onChange={setSeats}
                    value={seats}
                  />
                  {price !== undefined ? <p className="mt-3 text-sm text-muted">₹{price} / seat / month</p> : null}
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button
                    isDisabled={isLoading}
                    slot="close"
                    variant="tertiary"
                  >
                    Cancel
                  </Button>
                  <Button
                    isDisabled={!seats || seats < 1}
                    isPending={isLoading}
                    onPress={() => buy(close)}
                  >
                    {isLoading ? 'Adding' : 'Add seats'}
                  </Button>
                </AlertDialog.Footer>
              </>
            )}
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
