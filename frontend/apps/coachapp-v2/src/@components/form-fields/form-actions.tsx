import {Button, Fieldset, Spinner} from '@heroui/react';

// The single submit/cancel row for every form. Owns the action-row gap (gap-3)
// and the pending pattern (spinner + present-participle label). FormLayout's
// gap-8 provides the separation above it, so no top margin here.

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
    <Fieldset.Actions className="flex gap-3">
      <Button
        isPending={isSubmitting}
        type="submit"
      >
        {isSubmitting ? (
          <>
            <Spinner
              color="current"
              size="sm"
            />
            {submittingLabel}
          </>
        ) : (
          submitLabel
        )}
      </Button>
      <Button
        onPress={onCancel}
        variant="ghost"
      >
        {cancelLabel}
      </Button>
    </Fieldset.Actions>
  );
}
