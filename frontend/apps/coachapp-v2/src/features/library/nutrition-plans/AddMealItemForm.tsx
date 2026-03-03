import {Autocomplete, Button, Card, Input, Label, ListBox, SearchField, TextField, useFilter} from '@heroui/react';
import {useMemo, useState} from 'react';

type SourceItem = {id: string; name: string};

type AddMealItemFormProps = {
  foods: SourceItem[];
  isLoading: boolean;
  onSubmit: (body: {amount?: number; food_id?: string; recipe_id?: string; unit?: string; weight_g?: number}) => void;
  recipes: SourceItem[];
};

const toNumber = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  return Number(value);
};

export default function AddMealItemForm({foods, isLoading, onSubmit, recipes}: AddMealItemFormProps) {
  const {contains} = useFilter({sensitivity: 'base'});
  const [itemType, setItemType] = useState<'food' | 'recipe'>('food');
  const [sourceId, setSourceId] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('');
  const [weight, setWeight] = useState('');

  const availableItems = useMemo(() => (itemType === 'food' ? foods : recipes), [foods, itemType, recipes]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!sourceId || isLoading) return;
    onSubmit({
      amount: toNumber(amount),
      food_id: itemType === 'food' ? sourceId : undefined,
      recipe_id: itemType === 'recipe' ? sourceId : undefined,
      unit: unit.trim() || undefined,
      weight_g: toNumber(weight),
    });
    setSourceId('');
    setAmount('');
    setUnit('');
    setWeight('');
  };

  return (
    <Card className="border border-separator bg-surface p-4">
      <p className="mb-3 text-sm font-semibold text-foreground">Add item</p>
      <form
        className="flex flex-col gap-3"
        onSubmit={handleSubmit}
      >
        <div className="flex gap-2">
          <Button
            className="min-h-9"
            onPress={() => {
              setItemType('food');
              setSourceId('');
            }}
            size="sm"
            type="button"
            variant={itemType === 'food' ? 'secondary' : 'ghost'}
          >
            Food
          </Button>
          <Button
            className="min-h-9"
            onPress={() => {
              setItemType('recipe');
              setSourceId('');
            }}
            size="sm"
            type="button"
            variant={itemType === 'recipe' ? 'secondary' : 'ghost'}
          >
            Recipe
          </Button>
        </div>

        <Autocomplete
          allowsEmptyCollection
          fullWidth
          onChange={(v) => setSourceId(v?.toString() ?? '')}
          value={sourceId || null}
          variant="secondary"
        >
          <Label className="text-xs font-medium text-muted">{itemType === 'food' ? 'Food' : 'Recipe'}</Label>
          <Autocomplete.Trigger className="min-h-11">
            <Autocomplete.Value />
            <Autocomplete.ClearButton />
            <Autocomplete.Indicator />
          </Autocomplete.Trigger>
          <Autocomplete.Popover>
            <Autocomplete.Filter filter={contains}>
              <SearchField>
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder={itemType === 'food' ? 'Search food...' : 'Search recipe...'} />
                </SearchField.Group>
              </SearchField>
              <ListBox>
                {availableItems.map((entry) => (
                  <ListBox.Item
                    id={entry.id}
                    key={entry.id}
                    textValue={entry.name}
                  >
                    <span className="text-sm">{entry.name}</span>
                  </ListBox.Item>
                ))}
              </ListBox>
            </Autocomplete.Filter>
          </Autocomplete.Popover>
        </Autocomplete>

        <div className="flex items-end gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-xs text-muted">Amount</span>
            <TextField>
              <Input
                className="h-9 min-h-0"
                inputMode="decimal"
                onChange={(e) => setAmount(e.target.value)}
                value={amount}
                variant="secondary"
              />
            </TextField>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-xs text-muted">Unit</span>
            <TextField>
              <Input
                className="h-9 min-h-0"
                inputMode="text"
                onChange={(e) => setUnit(e.target.value)}
                value={unit}
                variant="secondary"
              />
            </TextField>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-xs text-muted">Weight (g)</span>
            <TextField>
              <Input
                className="h-9 min-h-0"
                inputMode="decimal"
                onChange={(e) => setWeight(e.target.value)}
                value={weight}
                variant="secondary"
              />
            </TextField>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            className="min-h-11"
            isDisabled={!sourceId || isLoading}
            size="md"
            type="submit"
            variant="primary"
          >
            Add item
          </Button>
        </div>
      </form>
    </Card>
  );
}
