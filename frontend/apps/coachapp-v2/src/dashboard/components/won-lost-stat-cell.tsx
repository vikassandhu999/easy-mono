import {TrendingDown, TrendingUp} from 'lucide-react';

type WonLostStatCellProps = {
  isError: boolean;
  lost?: number;
  onPress: () => void;
  won?: number;
};

export function WonLostStatCell({isError, lost = 0, onPress, won = 0}: WonLostStatCellProps) {
  const value = (count: number) => (isError ? '—' : count);

  return (
    <button
      className="flex min-h-32 flex-col justify-between rounded-3xl border-[1.5px] border-separator bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:border-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:min-h-36 sm:p-5"
      onClick={onPress}
      type="button"
    >
      <span className="flex items-stretch gap-3">
        <span className="min-w-0 flex-1">
          <span className="font-grotesk text-3xl font-bold leading-none tabular-nums text-success-soft-foreground">
            {value(won)}
          </span>
          <span className="mt-2 flex items-center gap-1 text-xs font-semibold text-muted">
            <TrendingUp
              className="text-success"
              size={13}
            />
            Won
          </span>
        </span>
        <span className="w-px bg-separator" />
        <span className="min-w-0 flex-1">
          <span className="font-grotesk text-3xl font-bold leading-none tabular-nums text-danger-soft-foreground">
            {value(lost)}
          </span>
          <span className="mt-2 flex items-center gap-1 text-xs font-semibold text-muted">
            <TrendingDown
              className="text-danger"
              size={13}
            />
            Lost
          </span>
        </span>
      </span>
      <span className="mt-4 w-fit rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-bold text-muted">
        Prospects
      </span>
    </button>
  );
}
