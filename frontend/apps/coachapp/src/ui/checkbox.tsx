'use client';

import {CheckIcon} from 'lucide-react';
import {Checkbox as CheckboxPrimitive, type CheckboxProps, composeRenderProps} from 'react-aria-components';
import {cn} from './cn';

function Checkbox({className, children, ...props}: CheckboxProps) {
  return (
    <CheckboxPrimitive
      data-slot="checkbox"
      className={cn(
        'group flex min-h-11 cursor-pointer items-center gap-3 rounded-lg text-sm outline-none data-focus-visible:ring-2 data-focus-visible:ring-ring data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      {composeRenderProps(children, (children, {isSelected, isIndeterminate}) => (
        <>
          <span
            data-slot="checkbox-indicator"
            className="grid size-5 shrink-0 place-content-center rounded border border-input text-primary-foreground group-data-selected:border-primary group-data-selected:bg-primary [&>svg]:size-3.5"
          >
            {(isSelected || isIndeterminate) && <CheckIcon />}
          </span>
          {children}
        </>
      ))}
    </CheckboxPrimitive>
  );
}

export {Checkbox};
