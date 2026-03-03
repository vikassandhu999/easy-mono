import {Button} from '@heroui/react';
import {Minus, Plus} from 'lucide-react';
import {useCallback} from 'react';

import type {SetDraft} from '@/features/library/shared/workout-sets/setDraftHelpers';

import {SetAccordionRow} from '@/features/library/shared/workout-sets/SetAccordionRow';
import {cloneSetDraft, newSetDraft} from '@/features/library/shared/workout-sets/setDraftHelpers';
import {SetList} from '@/features/library/shared/workout-sets/SetList';

type UniformState = {
  count: number;
  isUniform: boolean;
  onCountChange: (count: number) => void;
  onModeChange: (uniform: boolean) => void;
};

type SetConfigSectionProps = {
  onSetsChange: (sets: SetDraft[]) => void;
  sets: SetDraft[];
  uniform: UniformState;
};

const MIN_SETS = 1;
const MAX_SETS = 20;

export function SetConfigSection({onSetsChange, sets, uniform}: SetConfigSectionProps) {
  const {count, isUniform, onCountChange, onModeChange} = uniform;

  const handleSwitchToIndividual = useCallback(() => {
    const template = sets[0];
    if (!template) return;
    const cloned = Array.from({length: count}, () => cloneSetDraft(template));
    onSetsChange(cloned);
    onModeChange(false);
  }, [sets, count, onSetsChange, onModeChange]);

  const handleSwitchToUniform = useCallback(() => {
    const first = sets[0];
    if (!first) return;
    onCountChange(sets.length);
    onSetsChange([first]);
    onModeChange(true);
  }, [sets, onSetsChange, onCountChange, onModeChange]);

  const handleUpdateSet = useCallback(
    (index: number, next: SetDraft) => {
      const nextSets = [...sets];
      nextSets[index] = next;
      onSetsChange(nextSets);
    },
    [sets, onSetsChange],
  );

  const handleRemoveSet = useCallback(
    (index: number) => {
      const next = sets.filter((_, i) => i !== index);
      onSetsChange(next.length > 0 ? next : [newSetDraft()]);
    },
    [sets, onSetsChange],
  );

  const handleAddSet = useCallback(() => {
    const last = sets[sets.length - 1];
    const clone = last ? cloneSetDraft(last) : newSetDraft();
    onSetsChange([...sets, clone]);
  }, [sets, onSetsChange]);

  if (isUniform) {
    const template = sets[0];
    if (!template) return null;

    return (
      <div className="flex flex-col gap-3">
        {/* Header: "Sets" label + count stepper */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Sets</p>
          <div className="flex items-center gap-1">
            <Button
              aria-label="Decrease set count"
              className="min-h-9 min-w-9"
              isDisabled={count <= MIN_SETS}
              isIconOnly
              onPress={() => onCountChange(Math.max(MIN_SETS, count - 1))}
              size="sm"
              variant="outline"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="min-w-8 text-center text-sm font-semibold text-foreground">&times;{count}</span>
            <Button
              aria-label="Increase set count"
              className="min-h-9 min-w-9"
              isDisabled={count >= MAX_SETS}
              isIconOnly
              onPress={() => onCountChange(Math.min(MAX_SETS, count + 1))}
              size="sm"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Single template card — no badge, no delete */}
        <SetAccordionRow
          onChange={(next) => onSetsChange([next])}
          setDraft={template}
          setIndex={-1}
        />

        {/* Toggle to individual mode */}
        <button
          className="w-fit border-none bg-transparent p-0 text-sm font-medium text-muted hover:text-foreground"
          onClick={handleSwitchToIndividual}
          type="button"
        >
          Configure each set &rarr;
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <SetList
        onAdd={handleAddSet}
        onRemove={handleRemoveSet}
        onUpdate={handleUpdateSet}
        sets={sets}
      />

      {/* Toggle back to uniform mode */}
      <button
        className="w-fit border-none bg-transparent p-0 text-sm font-medium text-muted hover:text-foreground"
        onClick={handleSwitchToUniform}
        type="button"
      >
        Same for all sets &rarr;
      </button>
    </div>
  );
}
