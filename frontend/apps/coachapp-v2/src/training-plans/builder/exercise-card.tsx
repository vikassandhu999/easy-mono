/**
 * One exercise in the active workout (badge TB), rendered as a builder card —
 * the same object the nutrition builder draws for a meal on a day:
 *
 *   [tracking tag] [name · set count]                    [▲] [▼] [⋯]
 *   ─────────────────────────────────────────────────────────────────
 *   the exercise's sets, then `+ Add set`
 *
 * It used to be a divider-separated row inside one big workout card. A workout
 * has exercises the way a day has meals, so it gets the same treatment: the
 * surface comes from `.disclosure--builder`, and the workout card around the
 * stack is gone, because a nutrition day has no card around its meals either.
 *
 * Two things follow from the card shape rather than from taste:
 *
 * - The name is the disclosure trigger, and the ⋯ / reorder buttons are its
 *   SIBLINGS, never its children — a button cannot nest inside a button. The
 *   meal card is laid out the same way for the same reason.
 * - Reorder stays as visible ▲▼ controls in the header instead of moving into
 *   the ⋯ menu. Explicit up/down is the decision recorded in GAPS.md #11 (no
 *   drag handles, no DnD library); burying it one level down would quietly
 *   walk that back.
 */
import {Button, Chip, Disclosure, Dropdown, Label} from '@heroui/react';
import {ChevronDown, ChevronUp, MoreHorizontal} from 'lucide-react';
import {useState} from 'react';
import type {TrainingPlanWorkoutExercise} from '@/api/training-plan-builder';
import {SetList} from '@/training-plans/builder/set-list';
import {trackingTypeLabel} from '@/training-plans/builder/tracking';
import {INLINE_LINK, TAG} from '@/ui/builder-tokens';
import {AS_ICON_BUTTON, NO_GAP} from '@/ui/ua-defaults';

/** Height comes from the control block; only the shape is written here. */
const ICON_BUTTON = `shrink-0 rounded-chip bg-transparent text-muted sm:size-7 ${AS_ICON_BUTTON}`;

interface ExerciseCardProps {
  element: TrainingPlanWorkoutExercise;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onOpenSet: (index: number, anchor: HTMLElement) => void;
  onAddSet: (anchor: HTMLElement) => void;
  onRemoveSet: (index: number) => void;
}

export function ExerciseCard({
  element,
  isFirst,
  isLast,
  onAddSet,
  onMove,
  onOpenSet,
  onRemove,
  onRemoveSet,
}: ExerciseCardProps) {
  const name = element.exercise?.name ?? '—';
  const trackingType = element.exercise?.tracking_type ?? null;
  const trackingLabel = trackingTypeLabel(trackingType);
  const setCount = element.planned_sets.length;
  // Open by default: sets are what the coach came to edit, unlike a meal card
  // where the collapsed summary is usually the answer. Each card is
  // independent — there is no "one open at a time" rule to hoist to the parent,
  // and the panel remounts per workout, so switching workouts resets this.
  const [isExpanded, setExpanded] = useState(true);

  return (
    <Disclosure
      className="disclosure--builder"
      data-testid="tb-exercise-card"
      isExpanded={isExpanded}
      onExpandedChange={setExpanded}
    >
      {/* Below `sm` the name takes its own line (`order-last w-full`) so it is
          not squeezed to nothing between the tag and the action cluster. */}
      <div
        className="flex flex-wrap items-center gap-3 px-3 py-3"
        data-testid="tb-exercise-head"
      >
        {trackingLabel ? (
          <Chip
            className={`${TAG} ${NO_GAP} shrink-0 text-foreground`}
            data-testid="tb-track-chip"
            size="sm"
            variant="secondary"
          >
            {trackingLabel}
          </Chip>
        ) : null}

        <Disclosure.Heading className="order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
          <Disclosure.Trigger className="flex w-full items-center gap-3 text-left">
            <span
              className="min-w-0 flex-1 truncate type-body font-semibold text-foreground"
              data-testid="tb-exercise-name"
            >
              {name}
            </span>
            <span
              className="shrink-0 whitespace-nowrap type-eyebrow text-muted"
              data-testid="tb-set-count"
            >
              {setCount} set{setCount === 1 ? '' : 's'}
            </span>
          </Disclosure.Trigger>
        </Disclosure.Heading>

        <div className="flex shrink-0 items-center">
          <Button
            aria-label={`Move ${name} up`}
            className={ICON_BUTTON}
            isDisabled={isFirst}
            isIconOnly
            onPress={() => onMove(-1)}
            size="sm"
            variant="ghost"
          >
            <ChevronUp />
          </Button>
          <Button
            aria-label={`Move ${name} down`}
            className={ICON_BUTTON}
            isDisabled={isLast}
            isIconOnly
            onPress={() => onMove(1)}
            size="sm"
            variant="ghost"
          >
            <ChevronDown />
          </Button>
          <Dropdown>
            <Button
              aria-label={`Exercise options for ${name}`}
              className={ICON_BUTTON}
              data-testid="tb-exercise-menu-btn"
              isIconOnly
              size="sm"
              variant="ghost"
            >
              <MoreHorizontal />
            </Button>
            <Dropdown.Popover>
              {/* Selection is driven from the menu, not each item's onPress, so
                  it fires on keyboard activation too (same as plan-actions). */}
              <Dropdown.Menu onAction={onRemove}>
                <Dropdown.Section>
                  <Dropdown.Item
                    id="remove-exercise"
                    textValue="Remove exercise"
                    variant="danger"
                  >
                    <Label>Remove exercise</Label>
                  </Dropdown.Item>
                </Dropdown.Section>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </div>

      <Disclosure.Content>
        <div className="border-t border-border px-3 pt-1.5 pb-2">
          {/* The 2px accent rule down the set group is TB's own — a meal has no
              equivalent grouping, and it is what makes a long set list scan as
              one exercise's. */}
          <div className="border-accent border-l-2 pl-3">
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
              onPress={(event) => event.target instanceof HTMLElement && onAddSet(event.target)}
              variant="ghost"
            >
              + Add set
            </Button>
          </div>
        </div>
      </Disclosure.Content>
    </Disclosure>
  );
}
