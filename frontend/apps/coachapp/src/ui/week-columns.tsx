import {type ReactNode, useState, useSyncExternalStore} from 'react';
import {Tab, TabList, TabPanel, Tabs} from './tabs';
import {type Day, weekdays} from './week';

const wide = '(min-width: 80rem)';
const subscribe = (notify: () => void) => {
  const query = window.matchMedia(wide);
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
};
const columnClass = 'flex min-w-0 flex-col gap-2 rounded-2xl bg-muted p-2';

export function WeekColumns({children}: {children: (day: Day) => ReactNode}) {
  const [shown, setShown] = useState<number>(weekdays[0].bit);
  const isWide = useSyncExternalStore(subscribe, () => window.matchMedia(wide).matches);
  return isWide ? (
    <ol className="grid grid-cols-7 gap-2">
      {weekdays.map((day) => (
        <li
          key={day.bit}
          aria-label={day.long}
          className={columnClass}
        >
          <h2 className="px-1 text-base font-semibold">{day.long}</h2>
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
            className="-mb-px flex min-h-11 items-center justify-center border-b-2 border-transparent text-sm font-medium text-muted-foreground data-selected:border-foreground data-selected:font-semibold data-selected:text-foreground"
          >
            {day.short}
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
