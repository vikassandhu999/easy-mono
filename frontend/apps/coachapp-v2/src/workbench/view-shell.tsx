import {Typography} from '@heroui/react';
import type {ReactNode} from 'react';

/**
 * The frame every workbench view shares: a title + meta header, an optional
 * toolbar, then one surface card holding the list.
 *
 * The card HUGS its content — no `flex-1`, no `min-h-0`. `Page.Content` is the
 * scroll container and deliberately has no `min-h-0` (see `page.tsx`), so a
 * pane that stretches to the viewport turns a drained queue into ~600px of
 * empty card and a two-row queue into a void. A queue that shrinks as you work
 * it is the point.
 */
export function ViewShell({
  children,
  meta,
  title,
  toolbar,
}: {
  children: ReactNode;
  meta?: string | undefined;
  title: string;
  toolbar?: ReactNode | undefined;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <header className="flex items-baseline justify-between gap-3">
        <Typography
          className="font-grotesk"
          type="h6"
        >
          {title}
        </Typography>
        {meta ? (
          <Typography
            color="muted"
            type="body-xs"
          >
            {meta}
          </Typography>
        ) : null}
      </header>
      {toolbar}
      <div className="min-w-0 overflow-hidden rounded-card border border-border bg-surface">{children}</div>
    </section>
  );
}
