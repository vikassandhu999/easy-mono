import {Button} from '@heroui/react';
import {ChevronDown, X} from 'lucide-react';

import type {SetDraft} from './setDraftHelpers';

import {formatSetSummary} from './setDraftHelpers';

type CollapsedSetRowProps = {
  onRemove?: () => void;
  onToggle: () => void;
  setDraft: SetDraft;
  setIndex: number;
};

const TYPE_LABEL: Record<string, string> = {
  amrap: 'AMRAP',
  backoff: 'Backoff',
  cluster: 'Cluster',
  dropset: 'Drop set',
  emom: 'EMOM',
  rest_pause: 'Rest-pause',
  warmup: 'Warmup',
  working: 'Working',
};

export function CollapsedSetRow({onRemove, onToggle, setDraft, setIndex}: CollapsedSetRowProps) {
  const typeLabel = TYPE_LABEL[setDraft.set_type] ?? setDraft.set_type;
  const summary = formatSetSummary(setDraft);

  return (
    <div className="flex min-h-11 items-center gap-2 px-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-xs font-bold text-muted">
        {setIndex + 1}
      </span>

      <button
        className="min-w-0 flex-1 truncate border-none bg-transparent p-0 text-left text-sm text-foreground"
        onClick={onToggle}
        type="button"
      >
        {typeLabel} · {summary}
      </button>

      <Button
        aria-label="Expand set"
        className="min-h-7 min-w-7 text-muted"
        isIconOnly
        onPress={onToggle}
        size="sm"
        variant="ghost"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>

      {onRemove && (
        <Button
          aria-label="Remove set"
          className="min-h-7 min-w-7 text-muted"
          isIconOnly
          onPress={onRemove}
          size="sm"
          variant="ghost"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
