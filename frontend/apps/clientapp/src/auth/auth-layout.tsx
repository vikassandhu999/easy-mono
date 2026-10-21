import {ArrowLeft, Dumbbell, Flower2, Heart, Mail, Sparkles} from 'lucide-react';
import {type ReactNode, useEffect, useRef} from 'react';
import {Link, useLocation} from 'react-router-dom';

export {FormError} from '../ui/form-error';

export function AuthLayout({
  title,
  description,
  children,
  artwork = 'none',
  back,
}: {
  title: string;
  description: string;
  children: ReactNode;
  artwork?: 'welcome' | 'code' | 'none';
  back?: {to: string; label: string} | undefined;
}) {
  const main = useRef<HTMLElement>(null);
  const {pathname} = useLocation();
  // biome-ignore lint/correctness/useExhaustiveDependencies: Announce a new screen or resolved loading state without interrupting form edits.
  useEffect(() => {
    main.current?.focus({preventScroll: true});
  }, [pathname, title]);
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="app-header">
        {back && (
          <Link
            to={back.to}
            className="flex min-h-11 items-center gap-2 font-semibold text-primary"
          >
            <ArrowLeft
              aria-hidden="true"
              className="size-5"
            />
            {back.label}
          </Link>
        )}
        <span className="app-brand">
          <Flower2 aria-hidden="true" />
          easy
        </span>
        {!back && <span className="brand-tag">A little better, together.</span>}
      </header>
      <main
        ref={main}
        tabIndex={-1}
        className="page auth-page outline-none"
      >
        {artwork === 'welcome' && (
          <div
            className="welcome-art"
            aria-hidden="true"
          >
            <span>
              <Dumbbell />
            </span>
            <span>
              <Heart />
            </span>
            <span>
              <Sparkles />
            </span>
          </div>
        )}
        {artwork === 'code' && (
          <div
            aria-hidden="true"
            className="mb-6 grid size-16 place-items-center rounded-3xl bg-[var(--sunshine)] -rotate-6"
          >
            <Mail className="size-8 rotate-6" />
          </div>
        )}
        <div className="mb-8 space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight">{title}</h1>
          <p className="text-base leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
