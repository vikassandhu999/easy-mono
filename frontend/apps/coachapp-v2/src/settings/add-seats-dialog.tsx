/**
 * Self-contained "Add seats" trigger + overlay. Shared by the billing tab and
 * the invite-client / client-detail seat-limit prompts — keep the props surface
 * minimal (`onDone`) so every caller can drop it in without extra wiring.
 *
 * INTERACTIONS.md § ST: a − / + stepper (min 1) with a live monthly cost, in the
 * canonical responsive overlay (UI-CONTRACT §2) — `Popover` on desktop,
 * `KeyboardSheet` on mobile, one shared content component. The spec's stepper has
 * no free-text entry, so the value is driven by the two buttons rather than a
 * `NumberInput`; nothing here opens a soft keyboard.
 */
import {Button, Popover, Typography, toast} from '@heroui/react';
import {Minus, Plus} from 'lucide-react';
import {useRef, useState} from 'react';

import {useIsDesktop} from '@/@hooks/use-is-desktop';
import {type BillingSummary, useCheckoutSeatsMutation, useGetBillingQuery} from '@/api/billing';
import {getApiErrorMessage} from '@/api/shared';
import {KeyboardSheet} from '@/builder-kit/keyboard-sheet';
import {openRazorpayCheckout} from '@/lib/razorpay';

const TITLE = 'Add seats';

function AddSeatsContent({
  isLoading,
  onCancel,
  onConfirm,
  price,
  seats,
  setSeats,
}: {
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  price: number | undefined;
  seats: number;
  setSeats: (seats: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Typography
        color="muted"
        type="body-sm"
      >
        Seats to add
      </Typography>

      <div className="flex items-center justify-center gap-3.5">
        <Button
          aria-label="Fewer seats"
          className="rounded-control"
          isDisabled={seats <= 1 || isLoading}
          isIconOnly
          onPress={() => setSeats(Math.max(1, seats - 1))}
          variant="outline"
        >
          <Minus className="size-4" />
        </Button>
        <Typography
          align="center"
          className="min-w-13 font-grotesk"
          type="h2"
          weight="semibold"
        >
          {seats}
        </Typography>
        <Button
          aria-label="More seats"
          className="rounded-control"
          isDisabled={isLoading}
          isIconOnly
          onPress={() => setSeats(seats + 1)}
          variant="outline"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {price !== undefined ? (
        <Typography
          align="center"
          color="muted"
          type="body-sm"
        >
          ₹{price * seats} / month
        </Typography>
      ) : null}

      <div className="flex gap-2">
        <Button
          className="flex-1 rounded-control"
          isDisabled={isLoading}
          onPress={onCancel}
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          className="flex-1 rounded-control"
          isPending={isLoading}
          onPress={onConfirm}
        >
          {isLoading ? 'Adding' : TITLE}
        </Button>
      </div>
    </div>
  );
}

export function AddSeatsDialog({
  onDone,
  onActivating,
  isTriggerDisabled,
}: {
  onDone?: () => void;
  /**
   * Called instead of the default toast/refetch when checkout requires
   * payment confirmation (the modal path) — receives the pre-checkout
   * billing snapshot. The caller owns the pending-activation UI (Billing
   * tab). When omitted, falls back to the default toast + refetch.
   */
  onActivating?: (snapshot: BillingSummary) => void;
  /**
   * Disables the "Add seats" trigger without hiding it — used while a prior
   * checkout is still activating, so a second checkout can't overwrite the
   * pending subscription and strand the first payment's webhook.
   */
  isTriggerDisabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [seats, setSeats] = useState(1);
  const isDesktop = useIsDesktop();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [checkout, {isLoading}] = useCheckoutSeatsMutation();
  const {data, refetch} = useGetBillingQuery();
  const price = data?.data.monthly_seat_price_inr;

  const close = () => setOpen(false);

  const buy = async () => {
    const snapshot = data?.data;
    try {
      const result = await checkout({seats_to_add: seats}).unwrap();
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
        toast.success(`Added ${seats} seat${seats > 1 ? 's' : ''}`);
        close();
        onDone?.();
      }
    } catch (err) {
      toast.danger(getApiErrorMessage(err, "Couldn't add seats"));
    }
  };

  const trigger = (
    <Button
      isDisabled={isTriggerDisabled}
      onPress={() => {
        setSeats(1);
        setOpen(true);
      }}
      ref={triggerRef}
      variant="primary"
    >
      <Plus className="size-4" />
      {TITLE}
    </Button>
  );

  const content = (
    <AddSeatsContent
      isLoading={isLoading}
      onCancel={close}
      onConfirm={buy}
      price={price}
      seats={seats}
      setSeats={setSeats}
    />
  );

  if (isDesktop) {
    return (
      <>
        {trigger}
        <Popover
          isOpen={open}
          onOpenChange={(next) => !next && close()}
        >
          <Popover.Content
            className="w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface shadow-xl"
            triggerRef={triggerRef}
          >
            <Popover.Dialog className="p-4 outline-none">
              <Typography
                className="mb-3 font-grotesk"
                type="h5"
              >
                {TITLE}
              </Typography>
              {open ? content : null}
            </Popover.Dialog>
          </Popover.Content>
        </Popover>
      </>
    );
  }

  return (
    <>
      {trigger}
      <KeyboardSheet
        onClose={close}
        open={open}
        title={TITLE}
      >
        {open ? content : null}
      </KeyboardSheet>
    </>
  );
}
