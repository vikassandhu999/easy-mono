import type {ReactNode} from 'react';

// The one "secondary action below the form" block for auth screens (Sign in /
// Sign up switch, Resend code). Centered, muted caption + a single link.

export function AuthFooter({children}: {children: ReactNode}) {
  return <div className="mt-6 flex items-center justify-center gap-1 text-center text-sm text-muted">{children}</div>;
}
