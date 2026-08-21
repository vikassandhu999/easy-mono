import {Button, Fieldset, Spinner} from '@heroui/react';
import {cn} from '@heroui/styles';
import {Check} from 'lucide-react';
import type {ReactNode} from 'react';

// The single submit/cancel row for every form. Owns the action-row gap (gap-3),
// the pending pattern, and the mobile sticky-footer treatment (every ported form
// needs it — don't re-wrap this at the call site). `mt-auto` pins short mobile
// forms to the viewport footer; FormLayout's gap-8 keeps long forms separated.
//
// Pending state overlays the spinner on the (invisible) label instead of
// swapping children, so the button's width never changes mid-submit — no
// layout shift. submittingLabel is announced to screen readers only.

type FormActionsProps = {
  isSubmitting?: boolean;
  /**
   * For screens whose primary action lives in the page header at desktop width —
   * the builders. Keeps the mobile sticky footer (the header button is hidden
   * there) without drawing a second Save row beside it on desktop.
   */
  mobileOnly?: boolean;
  onCancel: () => void;
  submitLabel: string;
  submittingLabel: string;
  submitIcon?: ReactNode;
  cancelLabel?: string;
};

export function FormActions({
  cancelLabel = 'Cancel',
  isSubmitting,
  mobileOnly,
  onCancel,
  submitIcon,
  submitLabel,
  submittingLabel,
}: FormActionsProps) {
  const merged = cn(
    'sticky bottom-0 z-10 -mx-4 -mb-6 mt-auto flex items-center gap-3 bg-background px-4 py-3 sm:static sm:mx-0 sm:mt-0 sm:mb-0 sm:justify-end sm:bg-transparent sm:px-0 sm:py-0',
    mobileOnly && 'sm:hidden',
  );

  return (
    <Fieldset.Actions {...(merged ? {className: merged} : {})}>
      <Button
        className="border-0 text-muted shadow-none sm:border sm:text-foreground"
        onPress={onCancel}
        variant="outline"
      >
        {cancelLabel}
      </Button>
      <Button
        className="relative flex-1 sm:flex-none"
        {...(isSubmitting != null ? {isPending: isSubmitting} : {})}
        type="submit"
      >
        <span className={`flex items-center gap-2 ${isSubmitting ? 'invisible' : ''}`}>
          {submitIcon ?? <Check />}
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
