/**
 * The planned sets of one exercise (badge TB). Each row opens the set editor;
 * the `×` removes the set.
 *
 * GAPS.md #7 calls for `ListBox` items here, but an option can't host its own
 * interactive `×`, and the workaround — a parallel column of buttons beside the
 * list — drifts out of alignment as soon as the two columns' row heights differ,
 * which the design's 22px `×` guarantees. So rows are plain elements, mirroring
 * the nutrition builder's meal-item rows.
 */
import {Button} from '@heroui/react';
import {X} from 'lucide-react';

import {AS_TEXT, NO_GAP} from '@/@components/ua-defaults';

import {canRemoveSet, formatSetSummary, type PlannedSet} from '../sets';

interface SetListProps {
  sets: PlannedSet[];
  /** Decides which measures each summary shows — the same table the editor uses. */
  trackingType: string | null;
  exerciseName: string;
  onOpenSet: (index: number, anchor: HTMLElement) => void;
  onRemoveSet: (index: number) => void;
}

export function SetList({sets, trackingType, exerciseName, onOpenSet, onRemoveSet}: SetListProps) {
  const isRemovable = canRemoveSet(sets);

  return (
    <div className="flex flex-col">
      {sets.map((set, index) => (
        <div
          className="flex items-center gap-2 py-1"
          data-testid={index === 0 ? 'tb-set-row' : undefined}
          // A set has no id of its own; its position in the array IS its identity.
          key={index}
        >
          <Button
            className={`h-auto min-w-0 flex-1 justify-start p-0 text-left ${AS_TEXT} ${NO_GAP}`}
            // The pressed row IS the desktop popover's anchor, so it arrives with
            // the event — no ref array, no registration callback, and nothing to
            // fall out of sync when a set is added or removed.
            onPress={(event) => onOpenSet(index, event.target as HTMLElement)}
            variant="ghost"
          >
            <span
              className="min-w-0 truncate type-eyebrow text-muted"
              data-testid={index === 0 ? 'tb-set-summary' : undefined}
            >
              <span
                className="mr-1.5 font-semibold text-foreground"
                data-testid={index === 0 ? 'tb-set-label' : undefined}
              >
                Set {index + 1}
              </span>
              {formatSetSummary(set, trackingType)}
            </span>
          </Button>

          {isRemovable ? (
            <Button
              aria-label={`Remove set ${index + 1} of ${exerciseName}`}
              className={`shrink-0 rounded-chip bg-transparent p-0 text-muted sm:size-5.5 ${AS_TEXT} ${NO_GAP}`}
              data-testid={index === 0 ? 'tb-remove-set' : undefined}
              isIconOnly
              onPress={() => onRemoveSet(index)}
              variant="ghost"
            >
              <X className="size-3.5" />
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
