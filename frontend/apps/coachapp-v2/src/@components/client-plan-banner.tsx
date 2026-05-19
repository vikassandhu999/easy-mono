import {Avatar, Chip} from '@heroui/react';
import {Link} from 'react-router-dom';

import type {PlanClient} from '@/api/trainingPlans';

type ClientPlanBannerProps = {
  client: PlanClient;
  endDate?: null | string;
  startDate?: null | string;
};

function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {day: 'numeric', month: 'short'});
}

function getFullName(client: PlanClient): string {
  return [client.first_name, client.last_name].filter(Boolean).join(' ') || 'Client';
}

function getInitials(client: PlanClient): string {
  const first = client.first_name?.charAt(0) ?? '';
  const last = client.last_name?.charAt(0) ?? '';
  return (first + last).toUpperCase() || '?';
}

export default function ClientPlanBanner({client, endDate, startDate}: ClientPlanBannerProps) {
  const fullName = getFullName(client);
  const initials = getInitials(client);
  const hasDates = Boolean(startDate ?? endDate);

  return (
    <Link
      className="mb-4 flex min-h-11 items-center gap-3 rounded-xl border border-divider bg-content2 p-3 transition-colors hover:bg-content3 active:bg-content3"
      to={`/clients/${client.id}`}
    >
      <Avatar
        color="accent"
        size="sm"
      >
        <Avatar.Fallback className="text-xs">{initials}</Avatar.Fallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          Personal plan for <span className="font-semibold">{fullName}</span>
        </p>
        {hasDates ? (
          <p className="text-xs text-foreground-500">
            {startDate ? formatDateShort(startDate) : ''}
            {startDate && endDate ? ' \u2192 ' : ''}
            {endDate ? formatDateShort(endDate) : ''}
          </p>
        ) : null}
      </div>
      <Chip
        color="default"
        size="sm"
        variant="soft"
      >
        Personal
      </Chip>
    </Link>
  );
}
