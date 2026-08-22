/**
 * The nutrition builder's header region (badge NB) — everything above the
 * energy line, the same two rows as the training builder's WorkoutHeader
 * (user decision 2026-08-06: the two builder headers are one UI):
 *
 *   [day tabs] [+ Day]                          ← which day, and add one
 *   [Mon..Sun chips] ............ [Rename] [🗑] ← when it applies, act on it
 *   Edits apply to all of them.                 ← only when on 2+ weekdays
 *
 * The day name is said once, in its tab; renaming replaces the tab row with a
 * text field. Rename and delete are their own controls at the end of the chip
 * row — deliberate placement (user decision, 2026-08-06; never fold them into
 * a ⋯ menu). Below `sm` the chips and the actions cannot share the width, so
 * the actions wrap to their own line and `ms-auto` right-aligns them.
 */

import type {TrainingWeekday} from '@easy/utils';
import {Button, Input, TextField, Typography} from '@heroui/react';
import {TrashIcon} from 'lucide-react';
import {useState} from 'react';
import {DayTabs} from '@/nutrition-plans/builder/day-tabs';
import {AS_ICON_BUTTON} from '@/ui/ua-defaults';
import {WeekdayChips} from '@/ui/weekday-chips';

interface DayHeaderProps {
  name: string;
  /** Weekdays this day is assigned to. */
  assignedDays: readonly string[];
  onRename: (name: string) => void;
  /** Opens the confirm — deleting a day may strand its weekdays. */
  onRequestDelete: () => void;
  /** A weekday belongs to exactly one day, so only turning one ON is
      meaningful — the command layer moves it off whoever held it. */
  onScheduleWeekday: (weekday: TrainingWeekday) => void;
  tabs: React.ComponentProps<typeof DayTabs>;
}

export function DayHeader({assignedDays, name, onRename, onRequestDelete, onScheduleWeekday, tabs}: DayHeaderProps) {
  // `null` is "not editing". Seeding the draft only on entry means there is no
  // prop-to-state sync effect to get wrong.
  const [draft, setDraft] = useState<string | null>(null);

  const settle = (next?: string) => {
    setDraft(null);
    const trimmed = next?.trim();
    if (trimmed && trimmed !== name) {
      onRename(trimmed);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* The tabs are navigation; the hairline fences them off from the
          selected day's content below (chips, actions, meals). */}
      <div
        className="flex min-w-0 items-center gap-2 border-border border-b pb-3"
        data-testid="nb-daytabs-row"
      >
        {draft === null ? (
          <DayTabs {...tabs} />
        ) : (
          <>
            <TextField
              aria-label="Day name"
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
                data-testid="nb-rename-input"
                onBlur={() => settle(draft)}
              />
            </TextField>
            <Button
              className="shrink-0"
              data-testid="nb-rename-save"
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
          onToggle={(weekday, isSelected) => {
            // Turning one OFF would leave the weekday with no day at all, so
            // the `false` case is deliberately ignored (GAPS #8).
            if (isSelected) {
              onScheduleWeekday(weekday);
            }
          }}
          ownerName={name}
          selected={assignedDays}
          testIdPrefix="nb"
        />

        {/* Outlined chips, same as the training builder's pair (user pick,
            2026-08-06): border-border, muted Rename, danger delete. */}
        <div className="ms-auto flex shrink-0 items-center gap-1.5">
          <Button
            className="shrink-0 rounded-chip border border-border bg-transparent px-3 type-eyebrow font-semibold text-muted"
            data-testid="nb-rename-day"
            onPress={() => setDraft(name)}
            size="sm"
            variant="outline"
          >
            Rename
          </Button>
          <Button
            aria-label={`Delete ${name}`}
            className={`shrink-0 rounded-chip border border-border bg-transparent text-danger ${AS_ICON_BUTTON}`}
            data-testid="nb-delete-day"
            isIconOnly
            onPress={onRequestDelete}
            size="sm"
            variant="outline"
          >
            <TrashIcon />
          </Button>
        </div>
      </div>

      {/* A day on several weekdays is edited in one place. The chips say WHICH
          days; this says what editing them means, so it only appears when
          there is more than one. */}
      {assignedDays.length > 1 ? (
        <Typography
          className="text-muted-2"
          data-testid="nb-multi-day-note"
          type="body-xs"
        >
          Edits apply to all of them.
        </Typography>
      ) : null}
    </div>
  );
}
