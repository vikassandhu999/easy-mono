import {useRef, useState} from 'react';
import {type NutritionTargets, type TargetDayBody, useSaveNutritionTargetDay} from '../api/nutrition-week';
import {Button} from '../ui/button';
import {cn} from '../ui/cn';
import {Input} from '../ui/input';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {
  coreCodes,
  type Day,
  daysLabel,
  daysOfTargets,
  type State,
  type TargetDraft,
  type TargetMode,
  targetsOn,
  toBounds,
  toDraft,
} from './model';
import {type Commit, EditDialog, errorClass, fieldClass, SaveRecovery} from './parts';
import {useSaveRecovery} from './save-recovery';

const modes: Array<{value: TargetMode; label: string}> = [
  {value: 'none', label: 'No target'},
  {value: 'exact', label: 'Exactly'},
  {value: 'min', label: 'At least'},
  {value: 'max', label: 'At most'},
  {value: 'range', label: 'Between'},
];
type SetDraft = {id: string; name: string; values: Record<string, TargetDraft>; isNew: boolean};
const draftOf = (set: NutritionTargets, state: State): SetDraft => ({
  id: set.id,
  name: set.name,
  isNew: false,
  values: Object.fromEntries(state.nutrients.map((nutrient) => [nutrient.code, toDraft(set.targets[nutrient.code])])),
});
const boundsOf = (draft: SetDraft) =>
  Object.fromEntries(
    Object.entries(draft.values).flatMap(([code, value]) => {
      const bounds = toBounds(value);
      return bounds && typeof bounds !== 'string' ? [[code, bounds]] : [];
    }),
  );
const invalid = (draft: SetDraft) =>
  !draft.name.trim() || Object.values(draft.values).some((value) => typeof toBounds(value) === 'string');

export function TargetsDialog({
  clientId,
  state,
  commit,
  day,
  onClose,
}: {
  clientId: string;
  state: State;
  commit: Commit;
  day: Day;
  onClose: () => void;
}) {
  const [baseline] = useState(state);
  const [original] = useState(() => state.nutrition_targets.map((set) => draftOf(set, state)));
  const [drafts, setDrafts] = useState(original);
  const [selectedId, setSelectedId] = useState<string | null>(targetsOn(state, day.bit)?.id ?? null);
  const selected = drafts.find((draft) => draft.id === selectedId);
  const [added, setAdded] = useState<string[]>([]);
  const [attempted, setAttempted] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const save = useSaveNutritionTargetDay(clientId);
  const recovery = useSaveRecovery(clientId, onClose);
  const pending = save.isPending || recovery.checking;
  const otherDays = selected && !selected.isNew ? daysOfTargets(baseline, selected.id) & ~day.bit : 0;
  const shown = [
    ...coreCodes.flatMap((code) => state.nutrients.filter((nutrient) => nutrient.code === code)),
    ...state.nutrients.filter(
      (nutrient) =>
        !coreCodes.includes(nutrient.code) &&
        (selected?.values[nutrient.code]?.mode !== 'none' || added.includes(nutrient.code)),
    ),
  ];
  const hidden = state.nutrients.filter((nutrient) => !shown.includes(nutrient));
  const changed = (draft: SetDraft) =>
    JSON.stringify(draft) !== JSON.stringify(original.find((set) => set.id === draft.id));
  const dirty =
    selectedId !== (targetsOn(baseline, day.bit)?.id ?? null) ||
    drafts.some((draft) => !draft.isNew && changed(draft)) ||
    Boolean(selected?.isNew);
  const edit = (patch: Partial<SetDraft>) => {
    if (selected) {
      setDrafts(drafts.map((draft) => (draft.id === selected.id ? {...draft, ...patch} : draft)));
    }
  };
  const create = (copy: SetDraft | null) => {
    const next: SetDraft = {
      id: crypto.randomUUID(),
      name: copy ? `${copy.name.trim() || 'Targets'} (${day.short})` : 'New targets',
      isNew: true,
      values: copy
        ? structuredClone(copy.values)
        : Object.fromEntries(state.nutrients.map((nutrient) => [nutrient.code, toDraft(undefined)])),
    };
    // The values move to the copy; the shared set keeps its saved values.
    const remaining = drafts.map((draft) =>
      copy?.id === draft.id && !draft.isNew ? (original.find((set) => set.id === draft.id) ?? draft) : draft,
    );
    setDrafts([...remaining, next]);
    setSelectedId(next.id);
    setAttempted(false);
    setAdded([]);
  };
  const submit = async () => {
    if (pending || recovery.blocked) {
      return;
    }
    const updates = drafts.filter((draft) => !draft.isNew && changed(draft));
    const failed = [...updates, ...(selected ? [selected] : [])].find(invalid);
    if (failed) {
      setSelectedId(failed.id);
      setAttempted(true);
      requestAnimationFrame(() => body.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    try {
      const body: TargetDayBody = {
        nutrition_targets_id: selected && !selected.isNew ? selected.id : null,
        target_updates: updates.map((draft) => ({id: draft.id, name: draft.name.trim(), targets: boundsOf(draft)})),
        ...(selected?.isNew ? {new_targets: {name: selected.name.trim(), targets: boundsOf(selected)}} : {}),
      };
      recovery.begin({kind: 'targets', before: baseline, weekday: day.number, body});
      const result = await save.mutateAsync({
        weekday: day.number,
        body,
      });
      commit(
        result,
        selected
          ? `${selected.name.trim()} saved${otherDays ? ` for ${daysLabel(otherDays | day.bit)}` : ` for ${day.long}`}.`
          : `${day.long} has no targets.`,
      );
      onClose();
    } catch (cause) {
      recovery.fail(cause, 'Could not save these targets. Your edits are still here. Try again.');
    }
  };
  return (
    <EditDialog
      title={`${day.long} targets`}
      dirty={dirty}
      pending={pending}
      canClose={!recovery.uncertain}
      recovery={<SaveRecovery recovery={recovery} />}
      onClose={onClose}
      footer={
        <>
          <p className="mr-auto text-sm text-muted-foreground">Applies from today.</p>
          {attempted && selected && invalid(selected) && <p className={errorClass}>Fix the marked targets.</p>}
          <Button
            variant="ghost"
            isDisabled={pending || recovery.blocked}
            onPress={onClose}
          >
            Cancel
          </Button>
          <Button
            isPending={save.isPending}
            isDisabled={recovery.blocked}
            onPress={submit}
          >
            Save
          </Button>
        </>
      }
    >
      <div
        ref={body}
        className="space-y-5"
      >
        <div className="grid gap-1 text-sm font-medium">
          <span>Targets on {day.long}</span>
          <SelectField
            aria-label={`Targets on ${day.long}`}
            value={selectedId ?? 'none'}
            onChange={(value) => {
              if (value === 'new') {
                create(null);
              } else {
                setSelectedId(value === 'none' ? null : value);
                setAttempted(false);
                setAdded([]);
              }
            }}
          >
            <SelectItem id="none">No targets</SelectItem>
            {drafts.map((draft) => (
              <SelectItem
                key={draft.id}
                id={draft.id}
              >
                {draft.name}
              </SelectItem>
            ))}
            <SelectItem id="new">New target set…</SelectItem>
          </SelectField>
        </div>
        {selected && (
          <section className="space-y-4">
            {otherDays !== 0 && (
              <div className="space-y-2 rounded-xl bg-muted px-3 py-2 text-sm">
                <p>
                  {selected.name} is also used on {daysLabel(otherDays)}. Changing its values changes those days too.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => create(selected)}
                >
                  Use a copy for {day.long} only
                </Button>
              </div>
            )}
            <label
              htmlFor="target-set-name"
              className="grid gap-1 text-sm font-medium"
            >
              Name
              <Input
                id="target-set-name"
                aria-label="Name"
                value={selected.name}
                aria-invalid={attempted && !selected.name.trim()}
                {...(attempted && !selected.name.trim() ? {'aria-describedby': 'target-name-error'} : {})}
                onChange={(event) => edit({name: event.target.value})}
                className={fieldClass}
              />
              {attempted && !selected.name.trim() && (
                <span
                  id="target-name-error"
                  className={errorClass}
                >
                  Add a name.
                </span>
              )}
            </label>
            <div className="space-y-3">
              {shown.map((nutrient) => {
                const value = selected.values[nutrient.code] ?? toDraft(undefined);
                const result = toBounds(value);
                const problem = attempted && typeof result === 'string' ? result : null;
                const errorId = `target-error-${nutrient.code}`;
                const editValue = (patch: Partial<TargetDraft>) =>
                  edit({values: {...selected.values, [nutrient.code]: {...value, ...patch}}});
                const numberProps = {
                  inputMode: 'decimal' as const,
                  'aria-invalid': problem !== null,
                  ...(problem ? {'aria-describedby': errorId} : {}),
                  className: cn(fieldClass, 'w-20 text-right tabular-nums'),
                };
                return (
                  <div
                    key={nutrient.code}
                    role="group"
                    aria-label={nutrient.name}
                    className="grid grid-cols-[6.5rem_1fr] items-start gap-x-3 gap-y-1"
                  >
                    <span className="pt-3 text-sm font-medium">{nutrient.name}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <SelectField
                        aria-label={`${nutrient.name} target`}
                        value={value.mode}
                        className="w-32"
                        onChange={(mode) => {
                          const choice = modes.find((row) => row.value === mode);
                          if (choice) {
                            editValue({mode: choice.value});
                          }
                        }}
                      >
                        {modes.map((mode) => (
                          <SelectItem
                            key={mode.value}
                            id={mode.value}
                          >
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectField>
                      {value.mode !== 'none' && (
                        <span className="flex items-center gap-2">
                          {value.mode !== 'max' && (
                            <Input
                              aria-label={value.mode === 'range' ? `${nutrient.name} from` : `${nutrient.name} value`}
                              value={value.min}
                              onChange={(event) => editValue({min: event.target.value})}
                              {...numberProps}
                            />
                          )}
                          {value.mode === 'range' && <span>to</span>}
                          {(value.mode === 'max' || value.mode === 'range') && (
                            <Input
                              aria-label={value.mode === 'range' ? `${nutrient.name} to` : `${nutrient.name} value`}
                              value={value.max}
                              onChange={(event) => editValue({max: event.target.value})}
                              {...numberProps}
                            />
                          )}
                          <span className="text-sm text-muted-foreground">{nutrient.unit}</span>
                        </span>
                      )}
                    </div>
                    {problem && (
                      <p
                        id={errorId}
                        className={cn(errorClass, 'col-start-2')}
                      >
                        {problem}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {hidden.length > 0 && (
              <SelectField
                aria-label="Add nutrient"
                value="none"
                onChange={(code) => {
                  if (code !== 'none') {
                    setAdded([...added, code]);
                  }
                }}
                className="w-48"
              >
                <SelectItem id="none">Add nutrient…</SelectItem>
                {hidden.map((nutrient) => (
                  <SelectItem
                    key={nutrient.code}
                    id={nutrient.code}
                  >
                    {nutrient.name}
                  </SelectItem>
                ))}
              </SelectField>
            )}
          </section>
        )}
      </div>
    </EditDialog>
  );
}
