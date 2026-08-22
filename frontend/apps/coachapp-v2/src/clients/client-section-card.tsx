import type {ReactNode} from 'react';

/**
 * `.card` — the Client Detail carded section. 68 of them across the 13 screens,
 * with 50 `.sep` separators between their rows.
 *
 *   .card  background:var(--surface); border:1px solid var(--border);
 *          border-radius:18px          -> `--radius-card` (17px, 1px inside drift)
 *   .sep   height:1px; background:var(--border)
 *
 * The design uses TWO card-heading registers, and counting them decides which is
 * the default here:
 *
 *   .eyebrow  This week · Notes · Profile · Subscription · Intake · Trend ·
 *             Progress photos · Adherence — the overwhelming majority
 *   .h5       Latest check-in · Weight — the two CD-OV summary cards, and nothing
 *             else in the file
 *
 * So `eyebrow` is the default and `heading` is opt-in. Note `.h5` is prototype
 * naming, not a heading level: the rule sets only family, weight and colour, and
 * every instance renders at 13.5-14px inline — so it is `--type-body` in Space
 * Grotesk at 600, NOT `Typography type="h5"`, which is pinned to 19px.
 *
 * Both render an `<h3>`: they are real section headings in the document outline,
 * and only their treatment differs.
 */
export function SectionCard({
  action,
  children,
  className = '',
  divided = false,
  testId,
  title,
  titleAs = 'eyebrow',
}: {
  /** Right-aligned control in the header row — "Open plan", "All entries →". */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Hairlines between children, for the row lists in CD-TR / CD-NU / CD-CI / CD-WH. */
  divided?: boolean;
  testId?: string;
  title?: ReactNode;
  /** `heading` is the grotesk `.h5` register — only the CD-OV summary cards use it. */
  titleAs?: 'eyebrow' | 'heading';
}) {
  return (
    <div
      className={`overflow-hidden rounded-card border border-border bg-surface ${className}`}
      data-testid={testId}
    >
      {(title != null || action != null) && (
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
          {title != null && (
            <h3
              className={
                titleAs === 'heading'
                  ? 'min-w-0 truncate font-grotesk type-body font-semibold'
                  : 'eyebrow min-w-0 truncate'
              }
            >
              {title}
            </h3>
          )}
          {action != null && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      )}
      {/* `divide-y` is Tailwind's own between-children hairline — the same 1px
          `--color-border` line as the design's `.sep`, without asking each caller
          to interleave separator elements. */}
      <div className={divided ? 'divide-y divide-border' : undefined}>{children}</div>
    </div>
  );
}
