import {type ReactNode, useEffect, useRef} from 'react';
import {Link, useLocation} from 'react-router-dom';

export function Page({
  title,
  description,
  back,
  children,
}: {
  title: string;
  description?: string | undefined;
  back?: string;
  children: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const {pathname} = useLocation();
  // biome-ignore lint/correctness/useExhaustiveDependencies: Focus a route heading once on navigation.
  useEffect(() => {
    heading.current?.focus({preventScroll: true});
  }, [pathname]);
  return (
    <main className="page">
      {back && (
        <Link
          className="text-link inline-flex min-h-11 items-center mb-4"
          to={back}
        >
          Back
        </Link>
      )}
      <header className="mb-8 space-y-2">
        <h1
          className="text-3xl font-semibold tracking-tight outline-none"
          tabIndex={-1}
          ref={heading}
        >
          {title}
        </h1>
        {description && <p className="text-muted-foreground leading-relaxed">{description}</p>}
      </header>
      {children}
    </main>
  );
}
