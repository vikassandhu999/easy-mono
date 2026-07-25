import type {ReactNode} from 'react';

/**
 * `.card` — the Client Detail carded section. 68 of them across the 13 screens,
 * with 50 `.sep` separators between their rows.
 *
 *   .card  background:var(--surface); border:1px solid var(--border);
 *          border-radius:18px          -> `--radius-card` (17px, 1px inside drift)
 *   .sep   height:1px; background:var(--border)
 *
 * The optional `title` is the design's `.h5` card heading. Note `.h5` is
 * prototype naming, not a heading level: the rule sets only family, weight and
 * colour, and every instance renders at 13.5-14px inline — so it is
 * `--type-body` in Space Grotesk at 600, NOT `Typography type="h5"`, which is
 * pinned to 19px. It is an `<h3>` element because it is a real section heading in
 * the document outline.
 *
 * Where the design puts an uppercase label inside a card instead ("Notes",
 * "Subscription", "Trend"), the caller nests the shared `SectionHeading` — that is
 * a different register, and folding both into this interface would widen it for
 * no gain.
 */
export function SectionCard({
  action,
  children,
  className = '',
  divided = false,
  testId,
  title,
}: {
  /** Right-aligned control in the header row — "Open plan", "All entries →". */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Hairlines between children, for the row lists in CD-TR / CD-NU / CD-CI / CD-WH. */
  divided?: boolean;
  testId?: string;
  title?: ReactNode;
}) {
  return (
    <div
      className={`overflow-hidden rounded-card border border-border bg-surface ${className}`}
      data-testid={testId}
    >
      {(title != null || action != null) && (
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
          {title != null && <h3 className="min-w-0 truncate font-grotesk type-body font-semibold">{title}</h3>}
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
