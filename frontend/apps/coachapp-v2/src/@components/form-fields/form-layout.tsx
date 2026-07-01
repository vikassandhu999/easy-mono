import {Form} from '@heroui/react';
import {cn} from '@heroui/styles';
import type {ComponentProps, ReactNode} from 'react';

// The canonical form shell. Bakes the one form width (max-w-160) and the one
// section-to-section gap (gap-8 / 32px) so individual forms never set their own
// max-width or inter-section spacing. Left-aligned (not centered) so the form
// column lines up with the left-aligned Page.Header above it.

type FormLayoutProps = {
  children: ReactNode;
  className?: string;
  onSubmit: ComponentProps<typeof Form>['onSubmit'];
};

export function FormLayout({children, className, onSubmit}: FormLayoutProps) {
  return (
    <Form
      className={cn('flex w-full max-w-160 flex-col gap-8', className)}
      onSubmit={onSubmit}
    >
      {children}
    </Form>
  );
}
