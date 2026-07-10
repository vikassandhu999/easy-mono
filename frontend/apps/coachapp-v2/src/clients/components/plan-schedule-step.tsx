/**
 * PlanScheduleStep — step 2 of the plan-assign flow: pick start (+ end) dates
 * for the plan being assigned to a client, then confirm.
 *
 * Backend constraints honored (see spec 2026-06-26-client-detail-redesign):
 *  - Training plans REQUIRE both start and end date when assigned.
 *  - Nutrition plans allow an open-ended (null end) assignment.
 *  - end must be >= start.
 * The overlapping-active-plan conflict is surfaced by the parent via
 * `errorMessage` (the parent owns the mutation).
 */
import {formatIsoDateOnly} from '@easy/utils';
import {Button, Label, Typography} from '@heroui/react';
import {getLocalTimeZone, parseDate, today} from '@internationalized/date';
import {ChevronLeft, Dumbbell, Utensils} from 'lucide-react';
import {useState} from 'react';

import DateInput from '@/@components/date-input';

type Kind = 'nutrition' | 'training';

interface Props {
  kind: Kind;
  planName: string;
  planMeta: string;
  clientName: string;
  /** End date is mandatory (training); nutrition allows open-ended. */
  requireEnd: boolean;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onBack: () => void;
  onConfirm: (startDate: string, endDate: string | null) => void;
}

const DURATIONS = [4, 8, 12] as const;

function addWeeks(startIso: string, weeks: number): string {
  // Guard the cleared/incomplete-date case: DateInput emits '' and parseDate('')
  // throws RangeError. Callers treat '' as "no start yet".
  if (!startIso) {
    return startIso;
  }
  return parseDate(startIso).add({weeks}).toString();
}

/** Returns true when end is on or after start (or either date is empty). */
function endNotBeforeStart(startIso: string, endIso: string | null): boolean {
  if (!endIso || !startIso) {
    return true;
  }
  return parseDate(endIso).compare(parseDate(startIso)) >= 0;
}

export default function PlanScheduleStep({
  kind,
  planName,
  planMeta,
  clientName,
  requireEnd,
  isSubmitting,
  errorMessage,
  onBack,
  onConfirm,
}: Props) {
  const defaultStart = today(getLocalTimeZone()).toString();
  const [start, setStart] = useState<string>(defaultStart);
  const [end, setEnd] = useState<string | null>(requireEnd ? addWeeks(defaultStart, 8) : null);

  const Icon = kind === 'nutrition' ? Utensils : Dumbbell;
  const iconWrap = kind === 'nutrition' ? 'bg-success-soft text-success' : 'bg-accent-soft text-accent';

  const startSet = Boolean(start);
  const endValid = endNotBeforeStart(start, end);
  const canAssign = startSet && (!requireEnd || Boolean(end)) && endValid;

  const activeDuration = DURATIONS.find((w) => end && start && addWeeks(start, w) === end) ?? null;

  return (
    <div className="space-y-4 pb-2">
      <button
        className="flex min-h-9 items-center gap-1 py-1.5 text-xs font-medium text-muted hover:text-foreground"
        onClick={onBack}
        type="button"
      >
        <ChevronLeft size={14} />
        Back to plans
      </button>

      {/* Selected plan summary */}
      <div className="flex items-center gap-3 rounded-2xl border-[1.5px] border-separator p-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${iconWrap}`}>
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <Typography
            truncate
            type="body-sm"
            weight="semibold"
          >
            {planName}
          </Typography>
          <Typography
            color="muted"
            truncate
            type="body-xs"
          >
            {planMeta}
          </Typography>
        </div>
      </div>

      <DateInput
        isRequired
        label="Start date"
        onChange={(iso) => setStart(iso ?? '')}
        value={start}
      />

      {/* End date */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">End date</Label>
          {!requireEnd && end ? (
            <button
              className="min-h-9 py-1.5 text-xs font-medium text-accent hover:underline"
              onClick={() => setEnd(null)}
              type="button"
            >
              Clear
            </button>
          ) : null}
        </div>

        {end || requireEnd ? (
          <>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((w) => {
                const on = activeDuration === w;
                return (
                  <button
                    className={`min-h-10 rounded-xl border px-3 py-2 text-xs font-medium ${
                      on
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-border text-muted hover:bg-surface-hover'
                    }`}
                    key={w}
                    onClick={() => setEnd(addWeeks(start, w))}
                    type="button"
                  >
                    {w} weeks
                  </button>
                );
              })}
            </div>
            <DateInput
              ariaLabel="End date"
              onChange={setEnd}
              value={end}
            />
            {end && endValid ? (
              <Typography
                color="muted"
                type="body-xs"
              >
                Ends {formatIsoDateOnly(end)}
              </Typography>
            ) : null}
            {!endValid ? (
              <Typography
                className="text-danger"
                type="body-xs"
              >
                End date must be on or after the start date.
              </Typography>
            ) : null}
          </>
        ) : (
          <button
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-3 py-2.5 text-sm text-muted hover:bg-surface-hover"
            onClick={() => setEnd(addWeeks(start, 8))}
            type="button"
          >
            Add an end date
          </button>
        )}
        {!end && !requireEnd ? (
          <Typography
            color="muted"
            type="body-xs"
          >
            Plan runs open-ended until you end it.
          </Typography>
        ) : null}
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-danger/20 bg-danger-soft p-3">
          <Typography
            className="text-danger"
            type="body-sm"
          >
            {errorMessage}
          </Typography>
        </div>
      ) : null}

      <Button
        className="w-full"
        isDisabled={!canAssign}
        isPending={isSubmitting}
        onPress={() => onConfirm(start, requireEnd || end ? end : null)}
      >
        {isSubmitting ? 'Assigning' : `Assign to ${clientName}`}
      </Button>
    </div>
  );
}
