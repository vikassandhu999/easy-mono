/**
 * Shared class constants + micro-components for the client-detail (CD) family
 * of screens. Values are the computed styles of `Client Detail.dc.html`,
 * expressed through the cd-* tokens in index.css (never px literals) and
 * verified by design-handoff/scripts/style-diff.mjs (manifest CD-OV.json).
 */
import {Button, Skeleton, Typography} from '@heroui/react';
import {ArrowLeft, Image as ImageIcon} from 'lucide-react';
import {useState} from 'react';

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

/**
 * A progress-photo tile. Presigned URLs expire and dev fixtures have no storage
 * object behind them, so a failed load falls back to the placeholder glyph
 * rather than the browser's broken-image + alt text.
 */
export function CdPhotoThumb({
  className,
  iconClassName,
  src,
  testId,
}: {
  className: string;
  iconClassName: string;
  src: string | undefined;
  testId?: string;
}) {
  const [isBroken, setBroken] = useState(false);
  return (
    <span
      className={className}
      data-testid={testId}
    >
      {src && !isBroken ? (
        // biome-ignore lint/a11y/noNoninteractiveElementInteractions: load errors swap in the placeholder icon (same as message-attachments)
        <img
          alt="Progress"
          className="size-full object-cover"
          onError={() => setBroken(true)}
          src={src}
        />
      ) : (
        <ImageIcon className={iconClassName} />
      )}
    </span>
  );
}

/**
 * The focused sub-screen header every CD sub-page shares (DT, CS, WH, ND, PH,
 * IR): back button, title, sub-line, optional right slot (chip or action).
 */
export function CdSubHeader({
  onBack,
  right,
  subtitle,
  title,
}: {
  onBack: () => void;
  right?: React.ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="flex flex-none items-center gap-2.75 border-b border-border px-4 pt-0.5 pb-3.25 sm:gap-3.5 sm:px-7.5 sm:py-4.5">
      <Button
        aria-label="Back"
        className="size-8.5 min-h-0 min-w-0 rounded-cd-panel border border-border bg-surface px-1.5 py-px text-foreground [box-shadow:none] [column-gap:normal] [font-family:Arial] [font-size:13.3333px] [row-gap:normal] font-normal leading-[normal] sm:size-9.5"
        data-testid="sub-back"
        isIconOnly
        onPress={onBack}
        variant="ghost"
      >
        <ArrowLeft className="size-4 sm:size-4.25" />
      </Button>
      <div className="min-w-0 flex-1">
        <div
          className="font-grotesk text-metric-sm font-semibold sm:text-stat-lg"
          data-testid="sub-title"
        >
          {title}
        </div>
        <div
          className="text-eyebrow text-muted sm:mt-0.5 sm:text-sub"
          data-testid="sub-subtitle"
        >
          {subtitle}
        </div>
      </div>
      {right}
    </div>
  );
}
