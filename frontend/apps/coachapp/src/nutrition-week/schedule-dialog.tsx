import {useState} from 'react';
import {type ScheduleUpdate, useRemoveNutritionSchedule, useSaveNutritionSchedule} from '../api/nutrition-week';
import {Button} from '../ui/button';
import {cn} from '../ui/cn';
import {
  type Day,
  daysLabel,
  directItem,
  isAmount,
  type Preset,
  presetOf,
  presetSummary,
  presetTitle,
  type Schedule,
  type State,
  usesOf,
} from './model';
import {
  AmountFields,
  type Commit,
  EditDialog,
  errorClass,
  MealList,
  SaveRecovery,
  TimeField,
  WeekdayPicker,
} from './parts';
import {useSaveRecovery} from './save-recovery';

const usesText = (uses: Schedule[]) =>
  uses.map((use) => `${daysLabel(use.weekdays_mask ?? 0)}${use.time ? ` at ${use.time.slice(0, 5)}` : ''}`).join(', ');

export function ScheduleDialog({
  clientId,
  state,
  commit,
  schedule,
  day,
  onEditMeal,
  onClose,
}: {
  clientId: string;
  state: State;
  commit: Commit;
  schedule: Schedule;
  day: Day;
  onEditMeal: (preset: Preset) => void;
  onClose: () => void;
}) {
  const [baseline] = useState(state);
  const original = presetOf(baseline, schedule.nutrition_preset_id);
  const [presetId, setPresetId] = useState(schedule.nutrition_preset_id);
  const [time, setTime] = useState(schedule.time?.slice(0, 5) ?? '');
  const [mask, setMask] = useState(schedule.weekdays_mask ?? day.bit);
  const [item, setItem] = useState(original ? directItem(original) : null);
  const [changing, setChanging] = useState(false);
  const save = useSaveNutritionSchedule(clientId);
  const remove = useRemoveNutritionSchedule(clientId);
  const recovery = useSaveRecovery(clientId, onClose);
  const pending = save.isPending || remove.isPending || recovery.checking;
  const preset = presetOf(baseline, presetId) ?? presetOf(state, presetId);
  if (!preset || !original) {
    return null;
  }
  const otherUses = usesOf(baseline, preset.id).filter((use) => use.id !== schedule.id);
  const timingChanged =
    presetId !== schedule.nutrition_preset_id ||
    time !== (schedule.time?.slice(0, 5) ?? '') ||
    mask !== schedule.weekdays_mask;
  const itemChanged = JSON.stringify(item) !== JSON.stringify(directItem(original));
  const dirty = timingChanged || itemChanged;
  const title = presetTitle(preset);
  const staysOn = (schedule.weekdays_mask ?? 0) & ~day.bit;
  const blocked =
    mask === 0
      ? `Pick at least one day, or use Remove from ${day.long}.`
      : item && !isAmount(item.amount)
        ? 'Fix the amount to save.'
        : null;
  const submit = async (removing: boolean) => {
    if (pending || recovery.blocked) {
      return;
    }
    try {
      const body: ScheduleUpdate = {
        nutrition_preset_id: presetId,
        time: time || null,
        weekdays_mask: mask,
        ...(item && itemChanged ? {amount: Number(item.amount), unit: item.unit} : {}),
      };
      recovery.begin(
        removing
          ? {kind: 'remove', before: baseline, id: schedule.id, weekday: day.number}
          : {kind: 'schedule', before: baseline, id: schedule.id, body},
      );
      const result = removing
        ? await remove.mutateAsync({id: schedule.id, weekday: day.number})
        : await save.mutateAsync({
            id: schedule.id,
            body,
          });
      commit(result, removing ? `${title} removed from ${day.long}.` : `${title} saved for ${daysLabel(mask)}.`);
      onClose();
    } catch (cause) {
      recovery.fail(cause, 'Could not save this schedule. Your edits are still here. Try again.');
    }
  };
  if (changing) {
    return (
      <EditDialog
        title="Use a different meal"
        description={`For ${daysLabel(mask)}`}
        dirty
        onClose={onClose}
        footer={
          <Button
            variant="ghost"
            className="mr-auto"
            onPress={() => setChanging(false)}
          >
            Back
          </Button>
        }
      >
        <MealList
          clientId={clientId}
          state={state}
          exclude={presetId}
          onPick={(picked) => {
            setPresetId(picked.id);
            setChanging(false);
          }}
        />
      </EditDialog>
    );
  }
  return (
    <EditDialog
      title={title}
      description={`${day.long} · ${schedule.time?.slice(0, 5) ?? 'any time'}`}
      dirty={dirty}
      pending={pending}
      canClose={!recovery.uncertain}
      recovery={<SaveRecovery recovery={recovery} />}
      onClose={onClose}
      footer={
        <>
          <div className="mr-auto space-y-0.5">
            <Button
              size="sm"
              variant="destructive"
              isPending={remove.isPending}
              isDisabled={save.isPending || recovery.blocked}
              onPress={() => submit(true)}
            >
              Remove from {day.long}
            </Button>
            {staysOn !== 0 && <p className="px-1 text-sm text-muted-foreground">Stays on {daysLabel(staysOn)}.</p>}
          </div>
          {blocked && dirty && <p className={cn(errorClass, 'w-full text-right sm:w-auto')}>{blocked}</p>}
          <Button
            variant="ghost"
            isDisabled={pending || recovery.blocked}
            onPress={onClose}
          >
            Cancel
          </Button>
          <Button
            isPending={save.isPending}
            isDisabled={!dirty || blocked !== null || remove.isPending || recovery.blocked}
            onPress={() => submit(false)}
          >
            Save
          </Button>
        </>
      }
    >
      <section className="space-y-2 rounded-xl border border-border p-3">
        {preset.type === 'meal' ? (
          <>
            <h3 className="text-sm font-medium text-muted-foreground">
              {preset.options.length > 1 ? 'The client chooses one option' : 'Meal'}
            </h3>
            <ul className="space-y-1">
              {preset.options.map((option, index) => (
                <li key={option.id}>
                  {index > 0 && <span className="text-sm text-muted-foreground">or </span>}
                  <span className="font-semibold">{presetSummary({...preset, options: [option]})}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                isDisabled={dirty || recovery.blocked}
                onPress={() => onEditMeal(preset)}
              >
                Edit meal
              </Button>
              <Button
                size="sm"
                variant="ghost"
                isDisabled={recovery.blocked}
                onPress={() => setChanging(true)}
              >
                Use a different meal
              </Button>
            </div>
            {dirty && (
              <p className="text-sm text-muted-foreground">Save or cancel your changes before you edit the meal.</p>
            )}
          </>
        ) : (
          item && (
            <>
              <h3 className="text-sm font-medium text-muted-foreground">Amount</h3>
              <AmountFields
                item={item}
                onChange={setItem}
              />
            </>
          )
        )}
        {otherUses.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Also on {usesText(otherUses)}.{' '}
            {preset.type === 'meal' ? 'Editing the meal changes it there too.' : 'A new amount applies there too.'}
          </p>
        )}
      </section>
      <TimeField
        time={time}
        onChange={setTime}
      />
      <div className="space-y-2">
        <p className="text-sm font-medium">Every week on</p>
        <WeekdayPicker
          mask={mask}
          onChange={setMask}
        />
        <p className="text-sm text-muted-foreground">
          {mask === 0 ? 'No days picked.' : `Saving changes ${daysLabel(mask)}, from today.`}
        </p>
      </div>
    </EditDialog>
  );
}
