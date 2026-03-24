import {Avatar, Button, Chip, Spinner, toast} from '@heroui/react';
import {ArrowLeft, ClipboardList, Copy, Mail, Pencil, Phone} from 'lucide-react';
import {useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useGetClientQuery} from '@/api/clients';
import {type NutritionPlan, useAssignNutritionPlanMutation, useListNutritionPlansQuery} from '@/api/nutritionPlans';
import NutritionPlanPicker from '@/nutrition-plans/components/nutrition-plan-picker';

type StatusConfig = {
  color: 'danger' | 'default' | 'success' | 'warning';
  label: string;
};

const STATUS_MAP: Record<string, StatusConfig> = {
  active: {color: 'success', label: 'Active'},
  archived: {color: 'danger', label: 'Archived'},
  inactive: {color: 'default', label: 'Inactive'},
  pending: {color: 'warning', label: 'Pending'},
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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function InfoRow({icon, label, value}: {icon: React.ReactNode; label: string; value: null | string}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="mt-0.5 text-foreground-400">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-foreground-400">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}

/**
 * Client nutrition plans section — shows plans assigned to this client.
 * The picker visibility is controlled by the parent via showPicker prop,
 * so the "Assign Plan" button can live in the parent's top nav bar.
 */
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
    <section className="border-t border-divider py-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-400">Nutrition Plans</h3>

      {/* Assign from template — revealed inline when parent toggles showPicker */}
      {showPicker && (
        <div className="mb-3 rounded-xl border border-divider bg-content1 p-3">
          <p className="mb-2 text-sm text-foreground-500">
            Search for a nutrition plan template to copy to this client.
          </p>
          <NutritionPlanPicker
            onSelect={handleAssign}
            placeholder="Search nutrition plans..."
          />
          {isAssigning && (
            <div className="mt-2 flex items-center gap-2 text-sm text-foreground-400">
              <Spinner size="sm" />
              Assigning plan...
            </div>
          )}
        </div>
      )}

      {/* List of assigned plans */}
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
                  {plan.meals.length > 0 && (
                    <p className="text-xs text-foreground-500">
                      {plan.meals.length} meal
                      {plan.meals.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                {planStatus && (
                  <Chip
                    color={planStatus.color}
                    size="sm"
                    variant="soft"
                  >
                    {planStatus.label}
                  </Chip>
                )}
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

export default function ClientDetail() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const {data, isError, isLoading} = useGetClientQuery(id!);
  const [showPlanPicker, setShowPlanPicker] = useState(false);

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
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center text-sm text-danger">
          Failed to load client. They may not exist or you don&apos;t have access.
        </div>
      </PageLayout>
    );
  }

  const client = data.data;
  const status = STATUS_MAP[client.status] ?? {
    color: 'default' as const,
    label: client.status,
  };
  const fullName = getFullName(client.first_name, client.last_name);
  const initials = getInitials(client.first_name, client.last_name);

  return (
    <PageLayout title="Client">
      {/* Navigation bar */}
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
        <Button
          onPress={() => setShowPlanPicker((v) => !v)}
          size="sm"
          variant="secondary"
        >
          <Copy size={14} />
          Assign Plan
        </Button>
      </div>
      <div className="max-w-lg">
        {/* Profile header */}
        <div className="flex items-center gap-4 pb-6">
          <Avatar
            className="size-14"
            color="accent"
          >
            <Avatar.Fallback className="text-lg">{initials}</Avatar.Fallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold">{fullName}</h2>
            <div className="mt-1">
              <Chip
                color={status.color}
                size="sm"
                variant="soft"
              >
                {status.label}
              </Chip>
            </div>
          </div>
        </div>

        {/* Contact info */}
        <section className="border-t border-divider py-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-400">Contact</h3>
          <div className="divide-y divide-divider">
            <InfoRow
              icon={<Mail size={16} />}
              label="Email"
              value={client.email}
            />
            <InfoRow
              icon={<Phone size={16} />}
              label="Phone"
              value={client.phone}
            />
          </div>
          {!client.email && !client.phone && (
            <p className="py-2 text-sm text-foreground-400">No contact information available.</p>
          )}
        </section>

        {/* Notes */}
        <section className="border-t border-divider py-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-400">Notes</h3>
          {client.notes ? (
            <p className="whitespace-pre-wrap text-sm">{client.notes}</p>
          ) : (
            <p className="text-sm text-foreground-400">No notes yet.</p>
          )}
        </section>

        {/* Nutrition Plans */}
        <ClientNutritionPlans
          clientId={client.id}
          onAssigned={() => setShowPlanPicker(false)}
          showPicker={showPlanPicker}
        />

        {/* Meta */}
        <section className="border-t border-divider py-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-400">Details</h3>
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
