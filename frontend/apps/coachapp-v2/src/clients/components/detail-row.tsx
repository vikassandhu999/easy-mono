import {Button, Typography} from '@heroui/react';
import type {LucideIcon} from 'lucide-react';
import {ChevronRight} from 'lucide-react';
import type {ReactNode} from 'react';
// react-router's Link, not HeroUI's: HeroUI's takes an `href`, this row navigates
// within the app. `message-embed` and `conversation-view` link the same way.
import {Link} from 'react-router-dom';

/**
 * `.lbrow` — the Client Detail list row, and the most repeated element in the
 * design: 48 of them across 8 of the 13 screens (sessions, check-ins, nutrition
 * days, weight entries, intake answers, the details list).
 *
 *   .lbrow      display:flex; align-items:center; gap:14px; padding:11px 8px;
 *               border-radius:12px
 *   .lbrow.tap  cursor:pointer, and :hover background:var(--background)
 *
 * Anatomy, from the CD-TR rows: a fixed-width leading column (the date), a
 * flexible middle that stacks a title over a meta line, and a trailing slot (a
 * status chip, or a chevron when the row navigates).
 *
 * A row is NOT a control, and that distinction is load-bearing here: the theme
 * pins `.button` to `--spacing-control` (36px), which would crush a two-line row —
 * which is exactly why the deleted implementation carried 20 hand-written
 * `h-auto`. So a navigating row is a `Link`, an acting row is a ghost `Button`
 * carrying the theme's `button--row` release, and an inert row is a plain `div`.
 * None of them is a `div` with an `onClick`, which has no keyboard or focus
 * behaviour and is what `check-ui-contract.sh` flags.
 */
export function DetailRow({
  icon: Icon,
  leading,
  meta,
  onPress,
  testId,
  title,
  to,
  trailing,
  tone = 'default',
}: {
  /** The design's 38px leading tile — the settings row, the invitation row. */
  icon?: LucideIcon;
  /** Fixed-width left column — the date in CD-TR/CD-NU, an icon or dot elsewhere. */
  leading?: ReactNode;
  /** Second line under the title. */
  meta?: ReactNode;
  /** For rows that act rather than navigate. Ignored when `to` is set. */
  onPress?: () => void;
  testId?: string;
  title: ReactNode;
  /** Route to navigate to. Makes the row a real link — middle-click, focus, the lot. */
  to?: string;
  /** Status chip, value, or similar. A chevron is added automatically when the row leads somewhere. */
  trailing?: ReactNode;
  /**
   * `muted` is the design's un-actioned row (CD-TR "No session logged"): the title
   * drops to muted at 600 instead of foreground at 700.
   */
  tone?: 'default' | 'muted';
}) {
  const isPressable = Boolean(to || onPress);
  const body = (
    <>
      {Icon != null && (
        <span className="flex size-9.5 shrink-0 items-center justify-center rounded-control bg-background text-muted">
          <Icon className="size-4.5" />
        </span>
      )}
      {leading != null && <div className="w-18 shrink-0 type-eyebrow font-semibold text-muted">{leading}</div>}
      <div className="min-w-0 flex-1">
        <Typography
          className={tone === 'muted' ? 'font-semibold text-muted' : 'font-bold'}
          truncate
          type="body-sm"
        >
          {title}
        </Typography>
        {meta != null && (
          <Typography
            className="mt-0.5"
            color="muted"
            truncate
            type="body-xs"
          >
            {meta}
          </Typography>
        )}
      </div>
      {trailing != null && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
      {isPressable && <ChevronRight className="shrink-0 text-muted-2" />}
    </>
  );

  // `gap-3` is 12px against the design's 14px, and `py-3` 12px against 11px —
  // both inside the ±2 the scale allows. 14 and 11 are not on the integer
  // spacing scale and a quarter-step is banned.
  const shape = 'flex w-full items-center gap-3 rounded-panel px-2 py-3 text-left';

  if (to) {
    return (
      <Link
        className={`${shape} hover:bg-background`}
        data-testid={testId}
        to={to}
      >
        {body}
      </Link>
    );
  }
  if (onPress) {
    return (
      <Button
        // `button--row` is the theme's named release from the control tier — a row
        // is sized by its content. Not `h-auto` here: that would settle a conflict
        // with the theme at a call site, which UI-CONTRACT §3 forbids.
        className={`${shape} button--row hover:bg-background`}
        data-testid={testId}
        onPress={onPress}
        variant="ghost"
      >
        {body}
      </Button>
    );
  }
  return (
    <div
      className={shape}
      data-testid={testId}
    >
      {body}
    </div>
  );
}
