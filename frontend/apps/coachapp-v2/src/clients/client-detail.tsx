import {formatIsoDateOnly} from '@easy/utils';
import {Alert, Avatar, Button, Chip, Separator, Spinner, TextArea, Typography, toast} from '@heroui/react';
import {ArrowLeft, MessageCircle, Pencil, Phone} from 'lucide-react';
import {useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetClientQuery, useUpdateClientMutation} from '@/api/clients';
import {
  type ClientTrainingPlan,
  type NutritionPlan,
  type TrainingPlan,
  useAssignNutritionPlanMutation,
  useAssignTrainingPlanMutation,
  useListCoachClientNutritionPlansQuery,
  useListCoachClientTrainingPlansQuery,
} from '@/api/generated';
import {toNullableText} from '@/api/shared';
import ClientNutritionAdherence from '@/clients/components/client-nutrition-adherence';
import ClientWorkoutHistory from '@/clients/components/client-workout-history';
import InvitationWidget from '@/clients/components/invitation-widget';
import {getWhatsAppUrl, PLAN_STATUS_MAP, STATUS_CHIP_COLOR, UNKNOWN_PLAN_STATUS} from '@/clients/lib/client';
import NutritionPlanPicker from '@/nutrition-plans/components/nutrition-plan-picker';
import TrainingPlanPicker from '@/training-plans/components/training-plan-picker';

function SectionHeading({title}: {title: string}) {
  return (
    <Typography
      className="mb-3"
      color="muted"
      type="body-xs"
      weight="semibold"
    >
      {title}
    </Typography>
  );
}

function ClientPlans({clientId}: {clientId: string}) {
  const [showNutritionPicker, setShowNutritionPicker] = useState(false);
  const [showTrainingPicker, setShowTrainingPicker] = useState(false);

  const [assignNutrition, {isLoading: isAssigningNutrition}] = useAssignNutritionPlanMutation();
  const [assignTraining, {isLoading: isAssigningTraining}] = useAssignTrainingPlanMutation();

  const {data: nutritionData, isLoading: isLoadingNutrition} = useListCoachClientNutritionPlansQuery({clientId});
  const {data: trainingData, isLoading: isLoadingTraining} = useListCoachClientTrainingPlansQuery({clientId});

  const nutritionPlans = nutritionData?.data ?? [];
  const trainingPlans = trainingData?.data ?? [];
  const isLoading = isLoadingNutrition || isLoadingTraining;
  const hasPlans = nutritionPlans.length > 0 || trainingPlans.length > 0;

  const handleAssignNutrition = async (plan: NutritionPlan) => {
    try {
      await assignNutrition({id: plan.id, nutritionPlanAssignRequest: {client_id: clientId}}).unwrap();
      toast.success(`"${plan.name}" assigned to client`);
      setShowNutritionPicker(false);
    } catch {
      toast.danger("Nutrition plan wasn't assigned");
    }
  };

  const handleAssignTraining = async (plan: TrainingPlan) => {
    try {
      await assignTraining({
        id: plan.id,
        trainingPlanAssignRequest: {client_id: clientId},
      }).unwrap();
      toast.success(`"${plan.name}" assigned to client`);
      setShowTrainingPicker(false);
    } catch {
      toast.danger("Training plan wasn't assigned");
    }
  };

  return (
    <section className="py-4">
      <Separator className="mb-4" />
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
                const mealCount = plan.meals?.length ?? 0;
                return (
                  <Link
                    className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:bg-surface-hover active:bg-surface-hover"
                    key={plan.id}
                    to={`/library/nutrition-plans/${plan.id}`}
                  >
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
                        Nutrition{mealCount > 0 ? ` · ${mealCount} meal${mealCount !== 1 ? 's' : ''}` : ''}
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
                return (
                  <Link
                    className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:bg-surface-hover active:bg-surface-hover"
                    key={plan.id}
                    to={`/library/training-plans/${plan.id}`}
                  >
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
                        Training
                        {workoutCount > 0 ? ` · ${workoutCount} workout${workoutCount !== 1 ? 's' : ''}` : ''}
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
            <Button
              className="text-muted"
              onPress={() => {
                setShowNutritionPicker((v) => !v);
                setShowTrainingPicker(false);
              }}
              size="sm"
              variant="ghost"
            >
              + Nutrition plan
            </Button>
            <Button
              className="text-muted"
              onPress={() => {
                setShowTrainingPicker((v) => !v);
                setShowNutritionPicker(false);
              }}
              size="sm"
              variant="ghost"
            >
              + Training plan
            </Button>
          </div>

          {showNutritionPicker ? (
            <div className="mt-2 rounded-xl border border-border bg-surface p-3">
              <Typography
                className="mb-2"
                color="muted"
                type="body-sm"
              >
                Search for a nutrition plan template to copy to this client
              </Typography>
              <NutritionPlanPicker
                autoFocus
                onSelect={handleAssignNutrition}
                placeholder="Search nutrition plans"
              />
              {isAssigningNutrition ? (
                <div className="mt-2 flex items-center gap-2">
                  <Spinner size="sm" />
                  <Typography
                    color="muted"
                    type="body-sm"
                  >
                    Assigning plan
                  </Typography>
                </div>
              ) : null}
            </div>
          ) : null}
          {showTrainingPicker ? (
            <div className="mt-2 rounded-xl border border-border bg-surface p-3">
              <Typography
                className="mb-2"
                color="muted"
                type="body-sm"
              >
                Search for a training plan template to copy to this client
              </Typography>
              <TrainingPlanPicker
                autoFocus
                onSelect={handleAssignTraining}
                placeholder="Search training plans"
              />
              {isAssigningTraining ? (
                <div className="mt-2 flex items-center gap-2">
                  <Spinner size="sm" />
                  <Typography
                    color="muted"
                    type="body-sm"
                  >
                    Assigning plan
                  </Typography>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
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
  const initials = (client.first_name?.[0] || '' + client.last_name?.[0] || '')?.toUpperCase();

  return (
    <Page>
      <Page.Header className="py-4 max-w-xl sm:py-8 items-center">
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

      <Page.Content className={'px-4 md:px-6 lg:px-8'}>
        <div className=" max-w-xl overflow-hidden">
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center gap-3">
              <Avatar
                className="size-12"
                color="accent"
              >
                <Avatar.Fallback className="text-base">{initials}</Avatar.Fallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <Typography
                  truncate
                  type="h5"
                >
                  {name}
                </Typography>
                {client.phone ? (
                  <Typography
                    color="muted"
                    truncate
                    type="body-sm"
                  >
                    {client.phone}
                  </Typography>
                ) : null}
              </div>
              <Chip
                color={statusColor}
                size="sm"
                variant="soft"
              >
                {client.status}
              </Chip>
            </div>

            {client.phone ? (
              <div className="mt-3 flex gap-2 border-t border-border pt-3">
                <a
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-success-50 px-3 py-2 text-sm font-medium text-success-700 transition-colors hover:bg-success-100 active:bg-success-200"
                  href={getWhatsAppUrl(client.phone)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </a>
                <a
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-default-soft active:bg-default-soft"
                  href={`tel:${client.phone}`}
                >
                  <Phone size={16} />
                  Call
                </a>
              </div>
            ) : null}
          </div>

          {client.status === 'pending' ? (
            <section className="py-4">
              <Separator className="mb-4" />
              <InvitationWidget
                client={client}
                onRevoked={() => navigate(ROUTES.CLIENTS, {replace: true})}
              />
            </section>
          ) : null}

          <ClientPlans clientId={client.id} />

          <section className="py-4">
            <Separator className="mb-4" />
            <SectionHeading title="Notes" />
            <InlineNotes
              clientId={client.id}
              initialNotes={client.notes}
            />
          </section>

          <ClientNutritionAdherence clientId={client.id} />

          <ClientWorkoutHistory clientId={client.id} />

          <section className="py-4">
            <Separator className="mb-4" />
            <Typography
              color="muted"
              type="body-sm"
            >
              Added {formatIsoDateOnly(client.inserted_at)}
            </Typography>
          </section>
        </div>
      </Page.Content>
    </Page>
  );
}
