/**
 * The training builder's header region (badge TB) — everything above the
 * exercise stack, in two rows:
 *
 *   [workout tabs] [+ Workout]                  ← which workout, and add one
 *   [Mon..Sun chips] ............ [Rename] [🗑] ← when it runs, and act on it
 *   Edits apply to all of them.                 ← only when it runs on 2+ days
 *
 * This mirrors the nutrition day header, and the important part of that mirror
 * is a SUBTRACTION: the workout name is said once, in its tab. The screen used
 * to repeat it as a heading directly under the tab that already carried it, and
 * to spell out "Scheduled: Mon, Thu" beside the very chips that show it.
 *
 * Because the name lives in the tab, renaming replaces the TAB ROW with a text
 * field — the same move the nutrition day tabs make. A just-created workout
 * opens straight into it (INTERACTIONS.md § TB).
 *
 * Two actions do not earn an overflow menu, so Rename and delete are their own
 * controls at the end of the chip row (deliberate placement — user decision,
 * 2026-08-06; do not fold them into a ⋯ menu). Below `sm` the chips (288px)
 * and the actions cannot share 343px, so the actions wrap to their own line
 * and `ms-auto` keeps them right-aligned under the chips.
 */
import {Button, Input, TextField, Typography} from '@heroui/react';
import {TrashIcon} from 'lucide-react';
import {useState} from 'react';
import type {Day} from '@/library/training-plans/builder/schedule';
import {WorkoutTabs} from '@/library/training-plans/builder/workout-tabs';
import {AS_ICON_BUTTON} from '@/ui/ua-defaults';
import {WeekdayChips} from '@/ui/weekday-chips';

interface WorkoutHeaderProps {
  name: string;
  scheduledDays: Day[];
  /** A just-created workout opens straight into rename (INTERACTIONS.md § TB). */
  autoRename: boolean;
  onRename: (name: string) => void;
  onRenameSettled: () => void;
  /** Opens the confirm — deleting a workout takes its exercises with it. */
  onRequestDelete: () => void;
  onToggleDay: (day: Day, isSelected: boolean) => void;
  tabs: React.ComponentProps<typeof WorkoutTabs>;
}

export function WorkoutHeader({
  autoRename,
  name,
  onRename,
  onRenameSettled,
  onRequestDelete,
  onToggleDay,
  scheduledDays,
  tabs,
}: WorkoutHeaderProps) {
  // `null` is "not editing". Seeding the draft only on entry means there is no
  // prop-to-state sync effect to get wrong.
  const [draft, setDraft] = useState<string | null>(autoRename ? name : null);

  const settle = (next?: string) => {
    setDraft(null);
    onRenameSettled();
    const trimmed = next?.trim();
    if (trimmed && trimmed !== name) {
      onRename(trimmed);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* The tabs are navigation; the hairline fences them off from the
          selected workout's content below (chips, actions, cards). */}
      <div
        className="flex min-w-0 items-center gap-2 border-border border-b pb-3"
        data-testid="tb-tabs-row"
      >
        {draft === null ? (
          <WorkoutTabs {...tabs} />
        ) : (
          <>
            <TextField
              aria-label="Workout name"
              autoFocus
              className="min-w-0 flex-1"
              onChange={setDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  settle(draft);
                } else if (e.key === 'Escape') {
                  settle();
                }
              }}
              value={draft}
            >
              <Input
                data-testid="tb-rename-input"
                onBlur={() => settle(draft)}
              />
            </TextField>
            <Button
              className="shrink-0"
              data-testid="tb-rename-save"
              onPress={() => settle(draft)}
              size="sm"
              variant="primary"
            >
              Save
            </Button>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <WeekdayChips
          onToggle={onToggleDay}
          ownerName={name}
          selected={scheduledDays}
          testIdPrefix="tb"
        />

        {/* Outlined chips, same language as the nutrition day-menu trigger:
            border-border + text-muted + rounded-chip (user pick, 2026-08-06). */}
        <div className="ms-auto flex shrink-0 items-center gap-1.5">
          <Button
            className="shrink-0 rounded-chip border border-border bg-transparent px-3 type-eyebrow font-semibold text-muted"
            data-testid="tb-rename-workout"
            onPress={() => setDraft(name)}
            size="sm"
            variant="outline"
          >
            Rename
          </Button>
          <Button
            aria-label={`Delete ${name}`}
            className={`shrink-0 rounded-chip border border-border bg-transparent text-danger ${AS_ICON_BUTTON}`}
            data-testid="tb-delete-workout"
            isIconOnly
            onPress={onRequestDelete}
            size="sm"
            variant="outline"
          >
            <TrashIcon />
          </Button>
        </div>
      </div>

      {/* INTERACTIONS.md § TB — a workout on several weekdays is edited in one
          place. The chips say WHICH days; this says what editing them means, so
          it only appears when there is more than one. */}
      {scheduledDays.length > 1 ? (
        <Typography
          className="text-muted-2"
          data-testid="tb-multi-day-note"
          type="body-xs"
        >
          Edits apply to all of them.
        </Typography>
      ) : null}
    </div>
  );
}
