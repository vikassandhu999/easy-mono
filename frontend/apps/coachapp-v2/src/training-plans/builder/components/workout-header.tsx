/**
 * The active workout's header row: name (rename in place) · weekday chips · ⋯.
 * The three children are ordered by CSS, not a breakpoint hook: below `sm` the
 * chips wrap onto their own scrolling line (seven 44px targets don't fit beside
 * the name at 390px) with the ⋯ staying beside the name; from `sm` the row is
 * name · chips · ⋯. One menu node either way.
 */
import {Button, Dropdown, Label, Separator} from '@heroui/react';
import {MoreHorizontal, TrashIcon} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';

import {AS_ICON_BUTTON} from '@/@components/ua-defaults';
import {WeekdayChips} from '@/builder-kit/weekday-chips';

import type {Day} from '../schedule';

interface WorkoutHeaderProps {
  name: string;
  scheduledDays: Day[];
  /** A just-created workout opens straight into rename mode (INTERACTIONS.md § TB). */
  autoRename: boolean;
  onRename: (name: string) => void;
  onRenameSettled: () => void;
  onDelete: () => void;
  onToggleDay: (day: Day, isSelected: boolean) => void;
}

export function WorkoutHeader({
  name,
  scheduledDays,
  autoRename,
  onRename,
  onRenameSettled,
  onDelete,
  onToggleDay,
}: WorkoutHeaderProps) {
  // `null` is "not editing". Seeding the draft only on entry means there is no
  // prop-to-state sync effect to get wrong.
  const [draft, setDraft] = useState<string | null>(autoRename ? name : null);

  const settle = (nextName?: string) => {
    setDraft(null);
    onRenameSettled();
    if (nextName && nextName !== name) {
      onRename(nextName);
    }
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2 px-4 pt-3 pb-3 sm:flex-nowrap sm:gap-3"
      data-testid="tb-card-header"
    >
      {draft === null ? (
        <span
          className="order-1 min-w-0 flex-1 truncate font-grotesk type-heading font-semibold tracking-name text-foreground"
          data-testid="tb-workout-name"
        >
          {name}
        </span>
      ) : (
        <InlineRename
          onCancel={() => settle()}
          onChange={setDraft}
          onCommit={() => settle(draft.trim())}
          value={draft}
        />
      )}

      <div className="order-2 shrink-0 sm:order-3">
        <Dropdown>
          <Button
            aria-label={`Workout options for ${name}`}
            className={`size-11 shrink-0 rounded-chip bg-transparent text-muted sm:size-7.5 ${AS_ICON_BUTTON}`}
            data-testid="tb-workout-menu-btn"
            isIconOnly
            variant="ghost"
          >
            <MoreHorizontal />
          </Button>
          <Dropdown.Popover>
            {/* Selection is driven by the menu so it fires on pointer AND
                keyboard activation — RAC routes Enter/Space through onAction,
                not the item's onPress. */}
            <Dropdown.Menu
              onAction={(key) => {
                if (key === 'rename-workout') {
                  setDraft(name);
                } else {
                  onDelete();
                }
              }}
            >
              <Dropdown.Section>
                <Dropdown.Item
                  id="rename-workout"
                  textValue="Rename workout"
                >
                  <Label>Rename workout</Label>
                </Dropdown.Item>
              </Dropdown.Section>
              <Separator />
              <Dropdown.Section>
                <Dropdown.Item
                  id="delete-workout"
                  textValue="Delete workout"
                  variant="danger"
                >
                  <div className="flex items-center gap-2">
                    <TrashIcon className="shrink-0 text-danger" />
                    <Label>Delete workout</Label>
                  </div>
                </Dropdown.Item>
              </Dropdown.Section>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>

      <div className="-mx-1 order-3 w-full min-w-0 overflow-x-auto px-1 py-0.5 sm:order-2 sm:mx-0 sm:w-auto sm:overflow-visible sm:p-0">
        <WeekdayChips
          onToggle={onToggleDay}
          ownerName={name}
          selected={scheduledDays}
          testIdPrefix="tb"
        />
      </div>
    </div>
  );
}

/**
 * Mounted only while renaming, which is what lets the select-all run once in an
 * effect instead of on a timer.
 */
function InlineRename({
  value,
  onChange,
  onCommit,
  onCancel,
}: {
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  // Enter and Escape both unmount this input, and some browsers fire blur on a
  // removed node — so the exit runs at most once whichever way it is reached.
  const hasExited = useRef(false);

  useEffect(() => {
    ref.current?.select();
  }, []);

  const exit = (leave: () => void) => {
    if (!hasExited.current) {
      hasExited.current = true;
      leave();
    }
  };

  return (
    <input
      ref={ref}
      aria-label="Workout name"
      className="order-1 min-w-0 flex-1 border-accent border-b bg-transparent py-0.5 font-grotesk type-heading font-semibold text-foreground outline-none [border-bottom-width:1.5px]"
      data-testid="tb-rename-input"
      onBlur={() => exit(onCommit)}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          exit(onCommit);
        } else if (event.key === 'Escape') {
          exit(onCancel);
        }
      }}
      value={value}
    />
  );
}
