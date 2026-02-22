import {SetAccordionRow} from './SetAccordionRow';
import type {SetDraft} from './setDraftHelpers';

type SetListProps = {
  expandedIndex: null | number;
  onExpandedChange: (index: null | number) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, next: SetDraft) => void;
  sets: SetDraft[];
};

export function SetList({expandedIndex, onExpandedChange, onRemove, onUpdate, sets}: SetListProps) {
  return (
    <div className="flex flex-col gap-2">
      {sets.map((setDraft, index) => (
        <SetAccordionRow
          isExpanded={expandedIndex === index}
          key={setDraft.localId}
          onChange={(next) => onUpdate(index, next)}
          onRemove={() => onRemove(index)}
          onToggle={() => onExpandedChange(expandedIndex === index ? null : index)}
          setDraft={setDraft}
          setIndex={index}
        />
      ))}
    </div>
  );
}
