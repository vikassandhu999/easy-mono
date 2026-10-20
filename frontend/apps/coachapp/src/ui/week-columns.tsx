import {type ReactNode, useState, useSyncExternalStore} from 'react';
import {cn} from './cn';
import {Tab, TabList, TabPanel, Tabs} from './tabs';
import {type Day, weekdays} from './week';

const wide = '(min-width: 80rem)';
const subscribe = (notify: () => void) => {
  const query = window.matchMedia(wide);
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
};
const columnClass = 'flex min-w-0 flex-col gap-2 rounded-2xl bg-muted p-2';

export function WeekColumns({
  children,
  defaultDay = weekdays[0].bit,
  today,
}: {
  children: (day: Day) => ReactNode;
  defaultDay?: number;
  // The weekday bit of today, marked so session actions in that column make sense.
  today?: number;
}) {
  const [shown, setShown] = useState<number>(defaultDay);
  const isWide = useSyncExternalStore(subscribe, () => window.matchMedia(wide).matches);
  return isWide ? (
    <ol className="grid grid-cols-7 gap-2">
      {weekdays.map((day) => (
        <li
          key={day.bit}
          aria-label={day.long}
          aria-current={day.bit === today ? 'date' : undefined}
          className={cn(columnClass, day.bit === today && 'ring-2 ring-foreground')}
        >
          <h2 className="flex items-baseline justify-between gap-2 px-1 text-base font-semibold">
            {day.long}
            {day.bit === today && <span className="text-sm font-medium text-muted-foreground">Today</span>}
          </h2>
          {children(day)}
        </li>
      ))}
    </ol>
  ) : (
    <Tabs
      selectedKey={String(shown)}
      onSelectionChange={(key) => setShown(Number(key))}
    >
      <TabList
        aria-label="Day"
        className="grid grid-cols-7 border-b border-border"
      >
        {weekdays.map((day) => (
          <Tab
            key={day.bit}
            id={String(day.bit)}
            aria-label={day.long}
            aria-current={day.bit === today ? 'date' : undefined}
            className="-mb-px flex min-h-11 flex-col items-center justify-center border-b-2 border-transparent text-sm font-medium text-muted-foreground data-selected:border-foreground data-selected:font-semibold data-selected:text-foreground"
          >
            {day.short}
            {day.bit === today && (
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-foreground"
              />
            )}
          </Tab>
        ))}
      </TabList>
      {weekdays.map((day) => (
        <TabPanel
          key={day.bit}
          id={String(day.bit)}
          className={`${columnClass} mt-3`}
        >
          {children(day)}
        </TabPanel>
      ))}
    </Tabs>
  );
}
