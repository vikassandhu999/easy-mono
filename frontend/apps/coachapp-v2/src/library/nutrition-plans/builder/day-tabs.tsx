/**
 * The day switcher: one tab per day, then `+ Day` — the mirror of the training
 * builder's WorkoutTabs. Rename and delete of the active day live in
 * DayHeader, which also swaps this row for the rename field; this component
 * switches, reorders, and adds.
 */
import {Button, ToggleButton, ToggleButtonGroup} from '@heroui/react';
import {ChevronLeft, ChevronRight, Plus} from 'lucide-react';
import type {NutritionPlanDay} from '@/library/nutrition-plans/builder/plan-tree';
import {AS_ICON_BUTTON} from '@/ui/ua-defaults';

interface DayTabsProps {
  days: NutritionPlanDay[];
  activeDayId: string;
  onSelect: (dayId: string) => void;
  onAdd: () => void;
  isAdding: boolean;
  onMove?: (direction: -1 | 1) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function DayTabs({days, activeDayId, onSelect, onAdd, isAdding, onMove, isFirst, isLast}: DayTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 pb-0.5 sm:flex-nowrap sm:overflow-x-auto">
      {days.length > 0 ? (
        <ToggleButtonGroup
          aria-label="Plan days"
          className="flex flex-wrap gap-2 sm:flex-nowrap"
          data-testid="nb-daytabs"
          isDetached
          onSelectionChange={(keys) => {
            const next = [...keys][0];
            if (next) {
              onSelect(String(next));
            }
          }}
          selectedKeys={[activeDayId]}
          selectionMode="single"
        >
          {days.map((day) => (
            <ToggleButton
              className="shrink-0 toggle-button--ink"
              data-testid={day.id === activeDayId ? 'nb-daytab-on' : 'nb-daytab-off'}
              id={day.id}
              key={day.id}
            >
              {day.name}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      ) : null}

      {onMove ? (
        <div className="flex shrink-0 items-center">
          <Button
            aria-label="Move day left"
            className={`shrink-0 rounded-chip bg-transparent text-muted sm:size-7 ${AS_ICON_BUTTON}`}
            data-testid="nb-move-day-left"
            {...(isFirst != null ? {isDisabled: isFirst} : {})}
            isIconOnly
            onPress={() => onMove(-1)}
            size="sm"
            variant="ghost"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            aria-label="Move day right"
            className={`shrink-0 rounded-chip bg-transparent text-muted sm:size-7 ${AS_ICON_BUTTON}`}
            data-testid="nb-move-day-right"
            {...(isLast != null ? {isDisabled: isLast} : {})}
            isIconOnly
            onPress={() => onMove(1)}
            size="sm"
            variant="ghost"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      ) : null}

      <Button
        className="shrink-0 gap-1 rounded-control border border-dashed border-border bg-transparent px-3 font-btn type-eyebrow font-semibold leading-none text-accent"
        data-testid="nb-add-day"
        isPending={isAdding}
        onPress={onAdd}
        variant="ghost"
      >
        <Plus className="size-3.5" />
        Day
      </Button>
    </div>
  );
}
