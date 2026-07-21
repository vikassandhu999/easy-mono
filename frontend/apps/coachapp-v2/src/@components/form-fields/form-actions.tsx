import {Button, Fieldset, Spinner} from '@heroui/react';
import {cn} from '@heroui/styles';
import {Check} from 'lucide-react';
import type {ReactNode} from 'react';
import {STICKY_FOOTER_CLASS} from '@/@components/form-fields/form-classes';

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
  onCancel: () => void;
  submitLabel: string;
  submittingLabel: string;
  submitIcon?: ReactNode;
  cancelLabel?: string;
};

export function FormActions({
  cancelLabel = 'Cancel',
  isSubmitting,
  onCancel,
  submitIcon,
  submitLabel,
  submittingLabel,
}: FormActionsProps) {
  return (
    <Fieldset.Actions className={cn(STICKY_FOOTER_CLASS, '-mb-6 sm:mt-0 sm:mb-0 sm:justify-end')}>
      <Button
        className="min-h-11 border-0 text-muted shadow-none sm:min-h-9 sm:border sm:text-foreground"
        onPress={onCancel}
        variant="outline"
      >
        {cancelLabel}
      </Button>
      <Button
        className="relative min-h-11 flex-1 sm:min-h-9 sm:flex-none"
        isPending={isSubmitting}
        type="submit"
      >
        <span className={`flex items-center gap-2 ${isSubmitting ? 'invisible' : ''}`}>
          {submitIcon ?? <Check className="size-4" />}
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
