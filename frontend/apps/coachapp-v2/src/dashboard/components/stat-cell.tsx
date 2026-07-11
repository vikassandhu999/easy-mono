import type {LucideIcon} from 'lucide-react';

type StatCellProps = {
  errorLabel?: string;
  icon: LucideIcon;
  label: string;
  meta?: string;
  onPress: () => void;
  value: null | number;
};

export function StatCell({errorLabel, icon: Icon, label, meta, onPress, value}: StatCellProps) {
  return (
    <button
      className="group flex min-h-32 flex-col justify-between rounded-3xl border-[1.5px] border-separator bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:border-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:min-h-36 sm:p-5"
      onClick={onPress}
      type="button"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="font-grotesk text-4xl font-bold leading-none tabular-nums sm:text-[2.75rem]">
          {value ?? '—'}
        </span>
        <span className="grid size-9 place-items-center rounded-xl bg-surface-secondary text-muted transition group-hover:text-foreground">
          <Icon size={17} />
        </span>
      </span>
      <span className="mt-4 flex flex-col gap-2">
        <span className="text-sm font-semibold text-muted">{label}</span>
        {errorLabel ? (
          <span className="text-xs font-semibold text-danger-soft-foreground">{errorLabel}</span>
        ) : meta ? (
          <span className="w-fit rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-bold text-muted">
            {meta}
          </span>
        ) : null}
      </span>
    </button>
  );
}
