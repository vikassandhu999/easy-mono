import {Typography} from '@heroui/react';
import type {LucideIcon} from 'lucide-react';
import type {ReactNode} from 'react';

/**
 * The centred "nothing here yet" block, from the dc.html's empty card:
 *
 *   padding:44px 22px; display:flex; flex-direction:column; align-items:center;
 *   text-align:center; gap:6px
 *   icon tile  52px, radius 15px, background var(--surface-tertiary), muted
 *   title      gk 16px/600  -> `--type-title`
 *   body       12.5px muted, max-width 320px -> `--type-eyebrow`
 *
 * One component because Client Detail alone needs nine of these, and because
 * hand-rolling it hits a trap that is invisible until you look at it:
 *
 *   `Typography` ALWAYS emits `.typography--align-start`, whether or not you asked
 *   for it — it is the default — and that class is `text-align: left`. So a wrapper
 *   saying `text-center` is silently ignored, and the block renders left-aligned
 *   inside a centred box. Nothing errors and the classes all look right.
 *
 * `align="center"` is therefore not decoration here, it is the fix, and stating it
 * once is the whole point of this file. `ListEmptyState` had the same bug for as
 * long as it has existed.
 */
export function EmptyState({
  action,
  body,
  icon: Icon,
  title,
}: {
  action?: ReactNode;
  body?: string;
  icon?: LucideIcon | undefined;
  title: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-6 py-11 text-center">
      {Icon && (
        <span className="mb-0.5 flex size-13 items-center justify-center rounded-panel bg-surface-tertiary text-muted">
          <Icon className="size-6" />
        </span>
      )}
      <Typography
        align="center"
        type="h6"
      >
        {title}
      </Typography>
      {body && (
        <Typography
          align="center"
          className="max-w-80"
          color="muted"
          type="body-xs"
        >
          {body}
        </Typography>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
