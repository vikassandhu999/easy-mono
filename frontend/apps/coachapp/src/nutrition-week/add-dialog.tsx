import {useState} from 'react';
import {type ScheduleBody, useAddNutritionSchedule} from '../api/nutrition-week';
import {Button} from '../ui/button';
import {Tab, TabList, TabPanel, Tabs} from '../ui/tabs';
import {
  type Day,
  type Item,
  isAmount,
  type Kind,
  newItem,
  type Preset,
  presetSummary,
  presetTitle,
  type State,
} from './model';
import {AmountFields, type Commit, EditDialog, FoodList, MealList, SaveRecovery, TimeField} from './parts';
import {useSaveRecovery} from './save-recovery';

type Pick = {kind: 'meal'; preset: Preset} | {kind: Kind; item: Item};

export function AddDialog({
  clientId,
  state,
  commit,
  day,
  onCreateMeal,
  onClose,
}: {
  clientId: string;
  state: State;
  commit: Commit;
  day: Day;
  onCreateMeal: () => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<Pick | null>(null);
  const [time, setTime] = useState('');
  const save = useAddNutritionSchedule(clientId);
  const recovery = useSaveRecovery(clientId, onClose);
  const pending = save.isPending || recovery.checking;
  const title = picked ? (picked.kind === 'meal' ? presetTitle(picked.preset) : picked.item.food.name) : '';
  const add = async () => {
    if (!picked || pending || recovery.blocked) {
      return;
    }
    try {
      const body: ScheduleBody = {
        ...(picked.kind === 'meal'
          ? {nutrition_preset_id: picked.preset.id}
          : {
              preset: {
                type: picked.kind,
                food_id: picked.item.food.id,
                amount: Number(picked.item.amount),
                unit: picked.item.unit,
              },
            }),
        weekdays_mask: day.bit,
        time: time || null,
      };
      recovery.begin({kind: 'add', before: state, body});
      const result = await save.mutateAsync(body);
      commit(result, `${title} added to ${day.long}.`);
      onClose();
    } catch (cause) {
      recovery.fail(cause, 'Could not add this item. Your choices are still here. Try again.');
    }
  };
  return (
    <EditDialog
      title={picked ? `Add ${title} to ${day.long}` : `Add to ${day.long}`}
      dirty={picked !== null}
      pending={pending}
      canClose={!recovery.uncertain}
      recovery={<SaveRecovery recovery={recovery} />}
      onClose={onClose}
      footer={
        <>
          <Button
            variant="ghost"
            className="mr-auto"
            isDisabled={pending || recovery.blocked}
            onPress={picked ? () => setPicked(null) : onClose}
          >
            {picked ? 'Back' : 'Cancel'}
          </Button>
          {picked && (
            <Button
              isPending={save.isPending}
              isDisabled={recovery.blocked || (picked.kind !== 'meal' && !isAmount(picked.item.amount))}
              onPress={add}
            >
              Add to {day.long}
            </Button>
          )}
        </>
      }
    >
      {picked ? (
        <>
          {picked.kind === 'meal' ? (
            <p className="text-muted-foreground">{presetSummary(picked.preset)}</p>
          ) : (
            <AmountFields
              item={picked.item}
              onChange={(item) => setPicked({...picked, item})}
              autoFocus
            />
          )}
          <TimeField
            time={time}
            onChange={setTime}
          />
        </>
      ) : (
        <Tabs>
          <TabList
            aria-label="What to add"
            className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1"
          >
            {(['Meal', 'Food', 'Supplement'] as const).map((label) => (
              <Tab
                key={label}
                id={label}
                className="flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold text-muted-foreground data-selected:bg-surface data-selected:text-foreground data-selected:shadow-sm"
              >
                {label}
              </Tab>
            ))}
          </TabList>
          <TabPanel
            id="Meal"
            className="pt-4"
          >
            <MealList
              clientId={clientId}
              state={state}
              onCreate={onCreateMeal}
              onPick={(preset) => setPicked({kind: 'meal', preset})}
            />
          </TabPanel>
          {(['food', 'supplement'] as const).map((kind) => (
            <TabPanel
              key={kind}
              id={kind === 'food' ? 'Food' : 'Supplement'}
              className="pt-4"
            >
              <FoodList
                kinds={[kind]}
                onPick={(food) => setPicked({kind, item: newItem(food)})}
              />
            </TabPanel>
          ))}
        </Tabs>
      )}
    </EditDialog>
  );
}
