import {LoaderCircle} from 'lucide-react';
import type {ReactNode} from 'react';
import {Button} from './button';

export function SubmitButton({pending, children}: {pending: boolean; children: ReactNode}) {
  return (
    <Button
      type="submit"
      className="relative w-full"
      isPending={pending}
    >
      <span className={pending ? 'invisible' : undefined}>{children}</span>
      {pending && (
        <LoaderCircle
          aria-hidden="true"
          className="absolute animate-spin motion-reduce:animate-none"
        />
      )}
      <span
        className="sr-only"
        role="status"
      >
        {pending ? 'Please wait' : ''}
      </span>
    </Button>
  );
}
