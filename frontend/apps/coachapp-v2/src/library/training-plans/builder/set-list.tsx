/**
 * The planned sets of one exercise (badge TB). Each row opens the set editor;
 * the `×` removes the set. Rows are plain elements, not the `ListBox` GAPS.md
 * #7 calls for — an option can't host its own interactive `×`.
 */
import {Button} from '@heroui/react';
import {X} from 'lucide-react';
import {formatSetSummary, type PlannedSet} from '@/library/training-plans/builder/sets';
import {AS_TEXT, NO_GAP} from '@/ui/ua-defaults';

interface SetListProps {
  sets: PlannedSet[];
  /** Decides which measures each summary shows — the same table the editor uses. */
  trackingType: string | null;
  exerciseName: string;
  onOpenSet: (index: number, anchor: HTMLElement) => void;
  onRemoveSet: (index: number) => void;
}

export function SetList({sets, trackingType, exerciseName, onOpenSet, onRemoveSet}: SetListProps) {
  // `planned_sets` requires at least one — the last set is not removable.
  const isRemovable = sets.length > 1;

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
            aria-label={`Set ${index + 1} ${formatSetSummary(set, trackingType)}`}
            className={`h-auto min-w-0 flex-1 justify-start p-0 text-left ${AS_TEXT} ${NO_GAP}`}
            // The pressed row IS the desktop popover's anchor, so it arrives with
            // the event — no ref array, no registration callback, and nothing to
            // fall out of sync when a set is added or removed.
            onPress={(event) => event.target instanceof HTMLElement && onOpenSet(index, event.target)}
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
