import {cva, type VariantProps} from 'class-variance-authority';
import type * as React from 'react';
import {
  Button as ButtonPrimitive,
  Link as LinkPrimitive,
  type LinkProps as LinkPrimitiveProps,
} from 'react-aria-components';
import {cn} from './cn';

const buttonVariants = cva(
  'group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-transparent text-sm font-semibold whitespace-nowrap outline-none transition-colors select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-[18px]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 pressed:bg-primary/80',
        outline: 'border-border bg-surface hover:bg-muted pressed:bg-muted',
        secondary: 'bg-muted hover:bg-border/60 pressed:bg-border/80',
        ghost: 'hover:bg-muted pressed:bg-muted',
        destructive: 'bg-destructive/10 text-destructive hover:bg-destructive/15',
        link: 'text-primary underline underline-offset-4 hover:bg-muted',
      },
      size: {
        default: 'h-12 px-5',
        xs: 'h-11 px-3',
        sm: 'h-11 px-4',
        lg: 'h-12 px-6',
        icon: 'size-12',
        'icon-xs': 'size-11',
        'icon-sm': 'size-11',
        'icon-lg': 'size-12',
      },
    },
    defaultVariants: {variant: 'default', size: 'default'},
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: Omit<React.ComponentProps<typeof ButtonPrimitive>, 'className'> &
  VariantProps<typeof buttonVariants> & {
    className?: string;
  }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({variant, size, className}))}
      {...props}
    />
  );
}

function LinkButton({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: Omit<LinkPrimitiveProps, 'className'> &
  VariantProps<typeof buttonVariants> & {
    className?: string;
  }) {
  return (
    <LinkPrimitive
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({variant, size, className}))}
      {...props}
    />
  );
}

export {Button, buttonVariants, LinkButton};
