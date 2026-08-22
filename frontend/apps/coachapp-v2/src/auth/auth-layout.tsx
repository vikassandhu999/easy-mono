import type {ReactNode} from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  description: string;
  title: string;
}

export default function AuthLayout({children, description, title}: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center overflow-y-auto px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="type-heading font-semibold md:type-metric">{title}</h1>
          <p className="mt-2 type-body text-muted">{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

// The one "secondary action below the form" block for auth screens (Sign in /
// Sign up switch, Resend code). Centered, muted caption + a single link.
export function AuthFooter({children}: {children: ReactNode}) {
  return <div className="mt-6 flex items-center justify-center gap-1 text-center type-body text-muted">{children}</div>;
}
