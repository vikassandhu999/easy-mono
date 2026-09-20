import {useEffect, useRef, useState} from 'react';
import {useForm} from 'react-hook-form';
import {generatePath, useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {useProfile} from '../api/auth';
import {ApiError, errorMessage} from '../api/client';
import {removeDraft} from '../api/drafts';
import {getSession} from '../api/session';
import {
  useDeleteWeight,
  useSaveWeight,
  useWeightDay,
  WeightConflict,
  type WeightEntry,
  type WeightSave,
  weightSaveMatches,
} from '../api/weight';
import {safeReturnTo} from '../auth/return-to';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {CachedRead} from '../ui/cached-read';
import {Confirm} from '../ui/confirm';
import {useOnline} from '../ui/connection-status';
import {DraftStatus} from '../ui/draft-status';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {Input} from '../ui/input';
import {Page} from '../ui/page';
import {ReadState} from '../ui/read-state';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {useDurableDraft} from '../ui/use-durable-draft';
import {initialWeightDraft, isDay, parseWeightDraft, type WeightDraft, weightDate, weightInput} from './weight-draft';

export function Weight() {
  const {date = ''} = useParams();
  const [params] = useSearchParams();
  const back = params.has('returnTo') ? safeReturnTo(params.get('returnTo')) : routes.progress;
  return (
    <Page
      title="Record weight"
      description={isDay(date) ? weightDate(date) : undefined}
      back={back}
      compact
    >
      {isDay(date) ? (
        <WeightDay
          date={date}
          back={back}
        />
      ) : (
        <p role="alert">Choose a valid date from Weight & progress.</p>
      )}
    </Page>
  );
}

function WeightDay({date, back}: {date: string; back: string}) {
  const query = useWeightDay(date);
  const profile = useProfile();
  const navigate = useNavigate();
  return (
    <div className="space-y-5">
      <label
        htmlFor="weight-date"
        className="grid gap-2"
      >
        Record weight for
        <Input
          id="weight-date"
          type="date"
          value={date}
          max={profile.data?.data.local_date}
          onChange={(event) => {
            const next = event.target.value;
            if (isDay(next)) {
              navigate(`${generatePath(routes.weight, {date: next})}?${new URLSearchParams({returnTo: back})}`, {
                replace: true,
              });
            }
          }}
        />
      </label>
      {!query.data || !profile.data ? (
        <ReadState
          label="your weight record"
          failed={query.isError || profile.isError}
          retry={() => {
            query.refetch();
            profile.refetch();
          }}
        />
      ) : (
        <>
          <CachedRead
            updatedAt={query.dataUpdatedAt}
            failed={query.isError}
            refreshing={query.isFetching}
            refresh={() => query.refetch()}
          />
          <WeightEditor
            key={`${getSession()?.id}.${date}`}
            date={date}
            back={back}
            saved={query.data.data}
            defaultUnit={profile.data.data.default_weight_unit === 'lbs' ? 'lbs' : 'kg'}
            fresh={query.isFetchedAfterMount && !query.isError && !query.isFetching}
          />
        </>
      )}
    </div>
  );
}

function WeightEditor({
  date,
  back,
  saved,
  defaultUnit,
  fresh,
}: {
  date: string;
  back: string;
  saved: WeightEntry | null;
  defaultUnit: WeightEntry['unit'];
  fresh: boolean;
}) {
  const [owner] = useState(() => getSession()?.id);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const resource = `weight.${date}`;
  const controller = useDurableDraft({
    initial: initialWeightDraft(date, saved, defaultUnit),
    resource,
    parse: (raw) => parseWeightDraft(raw, date),
    label: 'weight',
  });
  const {draft, update} = controller;
  const form = useForm<Pick<WeightDraft, 'value' | 'unit' | 'note'>>({
    defaultValues: {value: '', unit: defaultUnit, note: ''},
  });
  const save = useSaveWeight();
  const remove = useDeleteWeight();
  const navigate = useNavigate();
  const online = useOnline();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<'discard' | 'replace' | 'delete' | null>(null);
  useEffect(() => {
    if (draft) {
      const fields = {value: draft.value, unit: draft.unit, note: draft.note};
      if (JSON.stringify(fields) !== JSON.stringify(form.getValues())) {
        form.reset(fields);
      }
    }
  }, [draft, form]);
  const draftReady = Boolean(draft);
  useEffect(() => {
    if (!draftReady || busy) {
      return;
    }
    const subscription = form.watch((values, {name}) => {
      if (name) {
        update((current) => ({
          ...current,
          value: values.value ?? '',
          unit: values.unit ?? current.unit,
          note: values.note ?? '',
        }));
      }
    });
    return () => subscription.unsubscribe();
  }, [draftReady, busy, form, update]);
  const expected = draft?.expected;
  const conflict = Boolean(
    draft &&
      !(draft.attempt && weightSaveMatches(draft.attempt, saved)) &&
      (expected ? expected.id !== saved?.id || expected.revision !== saved.revision : saved !== null),
  );
  const locked = busy || Boolean(draft?.attempt) || conflict;

  async function finish(entry: WeightEntry | null, outcome: 'saved' | 'deleted') {
    if (!(await update(() => initialWeightDraft(date, entry, defaultUnit), true))) {
      throw new Error(
        'Your change is saved, but this device could not clear the draft. Check the saved result before editing.',
      );
    }
    if (!owner || getSession()?.id !== owner) {
      return;
    }
    await removeDraft(owner, resource);
    if (getSession()?.id !== owner || !mounted.current) {
      return;
    }
    const destination = new URL(back, 'https://clientapp.invalid');
    destination.searchParams.set(outcome, date);
    await navigate(destination.pathname + destination.search);
  }

  const submit = form.handleSubmit(async (values) => {
    if (!draft || !online || !fresh || busy) {
      return;
    }
    setError('');
    let input: WeightSave;
    try {
      input = draft.attempt ?? weightInput({...draft, ...values});
    } catch (validation) {
      form.setError(
        'value',
        {message: validation instanceof Error ? validation.message : 'Review this weight.'},
        {shouldFocus: true},
      );
      return;
    }
    setBusy(true);
    try {
      if (!(await update((current) => ({...current, ...values, attempt: input}), true))) {
        setError('Your draft could not be kept safely on this device. No save was sent. Please try again.');
        return;
      }
      const result = await save.mutateAsync(input);
      await finish(result.data, 'saved');
    } catch (caught) {
      if (caught instanceof ApiError && caught.status >= 400 && caught.status < 500 && caught.status !== 409) {
        await update((current) => ({...current, attempt: null}), true);
      }
      setError(
        caught instanceof WeightConflict
          ? caught.message
          : errorMessage(caught, 'The save could not be confirmed. Your draft is kept. Check the save when connected.'),
      );
    } finally {
      setBusy(false);
    }
  });

  async function confirmAction() {
    setBusy(true);
    setError('');
    try {
      if (confirm === 'delete' && saved) {
        await remove.mutateAsync(saved);
        await finish(null, 'deleted');
      } else {
        const changed = await update(
          (current) =>
            confirm === 'replace'
              ? {...current, expected: saved ? {id: saved.id, revision: saved.revision} : null, attempt: null}
              : initialWeightDraft(date, saved, defaultUnit),
          true,
        );
        if (!changed) {
          return;
        }
      }
      setConfirm(null);
    } catch (caught) {
      setError(errorMessage(caught, 'The change could not be confirmed. Your draft is kept.'));
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {saved && (
        <p className="text-sm text-muted-foreground">
          Saved:{' '}
          <strong>
            {saved.value} {saved.unit}
          </strong>
          {saved.note ? ` · ${saved.note}` : ''}
        </p>
      )}
      {controller.loadError ? (
        <>
          <FormError message={controller.loadError} />
          <Button
            variant="outline"
            onPress={() => setConfirm('discard')}
          >
            Discard unreadable draft
          </Button>
        </>
      ) : !draft ? (
        <p role="status">Opening your weight draft…</p>
      ) : (
        <>
          {conflict && (
            <div className="space-y-3">
              <p role="alert">
                This date has changed.{' '}
                {saved
                  ? 'Review the saved weight above before replacing it.'
                  : 'The saved record was removed on another device.'}
              </p>
              <Button
                variant="outline"
                isDisabled={!online || !fresh || busy}
                onPress={() => setConfirm('replace')}
              >
                Review my draft
              </Button>
            </div>
          )}
          <form
            className="space-y-5"
            noValidate
            onSubmit={submit}
          >
            <div className="rounded-[2rem] bg-[var(--progress)] p-5 space-y-4">
              <FormField
                control={form.control}
                name="value"
                label="Weight"
                emphasis="measurement"
                inputMode="decimal"
                isRequired
                isDisabled={locked}
                maxLength={30}
              />
              <SelectField
                aria-label="Weight unit"
                value={form.watch('unit')}
                isDisabled={locked}
                onChange={(value) => {
                  if (value === 'kg' || value === 'lbs') {
                    form.setValue('unit', value, {shouldDirty: true});
                  }
                }}
              >
                <SelectItem id="kg">Kilograms (kg)</SelectItem>
                <SelectItem id="lbs">Pounds (lb)</SelectItem>
              </SelectField>
            </div>
            <FormField
              control={form.control}
              name="note"
              label="Note"
              description="Anything you’d like to remember. Optional."
              multiline
              maxLength={500}
              isDisabled={locked}
            />
            <DraftStatus state={controller.state} />
            {draft.attempt && (
              <p className="text-sm text-muted-foreground">
                This save is kept unchanged until its result is confirmed.
              </p>
            )}
            <div className="mobile-save-bar">
              <Button
                type="submit"
                className="w-full"
                isPending={busy}
                isDisabled={!online || !fresh || conflict}
              >
                {draft.attempt ? 'Check save' : 'Save weight'}
              </Button>
            </div>
            {!online && (
              <p className="text-sm text-muted-foreground">Your edits stay on this device. Reconnect to save.</p>
            )}
          </form>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              isDisabled={busy || Boolean(draft.attempt)}
              onPress={() => setConfirm('discard')}
            >
              Discard draft
            </Button>
            {saved && (
              <Button
                variant="ghost"
                isDisabled={locked || !online || !fresh}
                onPress={() => setConfirm('delete')}
              >
                Delete weight
              </Button>
            )}
          </div>
        </>
      )}
      <FormError message={error} />
      {confirm && (
        <Confirm
          title={
            confirm === 'delete'
              ? 'Delete this weight?'
              : confirm === 'replace'
                ? 'Use your draft?'
                : 'Discard this draft?'
          }
          action={confirm === 'delete' ? 'Delete weight' : confirm === 'replace' ? 'Use my draft' : 'Use saved weight'}
          pending={busy}
          onClose={() => setConfirm(null)}
          onConfirm={confirmAction}
        >
          <p>
            {confirm === 'delete'
              ? 'This removes your directly recorded weight for this date and its unsaved draft. Check-in responses stay unchanged.'
              : confirm === 'replace'
                ? `Your draft is ${draft?.value} ${draft?.unit}. ${saved ? `The saved weight is ${saved.value} ${saved.unit}.` : 'There is no saved weight for this date.'} Continue to review your draft, then save it deliberately.`
                : 'Your unsaved changes for this date will be removed from this device.'}
          </p>
        </Confirm>
      )}
    </div>
  );
}
