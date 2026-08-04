import {Form} from '@heroui/react';
import {cn} from '@heroui/styles';
import type {ComponentProps, ReactNode} from 'react';

// The canonical form shell. Bakes the one section-to-section gap; the column
// section-to-section gap (gap-8 / 32px) so individual forms never set their own
// max-width or inter-section spacing. Centred, matching the redesign refs —
// Page's size tokens centre their column too, so header and form stay aligned.

type FormLayoutProps = {
  children: ReactNode;
  className?: string;
  onSubmit: ComponentProps<typeof Form>['onSubmit'];
  // "aria", not react-aria's native default: every form here validates through
  // react-hook-form + zod, and native validation blocks the browser submit
  // event before handleSubmit can run — an empty required field just silently
  // refocused with no message (the zod copy never fired), and a fixed 422
  // stranded the form because setError marked it customInvalid. "aria" lets
  // the submit reach RHF, whose errors render through each field's FieldError.
  validationBehavior?: ComponentProps<typeof Form>['validationBehavior'];
};

export function FormLayout({children, className, onSubmit, validationBehavior = 'aria'}: FormLayoutProps) {
  return (
    <Form
      className={cn('flex w-full flex-col gap-8', className)}
      onSubmit={onSubmit}
      validationBehavior={validationBehavior}
    >
      {children}
    </Form>
  );
}
