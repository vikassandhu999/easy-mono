/**
 * CheckinScheduleAddContent — the add-schedule flow on the Check-ins tab,
 * rendered inside AssignSurface. Mirrors PlanAssignContent's two steps:
 *
 *  Step 1 "pick"     — search + browse check-in templates (check-in purpose only).
 *  Step 2 "schedule" — frequency + first due date, then start.
 */
import {formatDateISO} from '@easy/utils';
import {Button, ListBox, SearchField, Spinner, Typography, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {ChevronLeft, ClipboardList, Plus, X} from 'lucide-react';
import {useDeferredValue, useMemo, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useNavigate} from 'react-router-dom';
import {z} from 'zod';

import BrowseListBox, {BrowseRow} from '@/@components/browse-list-box';
import DateInput from '@/@components/date-input';
import {FormSelectField} from '@/@components/form-fields/form-select-field';
import ListEmptyState from '@/@components/list-empty-state';
import {ROUTES} from '@/@config/routes';
import type {ClientProfileFormTemplate} from '@/api/checkins';
import {CHECK_IN_FREQUENCIES, useCreateCheckInScheduleMutation, useListFormTemplatesQuery} from '@/api/checkins';
import {getApiErrorMessage, getValidationErrors} from '@/api/shared';

const scheduleSchema = z.object({
  frequency: z.enum(['once', 'weekly', 'biweekly', 'monthly']),
  nextDueOn: z.string().min(1, 'Pick a first check-in date'),
});

type ScheduleValues = z.infer<typeof scheduleSchema>;

interface Props {
  clientId: string;
  clientName: string;
  onClose: () => void;
}

export default function CheckinScheduleAddContent({clientId, clientName, onClose}: Props) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [step, setStep] = useState<'pick' | 'schedule'>('pick');
  const [selected, setSelected] = useState<ClientProfileFormTemplate | null>(null);
  const [error, setError] = useState<null | string>(null);

  const query = useListFormTemplatesQuery();
  const createScheduleMutation = useCreateCheckInScheduleMutation();

  const items = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    return (query.data?.data ?? []).filter(
      (template) =>
        template.purpose === 'check_in' &&
        template.status === 'active' &&
        (!needle || template.name.toLowerCase().includes(needle)),
    );
  }, [deferredSearch, query.data?.data]);

  const handlePick = (template: ClientProfileFormTemplate) => {
    setSelected(template);
    setError(null);
    setStep('schedule');
  };

  const handleConfirm = async (values: ScheduleValues) => {
    if (!selected) {
      return;
    }
    setError(null);
    try {
      await createScheduleMutation.mutateAsync({
        body: {form_template_id: selected.id, frequency: values.frequency, next_due_on: values.nextDueOn},
        clientId,
      });
      toast.success(`Check-in schedule added for ${clientName}`);
      onClose();
    } catch (e) {
      // Duplicate template lands on form_template_id — tie the message to the
      // picked template. Anything else (e.g. the schedule cap) carries its own
      // human message from the backend.
      const templateError = getValidationErrors(e)?.form_template_id?.[0];
      setError(
        templateError
          ? `"${selected.name}" ${templateError}. Pick a different template.`
          : getApiErrorMessage(e, "The schedule wasn't added. Try again."),
      );
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Typography
          type="body-sm"
          weight="semibold"
        >
          Add check-in schedule
        </Typography>
        <Button
          aria-label="Close"
          className="text-muted hover:text-foreground"
          isIconOnly
          onPress={onClose}
          size="sm"
          variant="ghost"
        >
          <X size={16} />
        </Button>
      </div>

      {step === 'pick' ? (
        <div className="space-y-3">
          <Typography
            color="muted"
            type="body-xs"
          >
            {clientName} will get this form on the cadence you choose.
          </Typography>
          <div className="sticky top-0 z-10 bg-surface pb-1">
            <SearchField
              aria-label="Search check-in forms"
              onChange={setSearch}
              value={search}
              variant="secondary"
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search check-in forms…" />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          </div>

          <BrowseListBox
            ariaLabel="Check-in forms"
            className="max-h-72 gap-0 overflow-y-auto p-0"
            emptyState={
              <ListEmptyState
                createLabel="Create form"
                createRoute={ROUTES.CREATE_CHECKIN}
                emptyDescription="Build a check-in form before scheduling it for a client."
                hasFilter={deferredSearch.trim().length > 0}
                nounPlural="check-in forms"
                onClearFilters={() => setSearch('')}
              />
            }
            fetchNextPage={() => undefined}
            isError={query.isError}
            isLoading={query.isLoading}
            items={items}
            onAction={(key) => {
              const template = items.find((item) => item.id === String(key));
              if (template) {
                handlePick(template);
              }
            }}
            onRetry={() => {
              query.refetch().catch(() => undefined);
            }}
            renderItem={(template) => (
              <BrowseRow
                icon={<ClipboardList size={16} />}
                iconClassName="bg-accent-soft text-accent"
                id={template.id}
                textValue={template.name}
                title={template.name}
              />
            )}
          />

          <Button
            className="h-auto w-full justify-start gap-2 p-2"
            onPress={() => navigate(ROUTES.CREATE_CHECKIN)}
            variant="outline"
          >
            <span className="grid size-6 place-items-center rounded-panel bg-accent-soft text-accent">
              <Plus size={14} />
            </span>
            Create a new check-in form
          </Button>
        </div>
      ) : selected ? (
        <ScheduleStep
          clientName={clientName}
          errorMessage={error}
          isSubmitting={createScheduleMutation.isPending}
          onBack={() => setStep('pick')}
          onChange={() => setError(null)}
          onConfirm={handleConfirm}
          templateName={selected.name}
        />
      ) : null}
    </div>
  );
}

/** The cadence step: frequency + first due date, then start. */
function ScheduleStep({
  clientName,
  errorMessage,
  isSubmitting,
  onBack,
  onChange,
  onConfirm,
  templateName,
}: {
  clientName: string;
  errorMessage: null | string;
  isSubmitting: boolean;
  onBack: () => void;
  /** Fires on any edit — the parent clears a stale server error. */
  onChange: () => void;
  onConfirm: (values: ScheduleValues) => Promise<void>;
  templateName: string;
}) {
  const today = formatDateISO(new Date());
  const form = useForm<ScheduleValues>({
    defaultValues: {frequency: 'weekly', nextDueOn: today},
    mode: 'onChange',
    resolver: zodResolver(scheduleSchema),
  });

  return (
    <form
      className="space-y-4 pb-2"
      onSubmit={form.handleSubmit(onConfirm)}
    >
      <Button
        className="-ml-2 text-muted"
        isDisabled={isSubmitting}
        onPress={onBack}
        size="sm"
        variant="ghost"
      >
        <ChevronLeft size={14} />
        Back to forms
      </Button>

      <div className="flex items-center gap-3 rounded-card border border-separator p-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-panel bg-accent-soft text-accent">
          <ClipboardList size={18} />
        </span>
        <div className="min-w-0">
          <Typography
            truncate
            type="body-sm"
            weight="semibold"
          >
            {templateName}
          </Typography>
          <Typography
            color="muted"
            truncate
            type="body-xs"
          >
            Scheduling for {clientName}
          </Typography>
        </div>
      </div>

      <FormSelectField
        control={form.control}
        isDisabled={isSubmitting}
        label="Frequency"
        name="frequency"
      >
        {CHECK_IN_FREQUENCIES.map((f) => (
          <ListBox.Item
            id={f.id}
            key={f.id}
            textValue={f.label}
          >
            {f.label}
          </ListBox.Item>
        ))}
      </FormSelectField>

      <Controller
        control={form.control}
        name="nextDueOn"
        render={({field, fieldState}) => (
          <DateInput
            errorMessage={fieldState.error?.message}
            isDisabled={isSubmitting}
            isRequired
            label="First check-in"
            min={today}
            onChange={(value) => {
              field.onChange(value ?? '');
              onChange();
            }}
            value={field.value}
          />
        )}
      />

      {errorMessage ? (
        <div
          className="rounded-panel border border-danger/20 bg-danger-soft p-3"
          role="alert"
        >
          <Typography
            className="text-danger-soft-foreground"
            type="body-sm"
          >
            {errorMessage}
          </Typography>
        </div>
      ) : null}

      <Button
        className="relative w-full"
        isDisabled={!form.formState.isValid || isSubmitting}
        isPending={isSubmitting}
        type="submit"
      >
        <span className={isSubmitting ? 'invisible' : undefined}>Start check-ins</span>
        {isSubmitting ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner
              color="current"
              size="sm"
            />
            <span className="sr-only">Adding schedule</span>
          </span>
        ) : null}
      </Button>
    </form>
  );
}
