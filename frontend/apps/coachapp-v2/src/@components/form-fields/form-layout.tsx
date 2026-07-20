import {Form} from '@heroui/react';
import {cn} from '@heroui/styles';
import type {ComponentProps, ReactNode} from 'react';

// The canonical form shell. Bakes the one form width (max-w-160) and the one
// section-to-section gap (gap-8 / 32px) so individual forms never set their own
// max-width or inter-section spacing. Centred, matching the redesign refs —
// Page's size tokens centre their column too, so header and form stay aligned.

type FormLayoutProps = {
  children: ReactNode;
  className?: string;
  onSubmit: ComponentProps<typeof Form>['onSubmit'];
  // Defaults to react-aria's native validation. Pass "aria" for forms that
  // surface server errors via setError: native validation marks the field
  // customInvalid and blocks the browser submit event before onSubmit can run,
  // which strands the form after a fixed 422. "aria" shows the errors without
  // blocking resubmission.
  validationBehavior?: ComponentProps<typeof Form>['validationBehavior'];
};

export function FormLayout({children, className, onSubmit, validationBehavior}: FormLayoutProps) {
  return (
    <Form
      className={cn('mx-auto flex w-full max-w-160 flex-col gap-8', className)}
      onSubmit={onSubmit}
      validationBehavior={validationBehavior}
    >
      {children}
    </Form>
  );
}
