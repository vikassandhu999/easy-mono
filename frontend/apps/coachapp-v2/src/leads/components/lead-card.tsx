import {Chip} from '@heroui/react';
import {Link} from 'react-router-dom';

import type {Lead} from '@/api/leads';

type StatusConfig = {
  color: 'accent' | 'danger' | 'default' | 'success' | 'warning';
  label: string;
};

const STATUS_MAP: Record<string, StatusConfig> = {
  contacted: {color: 'warning', label: 'Contacted'},
  converted: {color: 'success', label: 'Converted'},
  new: {color: 'accent', label: 'New'},
  rejected: {color: 'danger', label: 'Rejected'},
};

function formatTimeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString(undefined, {day: 'numeric', month: 'short'});
}

export default function LeadCard({lead}: {lead: Lead}) {
  const status = STATUS_MAP[lead.status] ?? {color: 'default' as const, label: lead.status};
  const subtitle = [lead.offer?.name, lead.offer?.price_display].filter(Boolean).join(' · ');

  return (
    <Link
      className="flex min-h-11 items-center gap-3 rounded-xl border border-divider bg-content1 p-3 transition-colors hover:bg-content2 active:bg-content2 sm:p-4"
      to={`/leads/${lead.id}`}
    >
      {/* Status dot */}
      <span
        className={`size-2.5 shrink-0 rounded-full ${lead.status === 'new' ? 'bg-primary' : 'bg-foreground-300'}`}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{lead.name}</p>
        {subtitle && <p className="truncate text-xs text-foreground-500">{subtitle}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden text-xs text-foreground-400 sm:inline">{formatTimeAgo(lead.inserted_at)}</span>
        <Chip
          color={status.color}
          size="sm"
          variant="soft"
        >
          {status.label}
        </Chip>
      </div>
    </Link>
  );
}
