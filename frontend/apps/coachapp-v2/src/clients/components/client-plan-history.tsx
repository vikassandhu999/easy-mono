import {Typography} from '@heroui/react';
import type {ReactNode} from 'react';

import type {PlanStatus} from '@/clients/lib/client';
import {PLAN_STATUS_MAP} from '@/clients/lib/client';
import {softStatusClass} from '@/clients/lib/client-detail-metrics';

export type ClientPlanHistoryItem = {
  details: string;
  id: string;
  name: string;
  status: PlanStatus;
};

export default function ClientPlanHistory({icon, items}: {icon: ReactNode; items: ClientPlanHistoryItem[]}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Plan history"
      className="mt-5"
    >
      <Typography
        className="mb-2.5 text-[11px] uppercase tracking-[0.06em]"
        color="muted"
        weight="bold"
      >
        Plan history
      </Typography>
      <ul className="overflow-hidden rounded-[14px] border border-separator bg-surface lg:rounded-[18px] lg:border-[1.5px]">
        {items.map((item) => (
          <li
            className="flex items-center gap-3 border-b border-surface-secondary px-3 py-3 last:border-b-0 lg:gap-[13px] lg:px-4 lg:py-3.5"
            key={item.id}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-surface-secondary text-muted lg:size-9 lg:rounded-[10px]">
              {icon}
            </span>
            <span className="min-w-0 flex-1">
              <Typography
                truncate
                type="body-sm"
                weight="semibold"
              >
                {item.name}
              </Typography>
              <Typography
                color="muted"
                truncate
                type="body-xs"
              >
                {item.details}
              </Typography>
            </span>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${softStatusClass(item.status)}`}>
              {PLAN_STATUS_MAP[item.status].label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
