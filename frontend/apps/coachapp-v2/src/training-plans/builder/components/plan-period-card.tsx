/**
 * Start and end dates for an ASSIGNED training plan.
 *
 * Kept beyond the TB reference: the plan edit screen (badge TE) only edits name
 * and description, so this is the one place a coach sets the assignment period.
 * Library templates have no period, so a template renders nothing.
 */
import {Button} from '@heroui/react';
import {useState} from 'react';

import DateInput from '@/@components/date-input';

import {periodError} from '../period';

interface PlanPeriodCardProps {
  startDate: string | null;
  endDate: string | null;
  onSave: (startDate: string | null, endDate: string | null) => Promise<void>;
}

// No prop→draft sync: this card is the only writer of the period, so after a
// successful save the props simply catch up to the drafts, and after a failed
// one keeping the coach's drafts (dirty, retryable) is exactly what we want.
export function PlanPeriodCard({startDate, endDate, onSave}: PlanPeriodCardProps) {
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);
  const [isSaving, setIsSaving] = useState(false);
  const dirty = draftStart !== startDate || draftEnd !== endDate;
  const error = periodError(draftStart, draftEnd);

  const save = async () => {
    if (!dirty || error) {
      return;
    }
    setIsSaving(true);
    try {
      await onSave(draftStart, draftEnd);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-card border border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-40 flex-1">
          <DateInput
            label="Start date"
            labelClassName="mb-1 block type-eyebrow text-muted"
            onChange={setDraftStart}
            value={draftStart}
          />
        </div>
        <div className="min-w-40 flex-1">
          <DateInput
            errorMessage={error}
            label="End date"
            labelClassName="mb-1 block type-eyebrow text-muted"
            onChange={setDraftEnd}
            value={draftEnd}
          />
        </div>
        <Button
          isDisabled={!dirty || Boolean(error)}
          isPending={isSaving}
          onPress={() => {
            save().catch(() => undefined);
          }}
          variant="secondary"
        >
          Save dates
        </Button>
      </div>
    </div>
  );
}
