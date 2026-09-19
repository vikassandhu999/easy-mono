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
      <header className="mx-auto flex max-w-md items-center gap-2 px-6 py-7">
        <span className="text-xl font-semibold tracking-tight">easy</span>
        <span className="border-l border-border pl-2 text-sm text-muted-foreground">Your coaching</span>
      </header>
      <main
        ref={main}
        tabIndex={-1}
        className="mx-auto w-full max-w-md break-words px-6 pb-12 pt-8 outline-none"
      >
        <div className="mb-8 space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-base leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
