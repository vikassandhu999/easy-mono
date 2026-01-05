import {UnstyledButton} from '@mantine/core';
import {useEffect, useRef} from 'react';

import {type DayOfWeek, WEEKDAYS} from '@/services/training_plans';

import classes from './styles.module.css';

type PlanDay = {
  id: string;
  dayNumber: DayOfWeek;
  dayName: string;
  shortName: string;
  hasWorkouts: boolean;
};

const SHORT_DAY_NAMES: Record<DayOfWeek, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

const buildPlanDays = (workoutDaysSet: Set<number>): PlanDay[] => {
  return WEEKDAYS.map((day) => ({
    id: `day-${day.value}`,
    dayNumber: day.value,
    dayName: day.label,
    shortName: SHORT_DAY_NAMES[day.value],
    hasWorkouts: workoutDaysSet.has(day.value),
  }));
};

type WeekSelectorProps = {
  currentDay: DayOfWeek;
  onSelect: (day: DayOfWeek) => void;
  shouldAutoScroll?: boolean;
  workoutDays?: DayOfWeek[]; // Day numbers that have workouts (1-7)
};

const WeekSelector = ({currentDay, onSelect, workoutDays = []}: WeekSelectorProps) => {
  const workoutDaysSet = new Set(workoutDays);
  const days = buildPlanDays(workoutDaysSet);

  const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const previousDay = useRef<number>(currentDay);

  useEffect(() => {
    previousDay.current = currentDay;
  }, [currentDay]);

  return (
    <div className={classes.weekSelectorContainer}>
      {/* Day selector - all 7 days visible */}
      <div className={classes.weekDaysRow}>
        {days.map((dayObj) => {
          const isActive = dayObj.dayNumber === currentDay;
          const hasWorkouts = dayObj.hasWorkouts;

          let className = isActive ? classes.dayCardActive : classes.dayCard;

          if (hasWorkouts) {
            className += ` ${classes.dayCardHasWorkouts}`;
          }

          return (
            <UnstyledButton
              aria-label={`${dayObj.dayName}${hasWorkouts ? ', has workouts' : ''}`}
              aria-pressed={isActive}
              className={className}
              key={dayObj.dayNumber}
              onClick={() => onSelect(dayObj.dayNumber)}
              ref={(el) => {
                if (el) buttonRefs.current.set(dayObj.dayNumber, el);
              }}
            >
              <span className={classes.dayCardWeekday}>{dayObj.shortName}</span>
            </UnstyledButton>
          );
        })}
      </div>
    </div>
  );
};

export default WeekSelector;
