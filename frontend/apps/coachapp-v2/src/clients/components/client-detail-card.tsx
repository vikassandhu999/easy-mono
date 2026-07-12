import {formatIsoDateOnly} from '@easy/utils';
import {Typography} from '@heroui/react';

import type {Client} from '@/api/clients';
import {formatNumber, formatStatusLabel} from '@/clients/lib/client-detail-metrics';

function FieldItem({label, value}: {label: string; value: string}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-surface-secondary px-[14px] py-[11px] last:border-b-0 lg:px-[18px] lg:py-[13px]">
      <Typography
        className="min-w-0"
        color="muted"
        type="body-sm"
      >
        {label}
      </Typography>
      <Typography
        className="min-w-0 text-right break-words"
        type="body-sm"
        weight="semibold"
      >
        {value}
      </Typography>
    </div>
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
  const membership = membershipRows(client);

  return (
    <section className="rounded-3xl border-[1.5px] border-separator bg-surface p-5">
      <div className="mb-5">
        <h2 className="font-grotesk text-xl font-bold">Detail</h2>
        <Typography
          className="mt-1"
          color="muted"
          type="body-sm"
        >
          Goals &amp; membership
        </Typography>
      </div>

      <div>
        <Typography
          className="mb-3 uppercase tracking-wider text-accent"
          type="body-xs"
          weight="bold"
        >
          Membership
        </Typography>
        <div className="overflow-hidden rounded-[14px] border-[1.5px] border-separator bg-surface lg:rounded-[18px]">
          {membership.map((row) => (
            <FieldItem
              key={row.id}
              label={row.label}
              value={row.value}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
