// The serving-size list + inline add editor shared by the food and recipe
// forms. Both forms keep serving sizes outside react-hook-form (they are a
// separate prop, not a zod field), so this is a plain controlled value/onChange
// component rather than a form field.
//
// Renders a Fieldset.Group, so callers place it directly inside their
// <Fieldset> beneath the Legend/Description.

import {Button, FieldError, Fieldset, Input, Label, TextField, Typography} from '@heroui/react';
import {Plus, X} from 'lucide-react';
import {useCallback, useState} from 'react';

import {NumberInput} from '@/@components/number-input';
import type {ServingSize} from '@/api/shared';

export function ServingSizesEditor({
  onChange,
  value,
}: {
  onChange: (sizes: ServingSize[]) => void;
  value: ServingSize[];
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newUnit, setNewUnit] = useState('');
  const [newAmount, setNewAmount] = useState<number | undefined>();
  const [newWeightG, setNewWeightG] = useState<number | undefined>();
  const [servingError, setServingError] = useState('');

  const resetForm = useCallback(() => {
    setNewUnit('');
    setNewAmount(undefined);
    setNewWeightG(undefined);
    setServingError('');
  }, []);

  const handleAdd = useCallback(() => {
    const unit = newUnit.trim();
    if (!unit) {
      setServingError('Enter a serving unit');
      return;
    }
    const serving: ServingSize = {unit, amount: newAmount ?? null, weight_g: newWeightG ?? null};
    onChange([...value, serving]);
    resetForm();
    setIsAdding(false);
  }, [newAmount, newUnit, newWeightG, onChange, resetForm, value]);

  const handleRemove = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [onChange, value],
  );

  return (
    <Fieldset.Group>
      {value.map((serving, i) => (
        <div
          className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5"
          key={i}
        >
          <div className="flex min-w-0 items-baseline gap-3">
            <Typography
              type="body-sm"
              weight="semibold"
            >
              {serving.amount ?? 1} {serving.unit}
            </Typography>
            {serving.weight_g != null && serving.weight_g > 0 && (
              <Typography
                color="muted"
                type="body-sm"
              >
                {serving.weight_g} g
              </Typography>
            )}
          </div>
          <Button
            aria-label={`Remove ${serving.unit}`}
            className="min-h-11 min-w-11  "
            onPress={() => handleRemove(i)}
            size="sm"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}

      {isAdding ? (
        <div className="rounded-xl border border-border bg-surface-secondary p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField
              fullWidth
              isInvalid={!!servingError}
              isRequired
            >
              <Label>Unit</Label>
              {servingError && <FieldError>{servingError}</FieldError>}
              <Input
                className="min-h-11 border border-border bg-surface shadow-none "
                onChange={(e) => {
                  setNewUnit(e.target.value);
                  setServingError('');
                }}
                placeholder="e.g. scoop, cup"
                value={newUnit}
              />
            </TextField>
            <NumberInput
              fullWidth
              label="Amount"
              minValue={0}
              onChange={setNewAmount}
              value={newAmount}
            />
            <NumberInput
              fullWidth
              label="Weight (g)"
              minValue={0}
              onChange={setNewWeightG}
              value={newWeightG}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              className="min-h-11 "
              onPress={handleAdd}
              size="sm"
            >
              <Plus className="size-3.5" />
              Add
            </Button>
            <Button
              className="min-h-11 "
              onPress={() => {
                setIsAdding(false);
                resetForm();
              }}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          className="min-h-11 w-full rounded-xl border border-dashed border-border text-muted "
          onPress={() => setIsAdding(true)}
          variant="ghost"
        >
          <Plus className="size-4" />
          Add serving size
        </Button>
      )}
    </Fieldset.Group>
  );
}
