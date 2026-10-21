import type {ComponentProps} from 'react';

export function FormError({
  message,
  ...props
}: {message: string | undefined} & Pick<ComponentProps<'p'>, 'ref' | 'tabIndex'>) {
  return message ? (
    <p
      {...props}
      role="alert"
      className="rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
    >
      {message}
    </p>
  ) : null;
}
