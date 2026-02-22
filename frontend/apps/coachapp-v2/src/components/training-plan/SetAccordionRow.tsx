import {Button, Card, Input, Label, ListBox, Select, TextField} from '@heroui/react';
import {ChevronDown, ChevronRight, Trash2} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';

import type {SetDraft} from './setDraftHelpers';

import {DISTANCE_UNITS, formatSetSummary, LOAD_UNITS, SET_TYPES} from './setDraftHelpers';

type SetAccordionRowProps = {
  isExpanded: boolean;
  onChange: (next: SetDraft) => void;
  onRemove: () => void;
  onToggle: () => void;
  setDraft: SetDraft;
  setIndex: number;
};

export function SetAccordionRow({isExpanded, onChange, onRemove, onToggle, setDraft, setIndex}: SetAccordionRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      rowRef.current?.scrollIntoView({behavior: 'smooth', block: 'nearest'});
    }
  }, [isExpanded]);

  const updateField = useCallback(
    <K extends keyof SetDraft>(field: K, value: SetDraft[K]) => {
      onChange({...setDraft, [field]: value});
    },
    [onChange, setDraft],
  );

  if (!isExpanded) {
    return (
      <button
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-separator bg-background p-3 text-left transition-colors hover:bg-surface-secondary"
        onClick={onToggle}
        type="button"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-secondary text-xs font-bold text-foreground">
          {setIndex + 1}
        </span>
        <span className="inline-flex items-center rounded-full border border-separator px-2 py-0.5 text-xs font-medium capitalize text-foreground">
          {setDraft.set_type.replace('_', ' ')}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-muted">{formatSetSummary(setDraft)}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
      </button>
    );
  }

  return (
    <Card
      className="rounded-xl border border-separator bg-background p-4"
      ref={rowRef}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button
            className="flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-left"
            onClick={onToggle}
            type="button"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-secondary text-xs font-bold text-foreground">
              {setIndex + 1}
            </span>
            <ChevronDown className="h-4 w-4 text-muted" />
          </button>
          <Button
            aria-label="Remove set"
            className="min-h-8 min-w-8"
            isIconOnly
            onPress={onRemove}
            size="sm"
            variant="ghost"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            onSelectionChange={(value) => updateField('set_type', value?.toString() ?? 'working')}
            selectedKey={setDraft.set_type}
          >
            <Label className="text-xs font-medium text-muted">Type</Label>
            <Select.Trigger className="min-h-11 w-full">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {SET_TYPES.map((type) => (
                  <ListBox.Item
                    key={type}
                    textValue={type}
                  >
                    <span className="capitalize">{type.replace('_', ' ')}</span>
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <TextField>
            <Label className="text-xs font-medium text-muted">Reps</Label>
            <Input
              className="min-h-11"
              onChange={(e) => updateField('target_reps', e.target.value)}
              placeholder="e.g. 8-10"
              value={setDraft.target_reps}
              variant="secondary"
            />
          </TextField>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3 sm:grid-cols-3">
          <TextField>
            <Label className="text-xs font-medium text-muted">Load</Label>
            <Input
              className="min-h-11"
              onChange={(e) => updateField('load_value', e.target.value)}
              type="number"
              value={setDraft.load_value}
              variant="secondary"
            />
          </TextField>
          <Select
            onSelectionChange={(value) => updateField('load_unit', value?.toString() ?? 'none')}
            selectedKey={setDraft.load_unit}
          >
            <Label className="text-xs font-medium text-muted">Unit</Label>
            <Select.Trigger className="min-h-11 w-24">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {LOAD_UNITS.map((unit) => (
                  <ListBox.Item
                    key={unit}
                    textValue={unit}
                  >
                    {unit}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <TextField className="col-span-full sm:col-span-1">
            <Label className="text-xs font-medium text-muted">Rest (sec)</Label>
            <Input
              className="min-h-11"
              onChange={(e) => updateField('rest_seconds', e.target.value)}
              placeholder="sec"
              type="number"
              value={setDraft.rest_seconds}
              variant="secondary"
            />
          </TextField>
        </div>

        <button
          className="flex w-full cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent p-2 text-left text-xs font-medium text-muted hover:text-foreground"
          onClick={() => setShowAdvanced((prev) => !prev)}
          type="button"
        >
          {showAdvanced ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Advanced
        </button>

        {showAdvanced ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField>
              <Label className="text-xs font-medium text-muted">Tempo</Label>
              <Input
                className="min-h-11"
                onChange={(e) => updateField('tempo', e.target.value)}
                placeholder="e.g. 3010"
                value={setDraft.tempo}
                variant="secondary"
              />
            </TextField>
            <TextField>
              <Label className="text-xs font-medium text-muted">Intensity</Label>
              <Input
                className="min-h-11"
                onChange={(e) => updateField('intensity_target', e.target.value)}
                placeholder="e.g. RPE 8"
                value={setDraft.intensity_target}
                variant="secondary"
              />
            </TextField>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <TextField>
                <Label className="text-xs font-medium text-muted">Distance</Label>
                <Input
                  className="min-h-11"
                  onChange={(e) => updateField('distance_value', e.target.value)}
                  type="number"
                  value={setDraft.distance_value}
                  variant="secondary"
                />
              </TextField>
              <Select
                onSelectionChange={(value) => updateField('distance_unit', value?.toString() ?? 'none')}
                selectedKey={setDraft.distance_unit}
              >
                <Label className="text-xs font-medium text-muted">Unit</Label>
                <Select.Trigger className="min-h-11 w-24">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {DISTANCE_UNITS.map((unit) => (
                      <ListBox.Item
                        key={unit}
                        textValue={unit}
                      >
                        {unit}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
            <TextField>
              <Label className="text-xs font-medium text-muted">Duration (sec)</Label>
              <Input
                className="min-h-11"
                onChange={(e) => updateField('duration_seconds', e.target.value)}
                placeholder="sec"
                type="number"
                value={setDraft.duration_seconds}
                variant="secondary"
              />
            </TextField>
            <TextField className="col-span-full">
              <Label className="text-xs font-medium text-muted">Set notes</Label>
              <Input
                className="min-h-11"
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Notes for this set..."
                value={setDraft.notes}
                variant="secondary"
              />
            </TextField>
          </div>
        ) : null}

        <Button
          className="min-h-11 w-full"
          onPress={onToggle}
          size="md"
          variant="secondary"
        >
          Done
        </Button>
      </div>
    </Card>
  );
}
