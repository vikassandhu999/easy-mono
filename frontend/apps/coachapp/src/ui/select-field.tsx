import type {ComponentProps, ReactNode, Ref} from 'react';
import {cn} from './cn';
import {Select, SelectContent, SelectTrigger, SelectValue} from './select';

type SelectFieldProps = Omit<
  ComponentProps<typeof Select<object>>,
  'children' | 'className' | 'value' | 'defaultValue' | 'onChange'
> & {
  children: ReactNode;
  className?: string;
  value?: string | number | null;
  defaultValue?: string | number;
  onChange?: (value: string) => void;
  triggerRef?: Ref<HTMLButtonElement>;
};

/** Connect an external field label to a consistently sized shadcn select. */
export function SelectField({
  id,
  className,
  children,
  value,
  defaultValue,
  onChange,
  triggerRef,
  ...props
}: SelectFieldProps) {
  return (
    <Select
      {...(id && !props['aria-label'] ? {'aria-labelledby': `${id}-label`} : {})}
      {...props}
      className={cn('w-full', className)}
      {...(value === undefined ? {} : {value: String(value ?? '')})}
      {...(defaultValue === undefined ? {} : {defaultValue: String(defaultValue)})}
      onChange={(selected) => onChange?.(selected === null ? '' : String(selected))}
    >
      <SelectTrigger
        {...(id ? {id} : {})}
        ref={triggerRef}
      >
        <SelectValue>{({selectedText, defaultChildren}) => selectedText || defaultChildren}</SelectValue>
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}
