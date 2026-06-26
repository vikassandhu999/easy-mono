import {formatIsoDateOnly} from '@easy/utils';
import {Alert, Avatar, Button, Chip, Spinner, TextArea, Typography, toast} from '@heroui/react';
import {ArrowLeft, Dumbbell, MessageCircle, Pencil, Phone, Utensils} from 'lucide-react';
import {useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetClientQuery, useUpdateClientMutation} from '@/api/clients';
import {
  type ClientTrainingPlan,
  type NutritionPlan,
  useListCoachClientNutritionPlansQuery,
  useListCoachClientTrainingPlansQuery,
} from '@/api/generated';
import {toNullableText} from '@/api/shared';
import ClientNutritionAdherence from '@/clients/components/client-nutrition-adherence';
import ClientStatStrip from '@/clients/components/client-stat-strip';
import ClientWorkoutHistory from '@/clients/components/client-workout-history';
import InvitationWidget from '@/clients/components/invitation-widget';
import PlanAssignControl from '@/clients/components/plan-assign-control';
import {getWhatsAppUrl, PLAN_STATUS_MAP, STATUS_CHIP_COLOR, UNKNOWN_PLAN_STATUS} from '@/clients/lib/client';

function SectionHeading({title}: {title: string}) {
  return (
    <Typography
      className="mb-3 uppercase tracking-wider"
      color="muted"
      type="body-xs"
      weight="semibold"
    >
      {title}
    </Typography>
  );
}

/** Compact assigned-plan window: "Jun 26 – Aug 21, 2026" (drops the repeated
 *  year), "From …" / "Until …" for open-ended, or null when unscheduled. */
function formatPlanSchedule(start: string | null, end: string | null): string | null {
  if (start && end) {
    const startLabel = formatIsoDateOnly(start);
    const endLabel = formatIsoDateOnly(end);
    return start.slice(0, 4) === end.slice(0, 4)
      ? `${startLabel.replace(/, \d{4}$/, '')} – ${endLabel}`
      : `${startLabel} – ${endLabel}`;
  }
  if (start) {
    return `From ${formatIsoDateOnly(start)}`;
  }
  if (end) {
    return `Until ${formatIsoDateOnly(end)}`;
  }
  return null;
}

function ClientPlans({clientId, clientName}: {clientId: string; clientName: string}) {
  const {data: nutritionData, isLoading: isLoadingNutrition} = useListCoachClientNutritionPlansQuery({clientId});
  const {data: trainingData, isLoading: isLoadingTraining} = useListCoachClientTrainingPlansQuery({clientId});

  const nutritionPlans = nutritionData?.data ?? [];
  const trainingPlans = trainingData?.data ?? [];
  const isLoading = isLoadingNutrition || isLoadingTraining;
  const hasPlans = nutritionPlans.length > 0 || trainingPlans.length > 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <SectionHeading title="Plans" />

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : (
        <>
          {hasPlans ? (
            <div className="flex flex-col gap-2">
              {nutritionPlans.map((plan: NutritionPlan) => {
                const planStatus = PLAN_STATUS_MAP[plan.status] ?? UNKNOWN_PLAN_STATUS;
                const schedule = formatPlanSchedule(plan.start_date, plan.end_date);
                return (
                  <Link
                    className="flex min-h-11 items-center gap-3 rounded-xl bg-surface-secondary p-3 transition-colors hover:bg-surface-hover active:bg-surface-hover"
                    key={plan.id}
                    to={`/library/nutrition-plans/${plan.id}`}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-success/10 text-success">
                      <Utensils size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Typography
                        truncate
                        type="body-sm"
                        weight="semibold"
                      >
                        {plan.name}
                      </Typography>
                      <Typography
                        color="muted"
                        type="body-xs"
                      >
                        Nutrition{schedule ? ` · ${schedule}` : ''}
                      </Typography>
                    </div>
                    <Chip
                      color={planStatus.color}
                      size="sm"
                      variant="soft"
                    >
                      {planStatus.label}
                    </Chip>
                  </Link>
                );
              })}
              {trainingPlans.map((plan: ClientTrainingPlan) => {
                const planStatus = PLAN_STATUS_MAP[plan.status] ?? UNKNOWN_PLAN_STATUS;
                const workoutCount = plan.workouts.length;
                const schedule = formatPlanSchedule(plan.start_date, plan.end_date);
                return (
                  <Link
                    className="flex min-h-11 items-center gap-3 rounded-xl bg-surface-secondary p-3 transition-colors hover:bg-surface-hover active:bg-surface-hover"
                    key={plan.id}
                    to={`/library/training-plans/${plan.id}`}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                      <Dumbbell size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Typography
                        truncate
                        type="body-sm"
                        weight="semibold"
                      >
                        {plan.name}
                      </Typography>
                      <Typography
                        color="muted"
                        type="body-xs"
                      >
                        Training{workoutCount > 0 ? ` · ${workoutCount} workout${workoutCount !== 1 ? 's' : ''}` : ''}
                        {schedule ? ` · ${schedule}` : ''}
                      </Typography>
                    </div>
                    <Chip
                      color={planStatus.color}
                      size="sm"
                      variant="soft"
                    >
                      {planStatus.label}
                    </Chip>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Typography
              color="muted"
              type="body-sm"
            >
              No plans assigned yet
            </Typography>
          )}

          <div className="mt-2 flex gap-2">
            <PlanAssignControl
              clientId={clientId}
              clientName={clientName}
              kind="nutrition"
              label="+ Nutrition plan"
            />
            <PlanAssignControl
              clientId={clientId}
              clientName={clientName}
              kind="training"
              label="+ Training plan"
            />
          </div>
        </>
      )}
    </div>
  );
}

function InlineNotes({clientId, initialNotes}: {clientId: string; initialNotes: null | string}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [updateClient] = useUpdateClientMutation();

  const startEditing = () => {
    setDraft(initialNotes ?? '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateClient({id: clientId, body: {notes: toNullableText(draft)}}).unwrap();
      setIsEditing(false);
    } catch {
      toast.danger("Notes weren't saved");
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2">
        <TextArea
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add notes about this client"
          ref={(el) => el?.focus()}
          rows={3}
          value={draft}
        />
        <div className="flex justify-end gap-2">
          <Button
            onPress={() => setIsEditing(false)}
            size="sm"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            onPress={handleSave}
            size="sm"
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="-mx-2 cursor-pointer rounded-lg p-2 transition-colors hover:bg-surface-hover active:bg-surface-hover"
      onClick={startEditing}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startEditing();
        }
      }}
      role="button"
      tabIndex={0}
    >
      {initialNotes ? (
        <Typography
          className="whitespace-pre-wrap"
          type="body-sm"
        >
          {initialNotes}
        </Typography>
      ) : (
        <Typography
          color="muted"
          type="body-sm"
        >
          Tap to add notes
        </Typography>
      )}
    </div>
  );
}

export default function ClientDetail() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.CLIENTS);
  const {data, isError, isLoading} = useGetClientQuery(id!);

  if (isLoading) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Client</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <Spinner color="accent" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Client</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Toolbar>
          <Button
            onPress={goBack}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Clients
          </Button>
        </Page.Toolbar>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Client couldn&apos;t load</Alert.Title>
              <Alert.Description>They may not exist, or you may not have access</Alert.Description>
            </Alert.Content>
          </Alert>
        </Page.Content>
      </Page>
    );
  }

  const client = data.data;
  const statusColor = STATUS_CHIP_COLOR[client.status] ?? 'default';

  const name = [client.first_name, client.last_name].filter(Boolean).join(' ');
  const initials = `${client.first_name?.[0] ?? ''}${client.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <Page>
      <Page.Header className="py-4 sm:py-8 items-center w-full max-w-6xl">
        <Page.TitleGroup>
          <div className={'flex items-center gap-1'}>
            <Button
              onPress={goBack}
              size="md"
              variant="ghost"
              isIconOnly
            >
              <ArrowLeft size={20} />
            </Button>
            <Page.Title>{name}</Page.Title>
          </div>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            onPress={() => navigate(`/clients/${client.id}/edit`)}
            size="sm"
            variant="secondary"
          >
            <Pencil size={16} />
            Edit
          </Button>
        </Page.Actions>
      </Page.Header>

      <Page.Content className={'px-4 pb-6 md:px-6 lg:px-8'}>
        <div className="max-w-6xl space-y-4">
          {/* Hero — flat profile card */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  className="size-14 shrink-0"
                  color="accent"
                >
                  <Avatar.Fallback className="text-base">{initials}</Avatar.Fallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Typography
                      truncate
                      type="h5"
                    >
                      {name}
                    </Typography>
                    <Chip
                      color={statusColor}
                      size="sm"
                      variant="soft"
                    >
                      {client.status}
                    </Chip>
                  </div>
                  {client.phone ? (
                    <Typography
                      className="mt-0.5 flex items-center gap-1.5"
                      color="muted"
                      truncate
                      type="body-sm"
                    >
                      <Phone size={14} />
                      {client.phone}
                    </Typography>
                  ) : null}
                </div>
              </div>
              {client.phone ? (
                <div className="flex gap-2 sm:ml-auto sm:shrink-0">
                  <a
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-success/10 px-4 py-2 text-sm font-medium text-success transition-colors hover:bg-success/20 active:bg-success/20 sm:flex-none"
                    href={getWhatsAppUrl(client.phone)}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <MessageCircle size={16} />
                    WhatsApp
                  </a>
                  <a
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-default-soft active:bg-default-soft sm:flex-none"
                    href={`tel:${client.phone}`}
                  >
                    <Phone size={16} />
                    Call
                  </a>
                </div>
              ) : null}
            </div>
          </div>

          {client.status === 'pending' ? (
            <InvitationWidget
              client={client}
              onRevoked={() => navigate(ROUTES.CLIENTS, {replace: true})}
            />
          ) : (
            <ClientStatStrip clientId={client.id} />
          )}

          <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
            <div className="space-y-4 lg:col-span-2">
              <ClientPlans
                clientId={client.id}
                clientName={name}
              />
              <ClientNutritionAdherence clientId={client.id} />
            </div>
            <div className="space-y-4">
              <ClientWorkoutHistory clientId={client.id} />
              <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
                <SectionHeading title="Notes" />
                <InlineNotes
                  clientId={client.id}
                  initialNotes={client.notes}
                />
              </div>
              <Typography
                className="px-1"
                color="muted"
                type="body-xs"
              >
                Added {formatIsoDateOnly(client.inserted_at)}
              </Typography>
            </div>
          </div>
        </div>
      </Page.Content>
    </Page>
  );
}
