import {Button, Typography} from '@heroui/react';
import type {ReactNode} from 'react';

import {SectionCard} from '@/clients/components/section-card';

/**
 * The plan header both CD-TR and CD-NU open with, and the "no plan" state that
 * replaces it. Identical in the design apart from the noun and the meta line —
 * `{{ trainName }} · Started 12 May · 4 days a week` against
 * `{{ nutriName }} · 1,900 kcal · P 160 g · C 190 g · F 55 g` — so the copy is the
 * parameter and the shape is not.
 *
 * Assigning is deliberately left to the caller as a node: nutrition and training
 * assign through different controls, and folding both in here would mean this
 * module knowing about two mutations to save one prop.
 */
export function PlanPanel({
  assignAction,
  emptyBody,
  emptyTitle,
  meta,
  name,
  onEnd,
  onOpen,
  onSwap,
}: {
  assignAction?: ReactNode;
  emptyBody: string;
  emptyTitle: string;
  meta?: null | string;
  name?: null | string;
  onEnd?: () => void;
  onOpen?: () => void;
  onSwap?: () => void;
}) {
  if (!name) {
    return (
      <SectionCard>
        <div className="p-6 text-center">
          <Typography type="h5">{emptyTitle}</Typography>
          <Typography
            className="mx-auto mt-1 max-w-100"
            color="muted"
            type="body-sm"
          >
            {emptyBody}
          </Typography>
          {assignAction && <div className="mt-4 flex justify-center">{assignAction}</div>}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <div className="flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <Typography
            truncate
            type="body-sm"
            weight="semibold"
          >
            {name}
          </Typography>
          {meta && (
            <Typography
              color="muted"
              type="body-xs"
            >
              {meta}
            </Typography>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {onOpen && (
            <Button
              onPress={onOpen}
              size="sm"
              variant="primary"
            >
              Open plan
            </Button>
          )}
          {onSwap && (
            <Button
              onPress={onSwap}
              size="sm"
              variant="outline"
            >
              Change plan
            </Button>
          )}
          {onEnd && (
            <Button
              onPress={onEnd}
              size="sm"
              variant="outline"
            >
              End plan
            </Button>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
