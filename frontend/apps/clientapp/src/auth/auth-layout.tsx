import {Dumbbell, Flower2, Heart, Sparkles} from 'lucide-react';
import {type ReactNode, useEffect, useRef} from 'react';
import {useLocation} from 'react-router-dom';

export {FormError} from '../ui/form-error';

export function AuthLayout({title, description, children}: {title: string; description: string; children: ReactNode}) {
  const main = useRef<HTMLElement>(null);
  const {pathname} = useLocation();
  // biome-ignore lint/correctness/useExhaustiveDependencies: Announce a new screen or resolved loading state without interrupting form edits.
  useEffect(() => {
    main.current?.focus({preventScroll: true});
  }, [pathname, title]);
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="app-header">
        <span className="app-brand">
          <Flower2 aria-hidden="true" />
          easy
        </span>
        <span className="brand-tag">A little better, together.</span>
      </header>
      <main
        ref={main}
        tabIndex={-1}
        className="page auth-page outline-none"
      >
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
        <div className="mb-8 space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight">{title}</h1>
          <p className="text-base leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
