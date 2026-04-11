import {Alert, Avatar, Button, Chip, Separator, Spinner, TextArea, toast} from '@heroui/react';
import {ArrowLeft, MessageCircle, Pencil, Phone} from 'lucide-react';
import {useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {type ClientStatus, useGetClientQuery, useUpdateClientMutation} from '@/api/clients';
import {
  type NutritionPlan,
  type NutritionPlanStatus,
  useAssignNutritionPlanMutation,
  useListClientNutritionPlansQuery,
} from '@/api/nutritionPlans';
import {
  type TrainingPlan,
  type TrainingPlanStatus,
  useAssignTrainingPlanMutation,
  useListClientTrainingPlansQuery,
} from '@/api/trainingPlans';
import ClientNutritionAdherence from '@/clients/components/client-nutrition-adherence';
import ClientWorkoutHistory from '@/clients/components/client-workout-history';
import NutritionPlanPicker from '@/nutrition-plans/components/nutrition-plan-picker';
import TrainingPlanPicker from '@/training-plans/components/training-plan-picker';

// ── Helpers ──────────────────────────────────────────────────

const STATUS_CHIP_COLOR: Record<ClientStatus, 'default' | 'success'> = {
  active: 'success',
  pending: 'default',
  inactive: 'default',
  archived: 'default',
};

type PlanStatus = NutritionPlanStatus | TrainingPlanStatus;

const PLAN_STATUS_MAP: Record<PlanStatus, {color: 'default' | 'success' | 'warning'; label: string}> = {
  active: {color: 'success', label: 'Active'},
  archived: {color: 'warning', label: 'Archived'},
};

// Fallback for statuses the backend might return that we don't recognize (e.g. legacy `draft` rows
// that escaped migration). Keeps the UI resilient instead of crashing on undefined lookups.
const UNKNOWN_PLAN_STATUS = {color: 'default' as const, label: 'Unknown'};

function getInitials(firstName: null | string, lastName: null | string): string {
  const first = firstName?.charAt(0)?.toUpperCase() ?? '';
  const last = lastName?.charAt(0)?.toUpperCase() ?? '';
  return first + last || '?';
}

function getFullName(firstName: null | string, lastName: null | string): string {
  return [firstName, lastName].filter(Boolean).join(' ') || 'No name';
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getWhatsAppUrl(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}`;
}

// ── Section heading ──────────────────────────────────────────

function SectionHeading({title}: {title: string}) {
  return <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-400">{title}</h3>;
}

// ── Client Plans (unified) ───────────────────────────────────

function ClientPlans({clientId}: {clientId: string}) {
  const [showNutritionPicker, setShowNutritionPicker] = useState(false);
  const [showTrainingPicker, setShowTrainingPicker] = useState(false);

  const [assignNutrition, {isLoading: isAssigningNutrition}] = useAssignNutritionPlanMutation();
  const [assignTraining, {isLoading: isAssigningTraining}] = useAssignTrainingPlanMutation();

  const {data: nutritionData, isLoading: isLoadingNutrition} = useListClientNutritionPlansQuery({clientId});
  const {data: trainingData, isLoading: isLoadingTraining} = useListClientTrainingPlansQuery({clientId});

  const nutritionPlans = nutritionData?.data ?? [];
  const trainingPlans = trainingData?.data ?? [];
  const isLoading = isLoadingNutrition || isLoadingTraining;
  const hasPlans = nutritionPlans.length > 0 || trainingPlans.length > 0;

  const handleAssignNutrition = async (plan: NutritionPlan) => {
    try {
      await assignNutrition({id: plan.id, body: {client_id: clientId}}).unwrap();
      toast.success(`"${plan.name}" assigned to client`);
      setShowNutritionPicker(false);
    } catch {
      toast.danger('Failed to assign nutrition plan.');
    }
  };

  const handleAssignTraining = async (plan: TrainingPlan) => {
    try {
      await assignTraining({id: plan.id, body: {client_id: clientId}}).unwrap();
      toast.success(`"${plan.name}" assigned to client`);
      setShowTrainingPicker(false);
    } catch {
      toast.danger('Failed to assign training plan.');
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
          {/* Plan cards */}
          {hasPlans ? (
            <div className="flex flex-col gap-2">
              {nutritionPlans.map((plan: NutritionPlan) => {
                const planStatus = PLAN_STATUS_MAP[plan.status] ?? UNKNOWN_PLAN_STATUS;
                const mealCount = plan.meals?.length ?? 0;
                return (
                  <Link
                    className="flex min-h-11 items-center gap-3 rounded-xl border border-divider bg-content1 p-3 transition-colors hover:bg-content2 active:bg-content2"
                    key={plan.id}
                    to={`/library/nutrition-plans/${plan.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{plan.name}</p>
                      <p className="text-xs text-foreground-500">
                        Nutrition{mealCount > 0 ? ` \u00B7 ${mealCount} meal${mealCount !== 1 ? 's' : ''}` : ''}
                      </p>
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
              {trainingPlans.map((plan: TrainingPlan) => {
                const planStatus = PLAN_STATUS_MAP[plan.status] ?? UNKNOWN_PLAN_STATUS;
                // Guard against list endpoint not preloading workouts (same pattern as nutrition).
                const workoutCount = plan.planned_workouts?.length ?? 0;
                return (
                  <Link
                    className="flex min-h-11 items-center gap-3 rounded-xl border border-divider bg-content1 p-3 transition-colors hover:bg-content2 active:bg-content2"
                    key={plan.id}
                    to={`/library/training-plans/${plan.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{plan.name}</p>
                      <p className="text-xs text-foreground-500">
                        Training
                        {workoutCount > 0 ? ` \u00B7 ${workoutCount} workout${workoutCount !== 1 ? 's' : ''}` : ''}
                      </p>
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
            <p className="text-sm text-foreground-400">No plans assigned yet.</p>
          )}

          {/* Assign buttons */}
          <div className="mt-2 flex gap-2">
            <Button
              className="text-foreground-500"
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
              className="text-foreground-500"
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

          {/* Inline pickers */}
          {showNutritionPicker ? (
            <div className="mt-2 rounded-xl border border-divider bg-content1 p-3">
              <p className="mb-2 text-sm text-foreground-500">
                Search for a nutrition plan template to copy to this client.
              </p>
              <NutritionPlanPicker
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                onSelect={handleAssignNutrition}
                placeholder="Search nutrition plans..."
              />
              {isAssigningNutrition ? (
                <div className="mt-2 flex items-center gap-2 text-sm text-foreground-400">
                  <Spinner size="sm" />
                  Assigning plan...
                </div>
              ) : null}
            </div>
          ) : null}
          {showTrainingPicker ? (
            <div className="mt-2 rounded-xl border border-divider bg-content1 p-3">
              <p className="mb-2 text-sm text-foreground-500">
                Search for a training plan template to copy to this client.
              </p>
              <TrainingPlanPicker
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                onSelect={handleAssignTraining}
                placeholder="Search training plans..."
              />
              {isAssigningTraining ? (
                <div className="mt-2 flex items-center gap-2 text-sm text-foreground-400">
                  <Spinner size="sm" />
                  Assigning plan...
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

// ── Inline Notes ─────────────────────────────────────────────

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
      await updateClient({id: clientId, body: {notes: draft || null}}).unwrap();
      setIsEditing(false);
    } catch {
      toast.danger('Failed to save notes.');
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2">
        <TextArea
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add notes about this client..."
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
      className="-mx-2 cursor-pointer rounded-lg p-2 transition-colors hover:bg-content2 active:bg-content2"
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
        <p className="whitespace-pre-wrap text-sm">{initialNotes}</p>
      ) : (
        <p className="text-sm text-foreground-400">Tap to add notes...</p>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────

export default function ClientDetail() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.CLIENTS);
  const {data, isError, isLoading} = useGetClientQuery(id!);

  if (isLoading) {
    return (
      <PageLayout title="Client">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  if (isError || !data) {
    return (
      <PageLayout title="Client">
        <div className="mb-4">
          <Button
            onPress={goBack}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
        </div>
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Failed to load client</Alert.Title>
            <Alert.Description>They may not exist or you don&apos;t have access.</Alert.Description>
          </Alert.Content>
        </Alert>
      </PageLayout>
    );
  }

  const client = data.data;
  const fullName = getFullName(client.first_name, client.last_name);
  const initials = getInitials(client.first_name, client.last_name);
  const statusColor = STATUS_CHIP_COLOR[client.status] ?? 'default';

  return (
    <PageLayout title="Client">
      {/* ── Header bar ──────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Back
        </Button>
        <Button
          onPress={() => navigate(`/clients/${client.id}/edit`)}
          size="sm"
          variant="secondary"
        >
          <Pencil size={16} />
          Edit
        </Button>
      </div>

      <div className="max-w-lg">
        {/* ── Hero card ──────────────────────────────────── */}
        <div className="rounded-xl border border-divider bg-content1 p-4">
          {/* Identity row */}
          <div className="flex items-center gap-3">
            <Avatar
              className="size-12"
              color="accent"
            >
              <Avatar.Fallback className="text-base">{initials}</Avatar.Fallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold">{fullName}</h2>
              {client.phone ? <p className="truncate text-sm text-foreground-500">{client.phone}</p> : null}
            </div>
            <Chip
              color={statusColor}
              size="sm"
              variant="soft"
            >
              {client.status}
            </Chip>
          </div>

          {/* Action buttons — WhatsApp + Call when phone exists */}
          {client.phone ? (
            <div className="mt-3 flex gap-2 border-t border-divider pt-3">
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
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-divider px-3 py-2 text-sm font-medium transition-colors hover:bg-default-100 active:bg-default-200"
                href={`tel:${client.phone}`}
              >
                <Phone size={16} />
                Call
              </a>
            </div>
          ) : null}
        </div>

        {/* ── Plans (nutrition + training) ────────────── */}
        <ClientPlans clientId={client.id} />

        {/* ── Notes section (inline-editable) ────────────── */}
        <section className="py-4">
          <Separator className="mb-4" />
          <SectionHeading title="Notes" />
          <InlineNotes
            clientId={client.id}
            initialNotes={client.notes}
          />
        </section>

        {/* ── Nutrition Adherence ────────────────────────── */}
        <ClientNutritionAdherence clientId={client.id} />

        {/* ── Workout History ───────────────────────────── */}
        <ClientWorkoutHistory clientId={client.id} />

        {/* ── Meta ──────────────────────────────────────── */}
        <section className="py-4">
          <Separator className="mb-4" />
          <p className="text-sm text-foreground-400">Added {formatDate(client.inserted_at)}</p>
        </section>
      </div>
    </PageLayout>
  );
}
