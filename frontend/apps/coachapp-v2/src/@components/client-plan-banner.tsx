import {formatDateShort} from '@easy/utils';
import {Avatar, Chip} from '@heroui/react';
import {Link} from 'react-router-dom';

import type {TrainingPlanClient} from '@/api/generated';

type ClientPlanBannerProps = {
  client: TrainingPlanClient;
  endDate?: null | string;
  startDate?: null | string;
};

function getFullName(client: TrainingPlanClient): string {
  return [client.first_name, client.last_name].filter(Boolean).join(' ') || 'Client';
}

function getInitials(client: TrainingPlanClient): string {
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
      className="mb-4 flex min-h-11 items-center gap-3 rounded-xl border border-border bg-surface-secondary p-3 transition-colors hover:bg-surface-tertiary active:bg-surface-tertiary"
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
          <p className="text-xs text-muted">
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
