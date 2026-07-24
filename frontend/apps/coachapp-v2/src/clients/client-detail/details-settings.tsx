/**
 * CD/DT — Details & settings (spec §7; design data-ref CD-DT-*). The single
 * editable surface for a client (2026-07-22 ruling): identity + trainer +
 * subscription dates as an embedded form; Status via the account-action
 * buttons; Stage and Client-since as read-only rows. No separate edit page,
 * no Coach card (the trainer select owns reassignment).
 * Style fidelity: design-handoff/manifests/CD-DT.json.
 */
import {AlertDialog, Button, Typography, toast} from '@heroui/react';
import {AlarmClock, AlertTriangle, ArrowLeft, ChevronRight, ClipboardList} from 'lucide-react';
import {useState} from 'react';
import {Controller} from 'react-hook-form';
import {Link, useParams} from 'react-router-dom';
import DateInput from '@/@components/date-input';
import {ErrorState} from '@/@components/error-state';
import {FieldRow, FormLayout, FormTextField} from '@/@components/form-fields';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetClientQuery, useUpdateClientMutation} from '@/api/clients';
import type {Client} from '@/api/generated';
import {useListClientFormAssignmentsForCoachQuery} from '@/api/generated';
import {applyFormErrors, getApiErrorMessage} from '@/api/shared';
import {useReassignClientMutation} from '@/api/team';
import {formatShortDate} from '@/clients/client-detail/data';
import {InviteCard} from '@/clients/client-detail/pending-body';
import {ACCENT_BUTTON, CARD, EYEBROW} from '@/clients/client-detail/ui';
import {
  clientToEditFormValues,
  EDIT_CLIENT_FORM_FIELDS,
  type EditClientFormValues,
  editClientToUpdateRequest,
  TrainerSelectField,
  useEditClientForm,
} from '@/clients/client-form/edit-client-form';

const ROW = 'flex items-center justify-between py-2';
const ROW_LABEL = 'text-eyebrow text-muted sm:text-eyebrow';
const ROW_VALUE = 'text-eyebrow font-semibold sm:text-eyebrow';
const EXTEND_BTN =
  'h-7.5 min-w-0 shrink-0 rounded-control border border-border bg-surface px-2.75 font-btn text-eyebrow font-bold leading-none [box-shadow:none] [color:black] [column-gap:normal] [row-gap:normal] sm:h-8 sm:px-3.25 sm:text-eyebrow';

function SubscriptionAlert({client, onExtend}: {client: Client; onExtend: () => void}) {
  const expired = client.status === 'inactive' && client.inactive_reason === 'subscription_expired';
  const expiring = !expired && client.expiring_soon;
  if (!expired && !expiring) {
    return null;
  }
  const firstName = client.first_name ?? 'This client';

  return (
    <div
      className={`mt-2 flex items-center gap-2.25 rounded-control px-3 py-2.5 sm:mt-2.5 sm:gap-2.5 sm:px-3.25 sm:py-2.75 ${
        expired ? 'bg-danger-soft' : 'bg-warning-soft'
      }`}
      data-testid="dt-alert"
    >
      {expired ? (
        <AlertTriangle className="size-3.75 flex-none text-danger-soft-foreground sm:size-4" />
      ) : (
        <AlarmClock className="size-3.75 flex-none text-warning-soft-foreground sm:size-4" />
      )}
      <div
        className={`min-w-0 flex-1 text-eyebrow font-semibold sm:text-eyebrow ${
          expired ? 'text-danger-soft-foreground' : 'text-warning-soft-foreground'
        }`}
        data-testid="dt-alert-text"
      >
        {expired
          ? `Subscription ended${client.subscription_ends_on ? ` ${formatShortDate(client.subscription_ends_on)}` : ''}. ${firstName} is locked out of the app.`
          : `Subscription ends ${client.subscription_ends_on ? formatShortDate(client.subscription_ends_on) : 'within 7 days'}.`}
      </div>
      <Button
        className={EXTEND_BTN}
        data-testid="dt-alert-btn"
        onPress={onExtend}
      >
        Extend
      </Button>
    </div>
  );
}

function IntakeRow({clientId}: {clientId: string}) {
  const {data: assignments} = useListClientFormAssignmentsForCoachQuery({clientId});
  const intake = (assignments?.data ?? []).find((assignment) => assignment.purpose === 'intake');
  if (!intake) {
    return null;
  }
  const submitted = intake.latest_submission;

  return (
    <Link
      className="flex items-center gap-3.5 rounded-panel border border-border bg-surface px-3.75 py-3.5 sm:px-4.5 sm:py-3.75"
      data-testid="dt-intake"
      to={ROUTES.CLIENT_INTAKE.replace(':id', clientId)}
    >
      <span
        className="flex size-9 flex-none items-center justify-center rounded-control bg-background text-muted sm:size-9.5 sm:rounded-control"
        data-testid="dt-intake-icon"
      >
        <ClipboardList className="size-4.25 sm:size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div
          className="text-eyebrow font-bold sm:text-body"
          data-testid="dt-intake-title"
        >
          Intake responses
        </div>
        <div
          className="mt-0.25 text-eyebrow text-muted sm:mt-0.5 sm:text-eyebrow"
          data-testid="dt-intake-sub"
        >
          {submitted ? `Submitted ${formatShortDate(submitted.submitted_at)}` : 'Not submitted yet'}
        </div>
      </div>
      <ChevronRight className="size-4 text-muted" />
    </Link>
  );
}

export default function DetailsSettings() {
  const {id} = useParams<{id: string}>();
  const goBack = useGoBack(ROUTES.CLIENT_DETAIL.replace(':id', id!));
  const [isDeactivateOpen, setDeactivateOpen] = useState(false);
  const {data, isError, isLoading, refetch} = useGetClientQuery(id!);
  const [updateClient, {isLoading: isSaving}] = useUpdateClientMutation();
  const [reassignClient] = useReassignClientMutation();

  const client = data?.data;
  const form = useEditClientForm({values: client ? clientToEditFormValues(client) : undefined});

  if (isLoading) {
    return (
      <Page className="bg-background">
        <Page.Content bare>
          <Page.Frame className="pt-4 pb-6">
            <PageSkeleton />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }
  if (isError || !client) {
    return (
      <Page className="bg-background">
        <Page.Content bare>
          <Page.Frame className="pt-4 pb-6">
            <ErrorState
              message="This client couldn't load. They may not exist, or you may not have access."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const name = [client.first_name, client.last_name].filter(Boolean).join(' ') || client.email || 'Client';
  const firstName = client.first_name ?? 'This client';
  const initialTrainerId = client.assigned_coach_id ?? undefined;

  const onSubmit = async (values: EditClientFormValues) => {
    try {
      await updateClient({body: editClientToUpdateRequest(values), id: client.id}).unwrap();
      if (values.assigned_trainer_id && values.assigned_trainer_id !== initialTrainerId) {
        try {
          await reassignClient({body: {coach_id: values.assigned_trainer_id}, clientId: client.id}).unwrap();
          toast.success('Coach updated');
        } catch (reassignErr) {
          toast.danger(getApiErrorMessage(reassignErr, 'Client was saved, but reassigning the trainer failed.'));
        }
      }
      toast.success('Client saved');
    } catch (err) {
      applyFormErrors(
        err,
        "Client wasn't updated. Check the details and try again",
        form.setError,
        EDIT_CLIENT_FORM_FIELDS,
      );
    }
  };

  const setStatus = async (status: 'active' | 'inactive', successMessage: string) => {
    try {
      await updateClient({body: {status}, id: client.id}).unwrap();
      setDeactivateOpen(false);
      toast.success(successMessage);
    } catch (err) {
      toast.danger(getApiErrorMessage(err, "Status wasn't changed"));
    }
  };

  const focusEndDate = () => {
    document.querySelector<HTMLElement>('[data-testid=dt-subcard] input')?.focus();
  };

  return (
    <Page className="bg-background text-foreground [line-height:normal]">
      <Page.Content
        bare
        className="p-0"
      >
        {/* ── sub-screen header ───────────────────────────────────────── */}
        <div className="flex items-center gap-2.75 border-b border-border bg-surface px-4 pt-0.5 pb-3.25 sm:gap-3.5 sm:px-7.5 sm:py-4.5">
          <Button
            aria-label="Back"
            className="size-8.5 min-h-0 min-w-0 rounded-panel border border-border bg-surface px-1.5 py-px text-foreground [box-shadow:none] [column-gap:normal] [row-gap:normal] font-normal leading-[normal] sm:size-9.5"
            data-testid="dt-back"
            isIconOnly
            onPress={goBack}
            variant="ghost"
          >
            <ArrowLeft className="size-4 sm:size-4.25" />
          </Button>
          <div className="min-w-0 flex-1">
            <div
              className="font-grotesk text-body font-semibold sm:text-heading"
              data-testid="dt-title"
            >
              Details &amp; settings
            </div>
            <div
              className="text-eyebrow text-muted sm:mt-0.5 sm:text-eyebrow"
              data-testid="dt-subtitle"
            >
              {name}
            </div>
          </div>
        </div>

        {/* ── body ────────────────────────────────────────────────────── */}
        <div className="p-3.5 sm:px-7.5 sm:pt-6 sm:pb-7.5">
          <div
            className="flex flex-col gap-3 sm:max-w-180 sm:gap-4"
            data-testid="dt-root"
          >
            {client.status === 'pending' ? <InviteCard client={client} /> : null}

            <FormLayout
              className="contents"
              onSubmit={(e) => {
                form.clearErrors();
                return form.handleSubmit(onSubmit)(e);
              }}
              validationBehavior="aria"
            >
              <div
                className={`${CARD} px-3.75 py-3.5 sm:px-4.5 sm:py-4`}
                data-testid="dt-profile"
              >
                <div
                  className={`${EYEBROW} mb-1 sm:mb-1.5`}
                  data-testid="dt-profile-eyebrow"
                >
                  Profile
                </div>
                <div className="flex flex-col gap-3.5">
                  <FieldRow>
                    <FormTextField
                      control={form.control}
                      fullWidth
                      label="First name"
                      name="first_name"
                    />
                    <FormTextField
                      control={form.control}
                      fullWidth
                      label="Last name"
                      name="last_name"
                    />
                  </FieldRow>
                  <FieldRow>
                    <FormTextField
                      control={form.control}
                      fullWidth
                      inputProps={{type: 'tel'}}
                      label="Phone"
                      name="phone"
                      type="tel"
                    />
                    <FormTextField
                      control={form.control}
                      fullWidth
                      inputProps={{type: 'email'}}
                      label="Email"
                      name="email"
                      type="email"
                    />
                  </FieldRow>
                  <TrainerSelectField control={form.control} />
                </div>
                <div className="mt-3.5">
                  {client.goal_weight_value != null ? (
                    <div className={`${ROW} border-b border-border`}>
                      <span className={ROW_LABEL}>Goal weight</span>
                      <span className={ROW_VALUE}>
                        {Number(client.goal_weight_value)} {client.goal_weight_unit ?? 'kg'}
                      </span>
                    </div>
                  ) : null}
                  <div className={`${ROW} border-b border-border`}>
                    <span className={ROW_LABEL}>Stage</span>
                    <span className={ROW_VALUE}>{client.stage === 'onboarding' ? 'Onboarding' : 'Coaching'}</span>
                  </div>
                  <div className={ROW}>
                    <span
                      className={ROW_LABEL}
                      data-testid="dt-row-label"
                    >
                      Client since
                    </span>
                    <span
                      className={ROW_VALUE}
                      data-testid="dt-row-value"
                    >
                      {formatShortDate(client.inserted_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={`${CARD} px-3.75 py-3.5 sm:px-4.5 sm:py-4`}
                data-testid="dt-subcard"
              >
                <div
                  className={`${EYEBROW} mb-1 sm:mb-1.5`}
                  data-testid="dt-sub-eyebrow"
                >
                  Subscription
                </div>
                <FieldRow>
                  <Controller
                    control={form.control}
                    name="subscription_started_on"
                    render={({field, fieldState}) => (
                      <div className="w-full">
                        <DateInput
                          label="Subscription start"
                          onChange={(iso) => field.onChange(iso ?? '')}
                          value={field.value || null}
                        />
                        {fieldState.error ? (
                          <Typography
                            className="mt-1 text-danger"
                            type="body-xs"
                          >
                            {fieldState.error.message}
                          </Typography>
                        ) : null}
                      </div>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="subscription_ends_on"
                    render={({field, fieldState}) => (
                      <div className="w-full">
                        <DateInput
                          label="Subscription end"
                          onChange={(iso) => field.onChange(iso ?? '')}
                          value={field.value || null}
                        />
                        {fieldState.error ? (
                          <Typography
                            className="mt-1 text-danger"
                            type="body-xs"
                          >
                            {fieldState.error.message}
                          </Typography>
                        ) : null}
                      </div>
                    )}
                  />
                </FieldRow>
                <SubscriptionAlert
                  client={client}
                  onExtend={focusEndDate}
                />
                <div
                  className="mt-2.5 text-eyebrow text-muted"
                  data-testid="dt-caption"
                >
                  Billing is per seat — manage seats in{' '}
                  <Link
                    className="text-accent"
                    data-testid="dt-billing-link"
                    to={ROUTES.SETTINGS}
                  >
                    Billing
                  </Link>
                  .
                </div>
              </div>

              <div className="flex justify-end gap-2.5">
                <Button
                  className="h-10 min-w-0 shrink-0 rounded-control border border-border bg-surface px-3.75 font-btn text-eyebrow font-bold leading-none text-foreground [box-shadow:none] [column-gap:normal] [row-gap:normal]"
                  onPress={() => form.reset(clientToEditFormValues(client))}
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button
                  className={`${ACCENT_BUTTON} h-10 px-4`}
                  isPending={isSaving}
                  type="submit"
                >
                  Save changes
                </Button>
              </div>
            </FormLayout>

            <IntakeRow clientId={client.id} />

            {client.status === 'active' ? (
              <div>
                <Button
                  className="h-10.5 min-w-0 w-full shrink-0 rounded-control border border-danger-soft bg-transparent px-1.5 py-px font-btn text-eyebrow font-bold leading-none text-danger-soft-foreground [box-shadow:none] [column-gap:normal] [row-gap:normal] sm:h-10 sm:w-auto sm:px-4 sm:py-0"
                  data-testid="dt-deactivate"
                  onPress={() => setDeactivateOpen(true)}
                  variant="ghost"
                >
                  Deactivate client
                </Button>
              </div>
            ) : null}
            {client.status === 'inactive' ? (
              <div>
                <Button
                  className={`${ACCENT_BUTTON} h-10.5 w-full px-3.75 sm:h-10 sm:w-auto`}
                  data-testid="dt-reactivate"
                  onPress={() => setStatus('active', `${firstName} is active again.`)}
                >
                  Reactivate client
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </Page.Content>

      <AlertDialog.Backdrop
        isOpen={isDeactivateOpen}
        onOpenChange={setDeactivateOpen}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-100">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Deactivate {firstName}?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <Typography>They lose app access. Their history stays and you can reactivate anytime.</Typography>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                onPress={() => setDeactivateOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                isPending={isSaving}
                onPress={() => setStatus('inactive', 'Client deactivated')}
                variant="danger"
              >
                Deactivate
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </Page>
  );
}
