import {Button, Input, Label, ListBox, Select, TextField} from '@heroui/react';
import {Trash2} from 'lucide-react';
import {useCallback, useState} from 'react';

import type {SetDraft} from '@/features/library/shared/workout-sets/setDraftHelpers';

import {LOAD_UNITS, SET_TYPES} from '@/features/library/shared/workout-sets/setDraftHelpers';

type SetAccordionRowProps = {
  onChange: (next: SetDraft) => void;
  onRemove?: () => void;
  setDraft: SetDraft;
  setIndex: number;
};

const UNIT_LABEL: Record<string, string> = {
  bodyweight: 'BW',
  kg: 'kg',
  lbs: 'lbs',
  none: '—',
  percent_1rm: '%1RM',
  rpe: 'RPE',
};

export function SetAccordionRow({onChange, onRemove, setDraft, setIndex}: SetAccordionRowProps) {
  const [showExtras, setShowExtras] = useState(false);

  const updateField = useCallback(
    <K extends keyof SetDraft>(field: K, value: SetDraft[K]) => {
      onChange({...setDraft, [field]: value});
    },
    [onChange, setDraft],
  );

  const hasExtras = Boolean(setDraft.intensity_target || setDraft.notes);

  return (
    <div className="rounded-xl border border-separator bg-background">
      {/* ── Header: number · type · toggle · delete ── */}
      <div className="flex items-center gap-2 px-3 pt-2.5">
        {setIndex >= 0 && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-xs font-bold text-muted">
            {setIndex + 1}
          </span>
        )}

        {/* Type — min-h-8 keeps HeroUI happy; w-auto sizes to content */}
        <Select
          onSelectionChange={(value) => updateField('set_type', value?.toString() ?? 'working')}
          selectedKey={setDraft.set_type}
        >
          <Label className="sr-only">Set type</Label>
          <Select.Trigger className="min-h-8 w-auto min-w-[88px]">
            <Select.Value className="text-xs capitalize" />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {SET_TYPES.map((type) => (
                <ListBox.Item
                  id={type}
                  key={type}
                  textValue={type}
                >
                  <span className="capitalize">{type.replace('_', ' ')}</span>
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <button
          className="ml-auto shrink-0 text-xs text-muted hover:text-foreground"
          onClick={() => setShowExtras((v) => !v)}
          type="button"
        >
          {showExtras ? 'Hide' : hasExtras ? 'RPE & notes ·' : 'RPE & notes'}
        </button>

        {onRemove && (
          <Button
            aria-label="Remove set"
            className="min-h-7 min-w-7 text-muted"
            isIconOnly
            onPress={onRemove}
            size="sm"
            variant="ghost"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/*
        ── Reps | Load | Unit ──
        Three dedicated columns via items-end flex.
        Unit is fixed-width (w-20) and aligns to the bottom of the inputs
        because it has no label above it — items-end handles this perfectly.
        No compound nesting: each column is a direct flex child.
      */}
      <div className="flex items-end gap-2 px-3 pb-2 pt-2">
        {/* Reps — text keyboard so coaches can type "8-10" ranges */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-xs font-medium text-muted">Reps</p>
          <TextField>
            <Label className="sr-only">Reps</Label>
            <Input
              className="min-h-11 w-full"
              inputMode="text"
              onChange={(e) => updateField('target_reps', e.target.value)}
              placeholder="e.g. 8-10"
              value={setDraft.target_reps}
              variant="secondary"
            />
          </TextField>
        </div>

        {/* Load — decimal keyboard for values like 52.5 */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-xs font-medium text-muted">Load</p>
          <TextField>
            <Label className="sr-only">Load value</Label>
            <Input
              className="min-h-11 w-full"
              inputMode="decimal"
              onChange={(e) => updateField('load_value', e.target.value)}
              placeholder="0"
              type="number"
              value={setDraft.load_value}
              variant="secondary"
            />
          </TextField>
        </div>

        {/* Unit — fixed width, no label (context is obvious from Load column) */}
        <div className="w-20 shrink-0">
          <Select
            onSelectionChange={(value) => updateField('load_unit', value?.toString() ?? 'none')}
            selectedKey={setDraft.load_unit}
          >
            <Label className="sr-only">Load unit</Label>
            <Select.Trigger className="min-h-11 w-full">
              <Select.Value className="text-xs" />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {LOAD_UNITS.map((unit) => (
                  <ListBox.Item
                    id={unit}
                    key={unit}
                    textValue={UNIT_LABEL[unit] ?? unit}
                  >
                    {UNIT_LABEL[unit] ?? unit}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </div>

      {/* ── Rest — compact inline row, numeric keyboard ── */}
      <div className="flex items-center gap-2 border-t border-separator px-3 py-2">
        <span className="shrink-0 text-xs font-medium text-muted">Rest</span>
        <TextField className="w-20">
          <Label className="sr-only">Rest in seconds</Label>
          <Input
            className="h-8 min-h-0 text-center"
            inputMode="numeric"
            onChange={(e) => updateField('rest_seconds', e.target.value)}
            placeholder="—"
            type="number"
            value={setDraft.rest_seconds}
            variant="secondary"
          />
        </TextField>
        <span className="text-xs text-muted">sec</span>
      </div>

      {/* ── RPE & Notes (extras) ── */}
      {showExtras && (
        <div className="grid gap-2 border-t border-separator px-3 pb-3 pt-2 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted">RPE / Intensity</p>
            <TextField>
              <Label className="sr-only">RPE or intensity target</Label>
              <Input
                className="min-h-10 w-full"
                onChange={(e) => updateField('intensity_target', e.target.value)}
                placeholder="e.g. RPE 8 or 80%"
                value={setDraft.intensity_target}
                variant="secondary"
              />
            </TextField>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted">Set notes</p>
            <TextField>
              <Label className="sr-only">Set notes</Label>
              <Input
                className="min-h-10 w-full"
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="e.g. pause at bottom"
                value={setDraft.notes}
                variant="secondary"
              />
            </TextField>
          </div>
        </div>
      )}
    </div>
  );
}
