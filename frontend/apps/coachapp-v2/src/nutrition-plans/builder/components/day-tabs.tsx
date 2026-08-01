/**
 * DayTabs — the day switcher: one toggle per day, `+ Day`, and the ⋯ menu with
 * Rename/Delete. Renaming swaps the tab row for an inline input; the rename
 * itself goes up through `onRename`, which reports whether it stuck so the
 * input can fall back to the server name when it didn't.
 */
import {Button, Dropdown, Label, Separator, ToggleButton, ToggleButtonGroup} from '@heroui/react';
import {MoreHorizontal} from 'lucide-react';
import {useEffect, useState} from 'react';

import {AS_ICON_BUTTON} from '@/@components/ua-defaults';
import type {NutritionPlanDay} from '@/api/nutrition-plan-builder';
import {INLINE_LINK} from '@/builder-kit/ui';

interface DayTabsProps {
  days: NutritionPlanDay[];
  activeDay: NutritionPlanDay;
  onSelect: (dayId: string) => void;
  onAdd: () => void;
  creating: boolean;
  /** Resolves to whether the rename stuck. */
  onRename: (name: string) => Promise<boolean>;
  onRequestDelete: () => void;
}

export function DayTabs({days, activeDay, onSelect, onAdd, creating, onRename, onRequestDelete}: DayTabsProps) {
  // Inline rename state for the active day.
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(activeDay.name);
  useEffect(() => {
    if (!editingName) {
      setNameValue(activeDay.name);
    }
  }, [activeDay.name, editingName]);

  const commitRename = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === activeDay.name) {
      setEditingName(false);
      setNameValue(activeDay.name);
      return;
    }
    setEditingName(false);
    const ok = await onRename(trimmed);
    if (!ok) {
      setNameValue(activeDay.name);
    }
  };

  return (
    <div className="flex min-w-0 items-center gap-2">
      {editingName ? (
        <div
          className="flex flex-1 items-center gap-2"
          data-testid="nb-rename-row"
        >
          <input
            // biome-ignore lint/a11y/noAutofocus: the day name opens in editing mode on user intent
            autoFocus
            aria-label="Day name"
            className="h-11 min-w-0 flex-1 rounded-control border border-accent bg-surface px-3 font-btn type-body font-semibold text-foreground outline-none sm:h-9.5"
            data-testid="nb-rename-input"
            onChange={(e) => setNameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitRename().catch(() => undefined);
              } else if (e.key === 'Escape') {
                setEditingName(false);
                setNameValue(activeDay.name);
              }
            }}
            value={nameValue}
          />
          <Button
            className="shrink-0 rounded-control border-0 bg-accent px-3 font-btn type-body font-semibold leading-none text-accent-foreground [row-gap:normal] [column-gap:normal]"
            data-testid="nb-rename-save"
            onPress={() => {
              commitRename().catch(() => undefined);
            }}
            size="sm"
          >
            Save
          </Button>
        </div>
      ) : (
        <ToggleButtonGroup
          aria-label="Plan days"
          className="flex flex-wrap gap-2"
          data-testid="nb-daytabs"
          isDetached
          onSelectionChange={(keys) => {
            const next = [...keys][0];
            if (next) {
              onSelect(String(next));
            }
          }}
          selectedKeys={[activeDay.id]}
          selectionMode="single"
        >
          {days.map((day) => (
            <ToggleButton
              className="toggle-button--ink"
              data-testid={day.id === activeDay.id ? 'nb-daytab-on' : 'nb-daytab-off'}
              id={day.id}
              key={day.id}
            >
              {day.name}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}

      <Button
        className={`${INLINE_LINK} shrink-0 px-1.5 type-eyebrow`}
        data-testid="nb-add-day"
        isPending={creating}
        onPress={onAdd}
        size="sm"
        variant="ghost"
      >
        + Day
      </Button>

      <Dropdown>
        <Button
          aria-label="Day options"
          className={`size-11  shrink-0 rounded-chip border border-border bg-transparent text-muted  sm:size-7.5  ${AS_ICON_BUTTON}`}
          data-testid="nb-day-menu-btn"
          isIconOnly
          size="sm"
          variant="outline"
        >
          <MoreHorizontal />
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu
            onAction={(key) => {
              if (key === 'rename-day') {
                setEditingName(true);
              } else if (key === 'delete-day') {
                onRequestDelete();
              }
            }}
          >
            <Dropdown.Section>
              <Dropdown.Item
                id="rename-day"
                textValue="Rename day"
              >
                <Label>Rename day</Label>
              </Dropdown.Item>
            </Dropdown.Section>
            <Separator />
            <Dropdown.Section>
              <Dropdown.Item
                id="delete-day"
                textValue="Delete day"
                variant="danger"
              >
                <Label>Delete day</Label>
              </Dropdown.Item>
            </Dropdown.Section>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}
