import {ArrowLeft} from 'lucide-react';
import {type ReactNode, useEffect, useRef} from 'react';
import {Link, useLocation} from 'react-router-dom';
import {CoachingEnded} from './coaching';

export function Page({
  title,
  description,
  back,
  compact = false,
  children,
}: {
  title: string;
  description?: string | undefined;
  back?: string;
  compact?: boolean;
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
      <CoachingEnded />
      <header className={compact ? 'page-heading page-heading-compact' : 'page-heading'}>
        {back && (
          <Link
            className="back-button"
            to={back}
            aria-label="Back"
          >
            <ArrowLeft
              className="size-5"
              aria-hidden="true"
            />
          </Link>
        )}
        <div>
          <h1
            className="text-[2rem] leading-[1.12] font-extrabold tracking-tight outline-none"
            tabIndex={-1}
            ref={heading}
          >
            {title}
          </h1>
          {description && <p className="text-muted-foreground leading-relaxed">{description}</p>}
        </div>
      </header>
      {children}
    </main>
  );
}
