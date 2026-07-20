import {Button, Fieldset, Spinner} from '@heroui/react';
import {Check} from 'lucide-react';

// The single submit/cancel row for every form. Owns the action-row gap (gap-3),
// the pending pattern, and the mobile sticky-footer treatment (every ported form
// needs it — don't re-wrap this at the call site). FormLayout's gap-8 provides
// the separation above it, so no top margin here.
//
// Pending state overlays the spinner on the (invisible) label instead of
// swapping children, so the button's width never changes mid-submit — no
// layout shift. submittingLabel is announced to screen readers only.

type FormActionsProps = {
  isSubmitting?: boolean;
  onCancel: () => void;
  submitLabel: string;
  submittingLabel: string;
  cancelLabel?: string;
};

export function FormActions({
  cancelLabel = 'Cancel',
  isSubmitting,
  onCancel,
  submitLabel,
  submittingLabel,
}: FormActionsProps) {
  return (
    <Fieldset.Actions className="sticky bottom-0 -my-2 flex justify-end gap-3 bg-background py-2 sm:static sm:my-0 sm:bg-transparent sm:py-0">
      <Button
        onPress={onCancel}
        variant="outline"
      >
        {cancelLabel}
      </Button>
      <Button
        className="relative"
        isPending={isSubmitting}
        type="submit"
      >
        <span className={`flex items-center gap-2 ${isSubmitting ? 'invisible' : ''}`}>
          <Check className="size-4" />
          {submitLabel}
        </span>
        {isSubmitting ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner
              color="current"
              size="sm"
            />
            <span className="sr-only">{submittingLabel}</span>
          </span>
        ) : null}
      </Button>
    </Fieldset.Actions>
  );
}
