import {useState} from 'react';
import {useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {type ClientDay, useClientDay} from '../api/client-days';
import {removeDraft} from '../api/drafts';
import {type NutritionInput, useDeleteNutrition, useRestoreNutrition, useSaveNutrition} from '../api/nutrition-logs';
import {getSession} from '../api/session';
import {useCoaching} from '../ui/coaching';
import {DraftStatus} from '../ui/draft-status';
import {Page} from '../ui/page';
import {ReadState} from '../ui/read-state';
import {useUndoMessage} from '../ui/undo-message';
import {useDurableDraft} from '../ui/use-durable-draft';
import {MealLogger} from './meal-logger';
import {
  amountText,
  asNutritionLog,
  asPreset,
  dayLabel,
  dayName,
  draftKey,
  type MealDraft,
  mealSeed,
  parseMealDraft,
  presetTitle,
  totalOf,
  valuesLine,
} from './model';

export function Meal() {
  const {date = '', scheduleId = 'new'} = useParams();
  const [params] = useSearchParams();
  const day = useClientDay(date);
  const {canWrite} = useCoaching();
  if (!day.data) {
    return (
      <Page
        title="Opening your meal"
        back={`/?date=${date}`}
      >
        <ReadState
          label="your meal"
          failed={day.isError}
          retry={() => {
            day.refetch();
          }}
        />
      </Page>
    );
  }
  return (
    <MealEditor
      key={`${date}.${scheduleId}.${params.get('log') ?? 'new'}`}
      day={day.data.data}
      scheduleId={scheduleId === 'new' ? null : scheduleId}
      logId={params.get('log')}
      canWrite={canWrite}
    />
  );
}
function MealEditor({
  day,
  scheduleId,
  logId,
  canWrite,
}: {
  day: ClientDay;
  scheduleId: string | null;
  logId: string | null;
  canWrite: boolean;
}) {
  const nav = useNavigate();
  const show = useUndoMessage();
  const raw = day.nutrition_logs.find(
    (row) =>
      row.id === logId ||
      (!logId && scheduleId && row.nutrition_schedule_id === scheduleId && row.scheduled_date === day.date),
  );
  const schedule = day.nutrition_schedules.find((row) => row.id === scheduleId);
  const original = day.presets.find((row) => row.id === (raw?.nutrition_preset_id ?? schedule?.nutrition_preset_id));
  const preset = original ? asPreset(original) : null;
  const saved = raw ? asNutritionLog(raw) : undefined;
  const resource = draftKey(day.date, scheduleId, saved?.id);
  const [seed] = useState(() => mealSeed(day.date, scheduleId, preset, schedule?.time ?? null, saved, day.today));
  const durable = useDurableDraft({initial: seed, resource, parse: parseMealDraft, label: 'meal'});
  const save = useSaveNutrition();
  const remove = useDeleteNutrition();
  const restore = useRestoreNutrition();
  const [error, setError] = useState('');
  const back = () =>
    nav(`/?date=${day.date}`, {state: {focus: `card-${scheduleId ?? saved?.id ?? `add-${day.date}`}`}});
  if (!durable.draft) {
    return (
      <Page
        title={preset ? presetTitle(preset) : 'Food you ate'}
        back={`/?date=${day.date}`}
      >
        <ReadState
          label="your device draft"
          failed={Boolean(durable.loadError)}
          retry={() => {
            nav(0);
          }}
        />
        {durable.loadError && <p role="alert">{durable.loadError}</p>}
      </Page>
    );
  }
  const future = day.date > day.today || !canWrite;
  if (future) {
    const items =
      saved?.items ??
      (preset?.type === 'meal' ? preset.options.flatMap((option) => option.items) : preset?.item ? [preset.item] : []);
    return (
      <Page
        title={preset ? presetTitle(preset) : 'Food you ate'}
        description={
          saved ? `${dayLabel(saved.date)} · recorded ${saved.time}` : 'Planned. You can record it on the day.'
        }
        back={`/?date=${day.date}`}
      >
        <ul className="grid gap-2">
          {items.map((item) => (
            <li key={item.id}>
              {item.food.name} · {amountText(item.food, item.amount, item.unit)}
            </li>
          ))}
        </ul>
        {saved && <p className="mt-4 font-semibold">{valuesLine(totalOf(saved.items))}</p>}
      </Page>
    );
  }

  const update = (draft: MealDraft | null) => {
    durable.update(() => (draft ? {...draft, changed: true} : seed));
  };
  return (
    <MealLogger
      date={day.date}
      scheduleId={scheduleId}
      preset={preset}
      time={schedule?.time ?? null}
      saved={saved}
      draft={durable.draft.changed ? durable.draft : undefined}
      baseDraft={seed}
      back={dayName(day.date, day.today)}
      pending={save.isPending || remove.isPending}
      error={error}
      draftStatus={<DraftStatus state={durable.state} />}
      onDraft={update}
      onClose={back}
      onSave={async (draft) => {
        setError('');
        const body: NutritionInput = {
          logged_on: draft.date,
          logged_at: draft.time,
          meal_option_id: draft.optionId,
          food_logs: draft.items.map((item) => ({
            ...(raw?.food_logs.some((savedItem) => savedItem.id === item.id) ? {id: item.id} : {}),
            food_id: item.food.id,
            amount: item.amount,
            unit: item.unit,
            meal_item_id: item.mealItemId,
          })),
          ...(scheduleId ? {nutrition_schedule_id: scheduleId, scheduled_date: raw?.scheduled_date ?? day.date} : {}),
        };
        try {
          const result = await save.mutateAsync({...(saved ? {id: saved.id} : {}), body});
          const owner = getSession()?.id;
          if (owner) {
            await durable.update(
              () =>
                mealSeed(day.date, scheduleId, preset, schedule?.time ?? null, asNutritionLog(result.data), day.today),
              true,
            );
            try {
              await removeDraft(owner, resource);
            } catch {
              show({text: 'Record saved. The device draft could not be cleared.'});
            }
          }
          const token = 'undo_token' in result && typeof result.undo_token === 'string' ? result.undo_token : null;
          show({
            text: saved ? 'Record updated.' : `${preset ? presetTitle(preset) : 'Food'} recorded.`,
            undo: () => (token ? restore.mutateAsync(token) : remove.mutateAsync(result.data.id)),
          });
          back();
        } catch (cause) {
          setError(errorMessage(cause, 'Could not save. Check your connection and try again.'));
        }
      }}
      onDelete={async (log) => {
        setError('');
        try {
          const result = await remove.mutateAsync(log.id);
          const owner = getSession()?.id;
          if (owner) {
            await removeDraft(owner, resource);
          }
          show({text: 'Record deleted.', undo: () => restore.mutateAsync(result.undo_token)});
          back();
        } catch (cause) {
          setError(errorMessage(cause, 'Could not delete. Try again.'));
        }
      }}
    />
  );
}
