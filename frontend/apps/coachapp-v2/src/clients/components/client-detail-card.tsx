import {formatIsoDateOnly} from '@easy/utils';
import {Skeleton, Typography} from '@heroui/react';
import {Pencil} from 'lucide-react';
import {Link} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {
  type ClientProfileField,
  PROFILE_SECTIONS,
  readProfileFieldValue,
  useGetCoachingClientProfileQuery,
  useListProfileFieldsQuery,
} from '@/api/client-profile';
import type {Client} from '@/api/clients';
import {formatNumber, formatStatusLabel} from '@/clients/lib/client-detail-metrics';

function formatProfileValue(value: unknown): string {
  if (value == null || value === '') {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(String).join(', ') : '—';
  }
  return String(value);
}

function FieldItem({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded-2xl border-[1.5px] border-separator bg-surface p-3">
      <Typography
        color="muted"
        type="body-xs"
        weight="semibold"
      >
        {label}
      </Typography>
      <Typography
        className="mt-1 break-words"
        type="body-sm"
        weight="semibold"
      >
        {value}
      </Typography>
    </div>
  );
}

function profileRows(fields: ClientProfileField[], profile: Parameters<typeof readProfileFieldValue>[0]) {
  return PROFILE_SECTIONS.flatMap((section) =>
    fields
      .filter((field) => field.section === section.key)
      .map((field) => ({
        id: field.id,
        label: field.label,
        section: section.label,
        value: formatProfileValue(readProfileFieldValue(profile, field)),
      })),
  );
}

function membershipRows(client: Client) {
  const rows = [
    {id: 'status', label: 'Status', value: formatStatusLabel(client.status)},
    {id: 'stage', label: 'Stage', value: formatStatusLabel(client.stage)},
    {
      id: 'subscription_started_on',
      label: 'Subscription started',
      value: client.subscription_started_on ? formatIsoDateOnly(client.subscription_started_on) : '—',
    },
    {
      id: 'subscription_ends_on',
      label: 'Subscription ends',
      value: client.subscription_ends_on ? formatIsoDateOnly(client.subscription_ends_on) : '—',
    },
  ];

  if (client.inactive_reason) {
    rows.push({id: 'inactive_reason', label: 'Inactive reason', value: formatStatusLabel(client.inactive_reason)});
  }

  if (client.goal_weight_value != null) {
    rows.push({
      id: 'goal_weight',
      label: 'Goal weight',
      value: `${formatNumber(client.goal_weight_value)} ${client.goal_weight_unit ?? 'kg'}`,
    });
  }

  return rows;
}

export default function ClientDetailCard({client}: {client: Client}) {
  const profileQuery = useGetCoachingClientProfileQuery({clientId: client.id});
  const fieldsQuery = useListProfileFieldsQuery();
  const isLoading = profileQuery.isLoading || fieldsQuery.isLoading;
  const isError = profileQuery.isError || fieldsQuery.isError || !profileQuery.data;
  const rows = profileQuery.data && fieldsQuery.data ? profileRows(fieldsQuery.data.data, profileQuery.data.data) : [];
  const membership = membershipRows(client);

  return (
    <section className="rounded-3xl border-[1.5px] border-separator bg-surface p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-grotesk text-xl font-bold">Detail</h2>
          <Typography
            className="mt-1"
            color="muted"
            type="body-sm"
          >
            Profile, goals &amp; membership
          </Typography>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border-[1.5px] border-separator bg-surface px-4 text-sm font-bold transition-colors hover:bg-surface-hover"
          to={ROUTES.CLIENT_PROFILE.replace(':id', client.id)}
        >
          <Pencil size={15} />
          Edit profile
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-36 rounded-3xl" />
          <Skeleton className="h-36 rounded-3xl" />
        </div>
      ) : isError ? (
        <Typography
          color="muted"
          type="body-sm"
        >
          Couldn&apos;t load profile details.
        </Typography>
      ) : (
        <div className="space-y-5">
          <div>
            <Typography
              className="mb-3 uppercase tracking-wider text-accent"
              type="body-xs"
              weight="bold"
            >
              Personal
            </Typography>
            {rows.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {rows.map((row) => (
                  <FieldItem
                    key={row.id}
                    label={`${row.section} · ${row.label}`}
                    value={row.value}
                  />
                ))}
              </div>
            ) : (
              <Typography
                color="muted"
                type="body-sm"
              >
                No profile fields recorded yet.
              </Typography>
            )}
          </div>

          <div>
            <Typography
              className="mb-3 uppercase tracking-wider text-accent"
              type="body-xs"
              weight="bold"
            >
              Membership
            </Typography>
            <div className="grid gap-3 sm:grid-cols-2">
              {membership.map((row) => (
                <FieldItem
                  key={row.id}
                  label={row.label}
                  value={row.value}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
