import {Button, Card} from '@heroui/react';
import {ExternalLink} from 'lucide-react';

import {toSentenceCase} from '@/shared/lib/format/formatHelpers';

type ClientPlanCardProps = {
  dateRange?: string;
  itemCount: string;
  name: string;
  onOpen: () => void;
  status: string;
};

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-accent text-foreground',
  archived: 'bg-default text-muted',
  draft: 'bg-surface-secondary text-foreground',
};

export default function ClientPlanCard({dateRange, itemCount, name, onOpen, status}: ClientPlanCardProps) {
  const badgeClass = STATUS_BADGE[status.toLowerCase()] ?? 'bg-default text-muted';

  return (
    <Card className="border border-separator bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate font-medium text-foreground">{name}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
              {toSentenceCase(status)}
            </span>
            <span className="text-xs text-muted">{itemCount}</span>
            {dateRange ? <span className="text-xs text-muted">{dateRange}</span> : null}
          </div>
        </div>
        <Button
          className="shrink-0"
          onPress={onOpen}
          size="sm"
          variant="ghost"
        >
          <ExternalLink className="mr-1 h-3.5 w-3.5" />
          Open
        </Button>
      </div>
    </Card>
  );
}
