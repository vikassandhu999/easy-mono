import {Alert, AlertDialog, Avatar, Button, Chip, Separator, Spinner, TextArea, toast} from '@heroui/react';
import {Archive, ArrowLeft, Check, MessageCircle, Pencil, Phone, RefreshCw} from 'lucide-react';
import {useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {
  type Client,
  type ClientStatus,
  type PaymentStatus,
  useGetClientQuery,
  useUpdateClientMutation,
} from '@/api/clients';
import {type NutritionPlan, useAssignNutritionPlanMutation, useListNutritionPlansQuery} from '@/api/nutritionPlans';
import {type TrainingPlan, useAssignTrainingPlanMutation, useListTrainingPlansQuery} from '@/api/trainingPlans';
import ClientNutritionAdherence from '@/clients/components/client-nutrition-adherence';
import ClientWorkoutHistory from '@/clients/components/client-workout-history';
import NutritionPlanPicker from '@/nutrition-plans/components/nutrition-plan-picker';
import TrainingPlanPicker from '@/training-plans/components/training-plan-picker';

// ── Helpers ──────────────────────────────────────────────────

const STATUS_CHIP_COLOR: Record<ClientStatus, 'danger' | 'default' | 'success' | 'warning'> = {
  active: 'success',
  expiring: 'warning',
  expired: 'danger',
  pending: 'default',
  inactive: 'default',
  archived: 'default',
};

const PAYMENT_CHIP_COLOR: Record<PaymentStatus, 'success' | 'warning'> = {
  paid: 'success',
  free: 'success',
  pending: 'warning',
  partial: 'warning',
};

const PLAN_STATUS_MAP: Record<string, {color: 'danger' | 'default' | 'success' | 'warning'; label: string}> = {
  active: {color: 'success', label: 'Active'},
  draft: {color: 'default', label: 'Draft'},
  archived: {color: 'warning', label: 'Archived'},
};

function getInitials(firstName: null | string, lastName: null | string): string {
  const first = firstName?.charAt(0)?.toUpperCase() ?? '';
  const last = lastName?.charAt(0)?.toUpperCase() ?? '';
  return first + last || '?';
}

function getFullName(firstName: null | string, lastName: null | string): string {
  return [firstName, lastName].filter(Boolean).join(' ') || 'No name';
}

function formatDate(dateString: null | string): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return 'today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return '1 month ago';
  return `${diffMonths} months ago`;
}

function timeRemaining(endDate: string): string {
  const now = Date.now();
  const end = new Date(endDate).getTime();
  const diffMs = end - now;
  if (diffMs <= 0) return 'Ended';
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return '1 day left';
  if (diffDays < 30) return `${diffDays} days left`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffDays < 60) return `${diffWeeks} weeks left`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} months left`;
}

function getWhatsAppUrl(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}`;
}

function getSubtitle(client: Client): string {
  if (client.status === 'pending') {
    if (client.offer) return `Applied for ${client.offer.name}`;
    return `Invited ${timeAgo(client.inserted_at)}`;
  }
  if (client.status === 'active' || client.status === 'expiring' || client.status === 'expired') {
    const parts: string[] = [];
    if (client.program_name) parts.push(client.program_name);
    if (client.program_end) parts.push(timeRemaining(client.program_end));
    if (client.payment_status) parts.push(client.payment_status);
    if (parts.length > 0) return parts.join(' \u00B7 ');
  }
  return client.email ?? client.phone ?? '';
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

  const {data: nutritionData, isLoading: isLoadingNutrition} = useListNutritionPlansQuery({client_id: clientId});
  const {data: trainingData, isLoading: isLoadingTraining} = useListTrainingPlansQuery({client_id: clientId});

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
              {nutritionPlans.map((plan) => {
                const planStatus = plan.status ? PLAN_STATUS_MAP[plan.status] : null;
                return (
                  <Link
                    className="flex min-h-11 items-center gap-3 rounded-xl border border-divider bg-content1 p-3 transition-colors hover:bg-content2 active:bg-content2"
                    key={plan.id}
                    to={`/library/nutrition-plans/${plan.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{plan.name}</p>
                      <p className="text-xs text-foreground-500">
                        Nutrition
                        {plan.meals && plan.meals.length > 0
                          ? ` \u00B7 ${plan.meals.length} meal${plan.meals.length !== 1 ? 's' : ''}`
                          : ''}
                      </p>
                    </div>
                    {planStatus ? (
                      <Chip
                        color={planStatus.color}
                        size="sm"
                        variant="soft"
                      >
                        {planStatus.label}
                      </Chip>
                    ) : null}
                  </Link>
                );
              })}
              {trainingPlans.map((plan) => {
                const planStatus = plan.status ? PLAN_STATUS_MAP[plan.status] : null;
                const workoutCount = plan.planned_workouts.length;
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
                    {planStatus ? (
                      <Chip
                        color={planStatus.color}
                        size="sm"
                        variant="soft"
                      >
                        {planStatus.label}
                      </Chip>
                    ) : null}
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
  const [updateClient, {isLoading: isUpdating}] = useUpdateClientMutation();

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
  const subtitle = getSubtitle(client);
  const statusColor = STATUS_CHIP_COLOR[client.status] ?? 'default';
  const canArchive = client.status === 'pending' || client.status === 'expired';

  const handleMarkAsPaid = async () => {
    try {
      await updateClient({id: client.id, body: {payment_status: 'paid'}}).unwrap();
      toast.success('Marked as paid');
    } catch {
      toast.danger('Failed to update payment status.');
    }
  };

  const handleArchive = async () => {
    try {
      await updateClient({id: client.id, body: {status_override: 'archived'}}).unwrap();
      toast.success('Client archived');
      navigate(ROUTES.CLIENTS);
    } catch {
      toast.danger('Failed to archive client.');
    }
  };

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
              {subtitle ? <p className="truncate text-sm text-foreground-500">{subtitle}</p> : null}
            </div>
            <Chip
              color={statusColor}
              size="sm"
              variant="soft"
            >
              {client.status}
            </Chip>
          </div>

          {/* Action buttons — only rendered when there are actions */}
          {client.phone || client.status === 'expiring' || client.status === 'expired' || canArchive ? (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-divider pt-3">
              {client.phone ? (
                <a
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-success-50 px-3 py-2 text-sm font-medium text-success-700 transition-colors hover:bg-success-100 active:bg-success-200"
                  href={getWhatsAppUrl(client.phone)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </a>
              ) : null}
              {client.phone ? (
                <a
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-divider px-3 py-2 text-sm font-medium transition-colors hover:bg-default-100 active:bg-default-200"
                  href={`tel:${client.phone}`}
                >
                  <Phone size={16} />
                  Call
                </a>
              ) : null}
              {client.status === 'expiring' || client.status === 'expired' ? (
                <Button
                  className="flex-1"
                  onPress={() => navigate(`/clients/${client.id}/edit?renew=true`)}
                  size="sm"
                  variant="secondary"
                >
                  <RefreshCw size={14} />
                  Renew
                </Button>
              ) : null}
              {canArchive ? (
                <AlertDialog>
                  <Button
                    className="flex-1"
                    size="sm"
                    variant="danger"
                  >
                    <Archive size={14} />
                    Archive
                  </Button>
                  <AlertDialog.Backdrop>
                    <AlertDialog.Container>
                      <AlertDialog.Dialog className="sm:max-w-[400px]">
                        <AlertDialog.CloseTrigger />
                        <AlertDialog.Header>
                          <AlertDialog.Icon status="danger" />
                          <AlertDialog.Heading>Archive client?</AlertDialog.Heading>
                        </AlertDialog.Header>
                        <AlertDialog.Body>
                          <p>
                            This will archive <strong>{fullName}</strong>. You can change this later from the edit page.
                          </p>
                        </AlertDialog.Body>
                        <AlertDialog.Footer>
                          <Button
                            slot="close"
                            variant="tertiary"
                          >
                            Cancel
                          </Button>
                          <Button
                            isPending={isUpdating}
                            onPress={handleArchive}
                            variant="danger"
                          >
                            {isUpdating ? 'Archiving...' : 'Archive'}
                          </Button>
                        </AlertDialog.Footer>
                      </AlertDialog.Dialog>
                    </AlertDialog.Container>
                  </AlertDialog.Backdrop>
                </AlertDialog>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* ── Program strip ──────────────────────────────── */}
        {client.program_name || client.program_start ? (
          <div className="mt-3 rounded-lg border border-divider bg-content2 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium">{client.program_name || 'Program'}</p>
              {client.payment_status ? (
                <div className="flex shrink-0 items-center gap-2">
                  <Chip
                    color={PAYMENT_CHIP_COLOR[client.payment_status] ?? 'default'}
                    size="sm"
                    variant="soft"
                  >
                    {client.payment_status}
                  </Chip>
                  {client.payment_status !== 'paid' && client.payment_status !== 'free' ? (
                    <Button
                      isPending={isUpdating}
                      onPress={handleMarkAsPaid}
                      size="sm"
                      variant="ghost"
                    >
                      <Check size={14} />
                      Paid
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
            {client.program_start && client.program_end ? (
              <p className="text-xs text-foreground-500">
                {formatDateShort(client.program_start)} &rarr; {formatDateShort(client.program_end)}
                {' \u00B7 '}
                {timeRemaining(client.program_end)}
              </p>
            ) : null}
          </div>
        ) : null}

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

        {/* ── Intake section ────────────────────────────── */}
        {client.intake_answers != null ? (
          <section className="py-4">
            <Separator className="mb-4" />
            <SectionHeading title="Intake" />
            <div className="flex flex-col gap-3">
              {client.offer ? (
                <p className="text-sm text-foreground-500">
                  Applied for: <span className="font-medium text-foreground">{client.offer.name}</span>
                  {client.offer.price_display ? ` \u00B7 ${client.offer.price_display}` : ''}
                </p>
              ) : null}
              {client.source ? (
                <p className="text-sm text-foreground-500">
                  Source: {client.source} &middot; {timeAgo(client.inserted_at)}
                </p>
              ) : null}

              <div className="overflow-hidden rounded-lg border border-divider">
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(client.intake_answers).map(([key, value]) => (
                      <tr
                        className="border-b border-divider last:border-b-0"
                        key={key}
                      >
                        <td className="bg-content2 px-3 py-2 font-medium text-foreground-500">{key}</td>
                        <td className="px-3 py-2">{String(value ?? '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Nutrition Adherence ────────────────────────── */}
        <ClientNutritionAdherence clientId={client.id} />

        {/* ── Workout History ───────────────────────────── */}
        <ClientWorkoutHistory clientId={client.id} />

        {/* ── Details section ───────────────────────────── */}
        <section className="py-4">
          <Separator className="mb-4" />
          <SectionHeading title="Details" />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-foreground-400">Added</p>
              <p>{formatDate(client.inserted_at)}</p>
            </div>
            <div>
              <p className="text-xs text-foreground-400">Last updated</p>
              <p>{formatDate(client.updated_at)}</p>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
