/**
 * Start and end dates for an ASSIGNED training plan.
 *
 * Kept beyond the TB reference: the plan edit screen (badge TE) only edits name
 * and description, so this is the one place a coach sets the assignment period.
 * Library templates have no period, so a template renders nothing.
 */
import DateInput from '@/@components/date-input';

interface PlanPeriodCardProps {
  startDate: string | null;
  endDate: string | null;
  onChange: (field: 'start_date' | 'end_date', value: string | null) => void;
}

export function PlanPeriodCard({startDate, endDate, onChange}: PlanPeriodCardProps) {
  return (
    <div className="flex flex-wrap gap-3 rounded-card border border-border bg-surface px-4 py-3">
      <div className="min-w-40 flex-1">
        <DateInput
          label="Start date"
          labelClassName="mb-1 block type-eyebrow text-muted"
          onChange={(value) => onChange('start_date', value)}
          value={startDate}
        />
      </div>
      <div className="min-w-40 flex-1">
        <DateInput
          label="End date"
          labelClassName="mb-1 block type-eyebrow text-muted"
          onChange={(value) => onChange('end_date', value)}
          value={endDate}
        />
      </div>
    </div>
  );
}
