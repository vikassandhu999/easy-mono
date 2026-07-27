/**
 * One exercise inside the active workout (badge TB): name · tracking chip ·
 * move up / move down / remove, then its sets behind a 2px accent rule.
 *
 * GAPS.md #11 — reordering is explicit up/down controls, no drag handles and no
 * DnD library.
 */
import {Button, Chip} from '@heroui/react';
import {ChevronDown, ChevronUp, X} from 'lucide-react';

import {AS_ICON_BUTTON, NO_GAP} from '@/@components/ua-defaults';
import type {TrainingPlanWorkoutExercise} from '@/api/training-plan-builder';
import {INLINE_LINK, TAG} from '@/builder-kit/ui';

import {trackingTypeLabel} from '../tracking';
import {SetList} from './set-list';

const ICON_BUTTON_CLASS = `size-11 rounded-chip bg-transparent text-muted sm:size-7 ${AS_ICON_BUTTON}`;

interface ExerciseItemProps {
  element: TrainingPlanWorkoutExercise;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onOpenSet: (index: number, anchor: HTMLElement) => void;
  onAddSet: (anchor: HTMLElement) => void;
  onRemoveSet: (index: number) => void;
}

export function ExerciseItem({
  element,
  isFirst,
  isLast,
  onMove,
  onRemove,
  onOpenSet,
  onAddSet,
  onRemoveSet,
}: ExerciseItemProps) {
  const name = element.exercise?.name ?? '—';
  const trackingType = element.exercise?.tracking_type ?? null;
  const trackingLabel = trackingTypeLabel(trackingType);

  return (
    <div
      className="border-b border-border py-3 last:border-0"
      data-testid="tb-exercise-row"
    >
      <div
        className="flex items-center gap-2"
        data-testid="tb-exercise-head"
      >
        <span
          className="min-w-0 flex-1 truncate type-body font-semibold text-foreground"
          data-testid="tb-exercise-name"
        >
          {name}
        </span>

        {trackingLabel ? (
          <Chip
            className={`${TAG} ${NO_GAP} hidden shrink-0 text-foreground sm:inline-flex`}
            data-testid="tb-track-chip"
            size="sm"
            variant="secondary"
          >
            {trackingLabel}
          </Chip>
        ) : null}

        <div className="flex shrink-0 items-center">
          <Button
            aria-label={`Move ${name} up`}
            className={ICON_BUTTON_CLASS}
            data-testid="tb-move-up"
            isDisabled={isFirst}
            isIconOnly
            onPress={() => onMove(-1)}
            variant="ghost"
          >
            <ChevronUp />
          </Button>
          <Button
            aria-label={`Move ${name} down`}
            className={ICON_BUTTON_CLASS}
            data-testid="tb-move-down"
            isDisabled={isLast}
            isIconOnly
            onPress={() => onMove(1)}
            variant="ghost"
          >
            <ChevronDown />
          </Button>
          <Button
            aria-label={`Remove ${name}`}
            className={ICON_BUTTON_CLASS}
            data-testid="tb-remove-exercise"
            isIconOnly
            onPress={onRemove}
            variant="ghost"
          >
            <X />
          </Button>
        </div>
      </div>

      {/* One 2px accent rule anchors the whole set group. */}
      <div
        className="mt-1.5 border-accent border-l-2 pl-3"
        data-testid="tb-sets"
      >
        <SetList
          exerciseName={name}
          onOpenSet={onOpenSet}
          onRemoveSet={onRemoveSet}
          sets={element.planned_sets}
          trackingType={trackingType}
        />

        {/* No in-flight guard: set writes are serialised per exercise, so a
            double-press queues two adds instead of racing two payloads. */}
        <Button
          className={`${INLINE_LINK} mt-0.5 py-1 font-btn type-eyebrow`}
          data-testid="tb-add-set"
          onPress={(event) => onAddSet(event.target as HTMLElement)}
          variant="ghost"
        >
          + Add set
        </Button>
      </div>
    </div>
  );
}
