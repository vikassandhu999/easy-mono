import {type ComponentProps, useEffect, useRef} from 'react';

export function FormError({
  message,
  ref,
  ...props
}: {message: string | undefined} & Pick<ComponentProps<'p'>, 'ref' | 'tabIndex'>) {
  const fallbackRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (message) {
      fallbackRef.current?.focus();
    }
  }, [message]);
  return message ? (
    <p
      ref={ref ?? fallbackRef}
      tabIndex={-1}
      {...props}
      role="alert"
      className="rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
    >
      {message}
    </p>
  ) : null;
}
