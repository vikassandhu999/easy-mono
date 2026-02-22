import {Button} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useCallback, useState} from 'react';

import type {SetDraft} from './setDraftHelpers';

import {CollapsedSetRow} from './CollapsedSetRow';
import {SetAccordionRow} from './SetAccordionRow';

type SetListProps = {
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, next: SetDraft) => void;
  sets: SetDraft[];
};

export function SetList({onAdd, onRemove, onUpdate, sets}: SetListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const toggleExpanded = useCallback((localId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(localId)) next.delete(localId);
      else next.add(localId);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Sets ({sets.length})</p>
        <Button
          className="min-h-9"
          onPress={onAdd}
          size="sm"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          Add set
        </Button>
      </div>

      <div className="divide-y divide-separator rounded-xl border border-separator bg-background">
        {sets.map((setDraft, index) => {
          const isExpanded = expandedIds.has(setDraft.localId);
          const canRemove = sets.length > 1;

          return isExpanded ? (
            <div key={setDraft.localId}>
              <SetAccordionRow
                onChange={(next) => onUpdate(index, next)}
                onRemove={canRemove ? () => onRemove(index) : undefined}
                setDraft={setDraft}
                setIndex={index}
              />
              <div className="px-3 pb-2">
                <button
                  className="border-none bg-transparent p-0 text-xs text-muted hover:text-foreground"
                  onClick={() => toggleExpanded(setDraft.localId)}
                  type="button"
                >
                  Collapse
                </button>
              </div>
            </div>
          ) : (
            <CollapsedSetRow
              key={setDraft.localId}
              onRemove={canRemove ? () => onRemove(index) : undefined}
              onToggle={() => toggleExpanded(setDraft.localId)}
              setDraft={setDraft}
              setIndex={index}
            />
          );
        })}
      </div>
    </div>
  );
}
