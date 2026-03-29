import {Alert, AlertDialog, Avatar, Button, Chip, Separator, Spinner, toast} from '@heroui/react';
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  Calendar,
  Check,
  ClipboardList,
  Clock,
  CreditCard,
  Dumbbell,
  Instagram,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  RefreshCw,
  UtensilsCrossed,
} from 'lucide-react';
import {useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {
  type Client,
  type ClientStatus,
  type PaymentStatus,
  useGetClientQuery,
  useUpdateClientMutation,
} from '@/api/clients';
import {type NutritionPlan, useAssignNutritionPlanMutation, useListNutritionPlansQuery} from '@/api/nutritionPlans';
import {type TrainingPlan, useAssignTrainingPlanMutation, useListTrainingPlansQuery} from '@/api/trainingPlans';
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
  if (client.status === 'active' || client.status === 'expiring') {
    const parts: string[] = [];
    if (client.program_name) parts.push(client.program_name);
    if (client.program_end) parts.push(timeRemaining(client.program_end));
    if (client.payment_status) parts.push(client.payment_status);
    if (parts.length > 0) return parts.join(' \u00B7 ');
  }
  return client.email ?? client.phone ?? '';
}

function hasProgramData(client: Client): boolean {
  return !!(
    client.program_name ||
    client.program_start ||
    client.program_end ||
    client.payment_status ||
    client.payment_amount
  );
}

// ── Section heading ──────────────────────────────────────────

function SectionHeading({title}: {title: string}) {
  return <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-400">{title}</h3>;
}

// ── Client Nutrition Plans ───────────────────────────────────

function ClientNutritionPlans({
  clientId,
  onAssigned,
  showPicker,
}: {
  clientId: string;
  onAssigned: () => void;
  showPicker: boolean;
}) {
  const [assignPlan, {isLoading: isAssigning}] = useAssignNutritionPlanMutation();
  const {data, isLoading} = useListNutritionPlansQuery({
    client_id: clientId,
  });

  const plans = data?.data ?? [];

  const handleAssign = async (plan: NutritionPlan) => {
    try {
      await assignPlan({id: plan.id, body: {client_id: clientId}}).unwrap();
      toast.success(`"${plan.name}" assigned to client`);
      onAssigned();
    } catch {
      toast.danger('Failed to assign nutrition plan.');
    }
  };

  return (
    <section className="py-4">
      <Separator className="mb-4" />
      <SectionHeading title="Nutrition Plans" />

      {showPicker ? (
        <div className="mb-3 rounded-xl border border-divider bg-content1 p-3">
          <p className="mb-2 text-sm text-foreground-500">
            Search for a nutrition plan template to copy to this client.
          </p>
          <NutritionPlanPicker
            onSelect={handleAssign}
            placeholder="Search nutrition plans..."
          />
          {isAssigning ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-foreground-400">
              <Spinner size="sm" />
              Assigning plan...
            </div>
          ) : null}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : plans.length > 0 ? (
        <div className="flex flex-col gap-2">
          {plans.map((plan) => {
            const planStatus = plan.status ? PLAN_STATUS_MAP[plan.status] : null;
            return (
              <Link
                className="flex min-h-11 items-center gap-3 rounded-xl border border-divider bg-content1 p-3 transition-colors hover:bg-content2 active:bg-content2"
                key={plan.id}
                to={`/library/nutrition-plans/${plan.id}`}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-content2">
                  <ClipboardList
                    className="text-foreground-400"
                    size={16}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{plan.name}</p>
                  {plan.meals.length > 0 ? (
                    <p className="text-xs text-foreground-500">
                      {plan.meals.length} meal
                      {plan.meals.length !== 1 ? 's' : ''}
                    </p>
                  ) : null}
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
        <p className="text-sm text-foreground-400">No nutrition plans assigned yet.</p>
      )}
    </section>
  );
}

// ── Client Training Plans ────────────────────────────────────

function ClientTrainingPlans({
  clientId,
  onAssigned,
  showPicker,
}: {
  clientId: string;
  onAssigned: () => void;
  showPicker: boolean;
}) {
  const [assignPlan, {isLoading: isAssigning}] = useAssignTrainingPlanMutation();
  const {data, isLoading} = useListTrainingPlansQuery({
    client_id: clientId,
  });

  const plans = data?.data ?? [];

  const handleAssign = async (plan: TrainingPlan) => {
    try {
      await assignPlan({id: plan.id, body: {client_id: clientId}}).unwrap();
      toast.success(`"${plan.name}" assigned to client`);
      onAssigned();
    } catch {
      toast.danger('Failed to assign training plan.');
    }
  };

  return (
    <section className="py-4">
      <Separator className="mb-4" />
      <SectionHeading title="Training Plans" />

      {showPicker ? (
        <div className="mb-3 rounded-xl border border-divider bg-content1 p-3">
          <p className="mb-2 text-sm text-foreground-500">
            Search for a training plan template to copy to this client.
          </p>
          <TrainingPlanPicker
            onSelect={handleAssign}
            placeholder="Search training plans..."
          />
          {isAssigning ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-foreground-400">
              <Spinner size="sm" />
              Assigning plan...
            </div>
          ) : null}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : plans.length > 0 ? (
        <div className="flex flex-col gap-2">
          {plans.map((plan) => {
            const planStatus = plan.status ? PLAN_STATUS_MAP[plan.status] : null;
            const workoutCount = plan.planned_workouts.length;
            return (
              <Link
                className="flex min-h-11 items-center gap-3 rounded-xl border border-divider bg-content1 p-3 transition-colors hover:bg-content2 active:bg-content2"
                key={plan.id}
                to={`/library/training-plans/${plan.id}`}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-content2">
                  <Dumbbell
                    className="text-foreground-400"
                    size={16}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{plan.name}</p>
                  {workoutCount > 0 ? (
                    <p className="text-xs text-foreground-500">
                      {workoutCount} workout{workoutCount !== 1 ? 's' : ''}
                    </p>
                  ) : null}
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
        <p className="text-sm text-foreground-400">No training plans assigned yet.</p>
      )}
    </section>
  );
}

// ── Main component ───────────────────────────────────────────

export default function ClientDetail() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const {data, isError, isLoading} = useGetClientQuery(id!);
  const [updateClient, {isLoading: isUpdating}] = useUpdateClientMutation();
  const [showNutritionPicker, setShowNutritionPicker] = useState(false);
  const [showTrainingPicker, setShowTrainingPicker] = useState(false);

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
            onPress={() => navigate(ROUTES.CLIENTS)}
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
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          onPress={() => navigate(ROUTES.CLIENTS)}
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
        {client.phone ? (
          <a
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-divider px-3 py-2 text-sm font-medium transition-colors hover:bg-default-100 active:bg-default-200"
            href={getWhatsAppUrl(client.phone)}
            rel="noopener noreferrer"
            target="_blank"
          >
            <MessageCircle size={16} />
            WhatsApp
          </a>
        ) : null}
        <Button
          onPress={() => {
            setShowNutritionPicker((v) => !v);
            setShowTrainingPicker(false);
          }}
          size="sm"
          variant="secondary"
        >
          <UtensilsCrossed size={14} />
          Nutrition
        </Button>
        <Button
          onPress={() => {
            setShowTrainingPicker((v) => !v);
            setShowNutritionPicker(false);
          }}
          size="sm"
          variant="secondary"
        >
          <Dumbbell size={14} />
          Training
        </Button>
        {canArchive ? (
          <AlertDialog>
            <Button
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

      <div className="max-w-lg">
        {/* ── Profile header card ───────────────────────── */}
        <div className="flex items-center gap-4 pb-6">
          <Avatar
            className="size-14"
            color="accent"
          >
            <Avatar.Fallback className="text-lg">{initials}</Avatar.Fallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold">{fullName}</h2>
            {subtitle ? <p className="mt-0.5 truncate text-sm text-foreground-500">{subtitle}</p> : null}
            <div className="mt-1.5">
              <Chip
                color={statusColor}
                size="sm"
                variant="soft"
              >
                {client.status}
              </Chip>
            </div>
          </div>
        </div>

        {/* ── Program section ───────────────────────────── */}
        {hasProgramData(client) ? (
          <section className="py-4">
            <Separator className="mb-4" />
            <SectionHeading title="Program" />
            <div className="flex flex-col gap-3">
              {client.program_name ? (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-foreground-400">
                    <ClipboardList size={16} />
                  </span>
                  <div>
                    <p className="text-xs text-foreground-400">Program</p>
                    <p className="text-sm">{client.program_name}</p>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {client.program_start ? (
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-foreground-400">
                      <Calendar size={16} />
                    </span>
                    <div>
                      <p className="text-xs text-foreground-400">Start date</p>
                      <p className="text-sm">{formatDate(client.program_start)}</p>
                    </div>
                  </div>
                ) : null}
                {client.program_end ? (
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-foreground-400">
                      <Calendar size={16} />
                    </span>
                    <div>
                      <p className="text-xs text-foreground-400">End date</p>
                      <p className="text-sm">{formatDate(client.program_end)}</p>
                    </div>
                  </div>
                ) : null}
              </div>

              {client.program_end ? (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-foreground-400">
                    <Clock size={16} />
                  </span>
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-xs text-foreground-400">Time remaining</p>
                      <p className="text-sm">{timeRemaining(client.program_end)}</p>
                    </div>
                    {client.status === 'expiring' ? (
                      <AlertTriangle
                        className="text-warning"
                        size={16}
                      />
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Payment */}
              {client.payment_status || client.payment_amount ? (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-foreground-400">
                    <CreditCard size={16} />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <div>
                      <p className="text-xs text-foreground-400">Payment</p>
                      <p className="text-sm">
                        {client.payment_amount != null ? `${client.payment_amount}` : ''}
                        {client.payment_currency ? ` ${client.payment_currency}` : ''}
                      </p>
                    </div>
                    {client.payment_status ? (
                      <Chip
                        color={PAYMENT_CHIP_COLOR[client.payment_status] ?? 'default'}
                        size="sm"
                        variant="soft"
                      >
                        {client.payment_status}
                      </Chip>
                    ) : null}
                    {client.payment_status !== 'paid' && client.payment_status !== 'free' ? (
                      <Button
                        isPending={isUpdating}
                        onPress={handleMarkAsPaid}
                        size="sm"
                        variant="ghost"
                      >
                        <Check size={14} />
                        Mark as paid
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Renew button */}
              {client.status === 'expiring' || client.status === 'expired' ? (
                <Button
                  onPress={() => navigate(`/clients/${client.id}/edit?renew=true`)}
                  size="sm"
                  variant="secondary"
                >
                  <RefreshCw size={14} />
                  Renew Program
                </Button>
              ) : null}
            </div>
          </section>
        ) : null}

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

        {/* ── Nutrition Plans ───────────────────────────── */}
        <ClientNutritionPlans
          clientId={client.id}
          onAssigned={() => setShowNutritionPicker(false)}
          showPicker={showNutritionPicker}
        />

        {/* ── Training Plans ────────────────────────────── */}
        <ClientTrainingPlans
          clientId={client.id}
          onAssigned={() => setShowTrainingPicker(false)}
          showPicker={showTrainingPicker}
        />

        {/* ── Workout History ───────────────────────────── */}
        <ClientWorkoutHistory clientId={client.id} />

        {/* ── Contact section ───────────────────────────── */}
        <section className="py-4">
          <Separator className="mb-4" />
          <SectionHeading title="Contact" />
          <div className="flex flex-col gap-3">
            {client.email ? (
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-foreground-400">
                  <Mail size={16} />
                </span>
                <div>
                  <p className="text-xs text-foreground-400">Email</p>
                  <p className="text-sm">{client.email}</p>
                </div>
              </div>
            ) : null}
            {client.phone ? (
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-foreground-400">
                  <Phone size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-foreground-400">Phone</p>
                  <p className="text-sm">{client.phone}</p>
                </div>
                <a
                  aria-label="Message on WhatsApp"
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-foreground-400 transition-colors hover:bg-default-100 active:bg-default-200"
                  href={getWhatsAppUrl(client.phone)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <MessageCircle size={18} />
                </a>
              </div>
            ) : null}
            {client.instagram_handle ? (
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-foreground-400">
                  <Instagram size={16} />
                </span>
                <div>
                  <p className="text-xs text-foreground-400">Instagram</p>
                  <p className="text-sm">@{client.instagram_handle}</p>
                </div>
              </div>
            ) : null}
            {!client.email && !client.phone && !client.instagram_handle ? (
              <p className="text-sm text-foreground-400">No contact information available.</p>
            ) : null}
          </div>
        </section>

        {/* ── Notes section ─────────────────────────────── */}
        <section className="py-4">
          <Separator className="mb-4" />
          <SectionHeading title="Notes" />
          {client.notes ? (
            <p className="whitespace-pre-wrap text-sm">{client.notes}</p>
          ) : (
            <p className="text-sm text-foreground-400">No notes yet.</p>
          )}
        </section>

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
