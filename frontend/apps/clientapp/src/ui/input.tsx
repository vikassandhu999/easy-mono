'use client';

import type * as React from 'react';
import {composeRenderProps, Input as InputPrimitive} from 'react-aria-components';
import {cn} from './cn';

function Input({className, type, ...props}: React.ComponentProps<typeof InputPrimitive>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={composeRenderProps(className, (className) =>
        cn(
          'h-12 w-full min-w-0 rounded-xl border border-input bg-surface px-3.5 py-2 text-base leading-6 transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/15',
          className,
        ),
      )}
      {...props}
    />
  );
}

export {Input};
