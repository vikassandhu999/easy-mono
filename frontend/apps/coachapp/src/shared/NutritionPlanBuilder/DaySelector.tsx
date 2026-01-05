import {ScrollArea, Text, UnstyledButton} from '@mantine/core';
import {useEffect, useRef} from 'react';

import classes from './styles.module.css';

// Weekday names matching ISO weekday (1=Mon, 7=Sun)
const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

// Build 7 days for the weekly nutrition plan (day_number 1-7)
const buildWeekDays = () => {
  return Array.from({length: 7}, (_, i) => ({
    id: `day-${i + 1}`,
    day: i + 1, // 1-7 (ISO weekday)
    weekdayName: WEEKDAY_NAMES[i],
  }));
};

type DaySelectorProps = {
  currentDay: number;
  onSelect: (day: number) => void;
  shouldAutoScroll?: boolean;
};

const DaySelector = ({currentDay, onSelect, shouldAutoScroll = true}: DaySelectorProps) => {
  const days = buildWeekDays();
  // Ensure currentDay is within 1-7 range
  const normalizedDay = ((currentDay - 1) % 7) + 1;
  const currentWeekday = WEEKDAY_NAMES[normalizedDay - 1];

  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const previousDay = useRef<number>(normalizedDay);

  useEffect(() => {
    if (!shouldAutoScroll || previousDay.current === normalizedDay) {
      previousDay.current = normalizedDay;
      return;
    }

    const selectedButton = buttonRefs.current.get(normalizedDay);
    if (selectedButton && scrollViewportRef.current) {
      selectedButton.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }

    previousDay.current = normalizedDay;
  }, [normalizedDay, shouldAutoScroll]);

  return (
    <div className={classes.daySelectorContainer}>
      {/* Header */}
      <div className={classes.daySelectorHeader}>
        <Text className={classes.daySelectorTitle}>{currentWeekday}</Text>
        <Text className={classes.daySelectorSubtitle}>Weekly Plan</Text>
      </div>

      {/* Weekday selector (7 days) */}
      <ScrollArea
        className={classes.dayScrollbar}
        offsetScrollbars={false}
        scrollbarSize={0}
        type="scroll"
        viewportRef={scrollViewportRef}
      >
        <div className={classes.weeksContainer}>
          <div className={classes.weekDays}>
            {days.map((dayObj) => {
              const isActive = dayObj.day === normalizedDay;
              return (
                <UnstyledButton
                  aria-label={dayObj.weekdayName}
                  aria-pressed={isActive}
                  className={isActive ? classes.dayCardActive : classes.dayCard}
                  key={dayObj.day}
                  onClick={() => onSelect(dayObj.day)}
                  ref={(el) => {
                    if (el) buttonRefs.current.set(dayObj.day, el);
                  }}
                >
                  <span className={classes.dayCardWeekday}>{dayObj.weekdayName}</span>
                </UnstyledButton>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default DaySelector;
