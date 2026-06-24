/**
 * PinnedWeekBar — sticky condensed schedule summary.
 *
 * Sits at the top of the scroll container (sticky top-0 z-10).
 * When collapsed: shows a single-line projection of the week ("Mon · Push Day · Tue · Rest · …").
 * When expanded: renders WeekSchedule inline below the bar.
 */
import {Spinner, Typography} from '@heroui/react';
import {ChevronDown, ChevronUp} from 'lucide-react';
import {useState} from 'react';

import {useGetTrainingPlanScheduleQuery} from '@/api/generated';

import {buildScheduleProjection, WeekSchedule} from './week-schedule';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PinnedWeekBarProps {
  planId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PinnedWeekBar({planId}: PinnedWeekBarProps) {
  const [expanded, setExpanded] = useState(false);
  const {data: scheduleData, isLoading} = useGetTrainingPlanScheduleQuery({planId});

  const scheduleMap = scheduleData?.data ?? {};
  const projection = buildScheduleProjection(scheduleMap);

  return (
    <div className="sticky top-0 z-10">
      {/* Bar */}
      <button
        className="flex w-full items-center justify-between gap-2 bg-surface border-b border-border px-4 py-2 text-left transition-colors hover:bg-surface-hover"
        onClick={() => setExpanded((v) => !v)}
        type="button"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Typography
            className="shrink-0 uppercase tracking-wider"
            color="muted"
            type="body-xs"
            weight="semibold"
          >
            Week
          </Typography>

          {isLoading ? (
            <Spinner
              color="accent"
              size="sm"
            />
          ) : (
            <span className="truncate text-xs text-muted">{projection}</span>
          )}
        </div>

        <span className="shrink-0 text-muted">{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>

      {/* Expanded schedule */}
      {expanded ? (
        <div className="bg-background border-b border-border px-4 py-3">
          <WeekSchedule planId={planId} />
        </div>
      ) : null}
    </div>
  );
}
