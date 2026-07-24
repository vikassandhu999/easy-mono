/**
 * Shared class constants + micro-components for the client-detail (CD) family
 * of screens. Values are the computed styles of `Client Detail.dc.html`,
 * expressed through the cd-* tokens in index.css (never px literals) and
 * verified by design-handoff/scripts/style-diff.mjs (manifest CD-OV.json).
 */
import {Button, Skeleton, Typography} from '@heroui/react';

/** `.card` — 16px radius, hairline border, white surface. */
export const CD_CARD = 'rounded-cd-card border border-border bg-surface';

/** `.btnA` — accent-filled button (design uses literal white text). */
export const CD_BTN_A =
  'min-w-0 shrink-0 [column-gap:normal] [row-gap:normal] rounded-cd-btn bg-accent font-btn text-pill font-bold leading-none [color:white] [box-shadow:none]';

/** `.btnG` — white outline button. */
export const CD_BTN_G =
  'min-w-0 shrink-0 [column-gap:normal] [row-gap:normal] rounded-cd-btn border border-border bg-surface font-btn text-pill font-bold leading-none text-foreground [box-shadow:none]';

/** `.eyebrow` */
export const CD_EYEBROW = 'text-eyebrow font-bold uppercase tracking-wider text-muted';

/** `.chip` base — HeroUI Chip resets; pair with a tone class + `[color:...]`. */
export const CD_CHIP =
  'inline-flex min-h-0 items-center gap-1.25 whitespace-nowrap rounded-pill border-0 px-2.5 py-0.75 text-eyebrow font-bold leading-[normal] [box-shadow:none]';

export function CdCardSkeleton({lines = 3}: {lines?: number}) {
  return (
    <div className={`${CD_CARD} flex flex-col gap-3 p-3.75`}>
      {Array.from({length: lines}, (_, i) => (
        <Skeleton
          className={`h-4 ${i === 0 ? 'w-1/3' : 'w-full'} rounded-cd-btn`}
          key={i}
        />
      ))}
    </div>
  );
}

export function CdCardError({label, onRetry}: {label: string; onRetry: () => void}) {
  return (
    <div className={`${CD_CARD} border-danger/30 bg-danger-soft p-3.75`}>
      <Typography
        className="flex items-center gap-2 text-danger-soft-foreground"
        type="body-sm"
      >
        Couldn&apos;t load {label}.
        <Button
          className="h-auto min-h-0 bg-transparent p-0 font-semibold underline [color:inherit]"
          onPress={onRetry}
          size="sm"
          variant="ghost"
        >
          Retry
        </Button>
      </Typography>
    </div>
  );
}
