import {Target} from 'lucide-react';
import {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {type Profile, useProfile} from '../api/auth';
import {ApiError, errorMessage} from '../api/client';
import {removeDraft} from '../api/drafts';
import {type GoalSave, profileGoal, sameGoal, useSaveGoal} from '../api/goal';
import {getSession} from '../api/session';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {CachedRead} from '../ui/cached-read';
import {Confirm} from '../ui/confirm';
import {useOnline} from '../ui/connection-status';
import {DraftStatus} from '../ui/draft-status';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {Page} from '../ui/page';
import {ReadState} from '../ui/read-state';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {useDurableDraft} from '../ui/use-durable-draft';
import {type GoalDraft, goalInput, initialGoalDraft, parseGoalDraft} from './goal-draft';

export function WeightGoal() {
  const query = useProfile();
  return (
    <Page
      title="Weight goal"
      back={routes.account}
      compact
    >
      {!query.data ? (
        <ReadState
          label="your goal"
          failed={query.isError}
          retry={() => query.refetch()}
        />
      ) : (
        <>
          <CachedRead
            updatedAt={query.dataUpdatedAt}
            failed={query.isError}
            refreshing={query.isFetching}
            refresh={() => query.refetch()}
          />
          <GoalEditor
            key={getSession()?.id}
            profile={query.data.data}
          />
        </>
      )}
    </Page>
  );
}

function GoalEditor({profile}: {profile: Profile}) {
  const [owner] = useState(() => getSession()?.id);
  const controller = useDurableDraft({
    initial: initialGoalDraft(profile),
    resource: 'goal',
    parse: parseGoalDraft,
    label: 'goal',
  });
  const {draft, update} = controller;
  const form = useForm<Pick<GoalDraft, 'value' | 'unit'>>({defaultValues: {value: '', unit: 'kg'}});
  const mutation = useSaveGoal();
  const online = useOnline();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState<'discard' | 'replace' | 'remove' | null>(null);
  useEffect(() => {
    if (draft && (form.getValues('value') !== draft.value || form.getValues('unit') !== draft.unit)) {
      form.reset({value: draft.value, unit: draft.unit});
    }
  }, [draft, form]);
  const ready = Boolean(draft);
  useEffect(() => {
    if (!ready || busy) {
      return;
    }
    const subscription = form.watch((values, {name}) => {
      if (name) {
        setNotice('');
        update((current) => ({...current, value: values.value ?? '', unit: values.unit ?? current.unit}));
      }
    });
    return () => subscription.unsubscribe();
  }, [ready, busy, form, update]);
  const saved = profileGoal(profile);
  const conflict = Boolean(
    draft && !sameGoal(draft.expected, saved) && !(draft.attempt && sameGoal(draft.attempt.goal, saved)),
  );
  const locked = busy || conflict || Boolean(draft?.attempt);

  async function save(input: GoalSave) {
    if (!online || busy) {
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (!(await update((current) => ({...current, attempt: input}), true))) {
        setError('Your draft could not be kept safely on this device. No save was sent. Please try again.');
        return;
      }
      const result = await mutation.mutateAsync(input);
      if (!(await update(() => initialGoalDraft(result.data), true))) {
        throw new Error(
          'Your goal is saved, but this device could not clear its draft. Reopen this screen to check it.',
        );
      }
      if (!owner || getSession()?.id !== owner) {
        return;
      }
      await removeDraft(owner, 'goal');
      if (getSession()?.id === owner) {
        setNotice(input.goal.goal_weight_value === null ? 'Your goal was removed.' : 'Your goal is saved.');
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.status >= 400 && caught.status < 500) {
        await update((current) => ({...current, attempt: null}), true);
      }
      setError(
        errorMessage(caught, 'The save could not be confirmed. Your draft is kept. Check the save when connected.'),
      );
    } finally {
      setBusy(false);
    }
  }

  const submit = form.handleSubmit(async (values) => {
    if (!draft || conflict) {
      return;
    }
    let input: GoalSave;
    try {
      input = draft.attempt ?? {goal: goalInput(values.value, values.unit), expected: draft.expected};
    } catch (caught) {
      form.setError(
        'value',
        {message: caught instanceof Error ? caught.message : 'Review your goal.'},
        {shouldFocus: true},
      );
      return;
    }
    await save(input);
  });

  async function confirmAction() {
    if (confirm === 'remove' && draft) {
      await save({goal: {goal_weight_value: null, goal_weight_unit: null}, expected: draft.expected});
    } else {
      setBusy(true);
      setError('');
      await update(
        (current) => (confirm === 'replace' ? {...current, expected: saved, attempt: null} : initialGoalDraft(profile)),
        true,
      );
      setBusy(false);
    }
    setConfirm(null);
  }

  return (
    <div className="space-y-5">
      <p className="text-muted-foreground">A goal is optional. Choose what feels right for you and your coaching.</p>
      {saved.goal_weight_value !== null && (
        <p className="text-sm text-muted-foreground">
          Saved goal:{' '}
          <strong>
            {saved.goal_weight_value} {saved.goal_weight_unit === 'lbs' ? 'lb' : 'kg'}
          </strong>
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
        <p role="status">Opening your goal draft…</p>
      ) : (
        <>
          {conflict && (
            <div className="space-y-3">
              <p role="alert">
                Your goal changed elsewhere. Review the saved goal{' '}
                {saved.goal_weight_value === null ? '(now removed)' : 'above'} before using your draft.
              </p>
              <Button
                variant="outline"
                isDisabled={!online || busy}
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
              <Target
                className="size-7"
                aria-hidden="true"
              />
              <FormField
                control={form.control}
                name="value"
                label="Goal weight"
                emphasis="measurement"
                inputMode="decimal"
                isRequired
                isDisabled={locked}
                maxLength={30}
              />
              <SelectField
                aria-label="Goal unit"
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
                isDisabled={!online || conflict}
              >
                {draft.attempt ? 'Check save' : 'Save goal'}
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
            {saved.goal_weight_value !== null && (
              <Button
                variant="ghost"
                isDisabled={locked || !online}
                onPress={() => setConfirm('remove')}
              >
                Remove goal
              </Button>
            )}
          </div>
        </>
      )}
      <FormError message={error} />
      <p
        role="status"
        className="text-sm font-semibold"
      >
        {notice}
      </p>
      {confirm && (
        <Confirm
          title={
            confirm === 'remove'
              ? 'Remove your goal?'
              : confirm === 'replace'
                ? 'Use your draft?'
                : 'Discard this draft?'
          }
          action={confirm === 'remove' ? 'Remove goal' : confirm === 'replace' ? 'Use my draft' : 'Use saved goal'}
          pending={busy}
          onClose={() => setConfirm(null)}
          onConfirm={confirmAction}
        >
          <p>
            {confirm === 'remove'
              ? 'Your weight history stays saved. You can set a new goal whenever you like.'
              : confirm === 'replace'
                ? `Your draft is ${draft?.value} ${draft?.unit}. Continue to review it, then save deliberately.`
                : 'Your unsaved goal changes will be removed from this device.'}
          </p>
        </Confirm>
      )}
    </div>
  );
}
