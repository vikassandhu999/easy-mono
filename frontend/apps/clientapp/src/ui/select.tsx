import {CheckIcon, ChevronDownIcon, SearchIcon} from 'lucide-react';
import * as React from 'react';
import {
  Button as ButtonPrimitive,
  composeRenderProps,
  Header as HeaderPrimitive,
  ListBoxItem as ListBoxItemPrimitive,
  ListBox as ListBoxPrimitive,
  type ListBoxProps,
  ListBoxSection as ListBoxSectionPrimitive,
  Popover as PopoverPrimitive,
  SearchField,
  type SearchFieldProps,
  type ListBoxSectionProps as SelectGroupProps,
  Select as SelectPrimitive,
  type SelectProps,
  SelectValue as SelectValuePrimitive,
  type SelectValueProps,
  Separator as SeparatorPrimitive,
} from 'react-aria-components';

import {InputGroup, InputGroupAddon, InputGroupInput} from '@/ui/input-group';
import {cn} from './cn';

function Select<T extends object, M extends 'single' | 'multiple' = 'single'>({
  className,
  ...props
}: SelectProps<T, M>) {
  return (
    <SelectPrimitive
      data-slot="select"
      className={cn('min-w-0', className)}
      {...props}
    />
  );
}

function SelectGroup<T extends object>({className, ...props}: SelectGroupProps<T>) {
  return (
    <ListBoxSectionPrimitive
      data-slot="select-group"
      className={cn('scroll-my-1 p-1', className)}
      {...props}
    />
  );
}

function SelectValue<T extends object>({className, children, ...props}: SelectValueProps<T>) {
  return (
    <SelectValuePrimitive
      data-slot="select-value"
      className={cn('block min-w-0 flex-1 truncate text-left data-placeholder:text-muted-foreground', className)}
      {...props}
    >
      {typeof children === 'function'
        ? children
        : ({selectedItems, selectedText, defaultChildren}) =>
            selectedItems.length > 1 ? selectedText : defaultChildren}
    </SelectValuePrimitive>
  );
}

function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}: Omit<React.ComponentProps<typeof ButtonPrimitive>, 'children'> & {
  children?: React.ReactNode;
  size?: 'sm' | 'default';
}) {
  return (
    <ButtonPrimitive
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex min-w-0 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2.5 pl-3 text-base font-normal text-foreground whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-12 data-[size=sm]:h-11 data-[size=sm]:rounded-[min(var(--radius-md),10px)] dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
    </ButtonPrimitive>
  );
}

function SelectContent({
  className,
  children,
  placement = 'bottom start',
  offset = 4,
  crossOffset = 0,
  ...props
}: Omit<React.ComponentProps<typeof PopoverPrimitive>, 'className' | 'children'> & {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <SelectPopover
      {...(className ? {className} : {})}
      placement={placement}
      offset={offset}
      crossOffset={crossOffset}
      {...props}
    >
      <SelectList>{children}</SelectList>
    </SelectPopover>
  );
}

function SelectPopover({
  className,
  children,
  placement = 'bottom start',
  offset = 4,
  crossOffset = 0,
  ...props
}: Omit<React.ComponentProps<typeof PopoverPrimitive>, 'className' | 'children'> & {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <PopoverPrimitive
      data-slot="select-content"
      placement={placement}
      offset={offset}
      crossOffset={crossOffset}
      className={cn(
        'relative isolate z-50 w-(--trigger-width) min-w-36 max-w-[calc(100vw-2rem)] origin-(--trigger-anchor-point) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 **:data-[slot$=-item]:data-focused:bg-foreground/10',
        className,
      )}
      {...props}
    >
      {children}
    </PopoverPrimitive>
  );
}

function SelectList<T extends object>({className, ...props}: ListBoxProps<T>) {
  return (
    <ListBoxPrimitive
      data-slot="select-list"
      className={cn(
        'group/select-list max-h-[inherit] overflow-x-hidden overflow-y-auto overscroll-contain p-1 outline-hidden',
        className,
      )}
      {...props}
    />
  );
}

function SelectInput({className, ...props}: SearchFieldProps) {
  return (
    <SearchField
      {...props}
      autoFocus
      data-slot="select-input-wrapper"
      className={cn('p-1 pb-0', className)}
    >
      <InputGroup>
        <InputGroupInput
          data-slot="select-input"
          className="[&::-webkit-search-cancel-button]:hidden"
        />
        <InputGroupAddon>
          <SearchIcon className="size-4 shrink-0 opacity-50" />
        </InputGroupAddon>
      </InputGroup>
    </SearchField>
  );
}

function SelectLabel({className, ...props}: React.ComponentProps<typeof HeaderPrimitive>) {
  return (
    <HeaderPrimitive
      data-slot="select-label"
      className={cn('px-1.5 py-1 text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

function SelectItem({className, children, ...props}: React.ComponentProps<typeof ListBoxItemPrimitive>) {
  return (
    <ListBoxItemPrimitive
      data-slot="select-item"
      {...(typeof children === 'string' ? {textValue: children} : {})}
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 min-h-11 rounded-md py-2.5 pr-8 pl-3 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-focused:bg-accent data-focused:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className,
      )}
      {...props}
    >
      {composeRenderProps(children, (children, {isSelected}) => (
        <>
          <span className="flex min-w-0 flex-1 gap-2 break-words">{children}</span>
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
            {isSelected ? <CheckIcon className="pointer-events-none" /> : null}
          </span>
        </>
      ))}
    </ListBoxItemPrimitive>
  );
}

function SelectSeparator({className, ...props}: React.ComponentProps<typeof SeparatorPrimitive>) {
  return (
    <SeparatorPrimitive
      data-slot="select-separator"
      className={cn('pointer-events-none -mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  );
}

function SelectEmpty({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="select-empty"
      className={cn(
        'hidden w-full justify-center py-2 text-center text-sm text-muted-foreground group-data-empty/select-list:flex',
        className,
      )}
      {...props}
    />
  );
}

export {
  Select,
  SelectContent,
  SelectEmpty,
  SelectGroup,
  SelectInput,
  SelectItem,
  SelectLabel,
  SelectList,
  SelectPopover,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
