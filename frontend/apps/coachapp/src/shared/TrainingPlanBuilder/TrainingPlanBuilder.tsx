import {ScrollShadow, Spinner, Tabs} from '@heroui/react';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useSearchParams} from 'react-router';

import {type DayOfWeek, useGetTrainingPlan, WEEKDAYS} from '@/services/training_plans';

import DayWorkoutsView from './DayWorkoutsView';

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

const TrainingPlanBuilder = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isUserInteraction = useRef(false);

  const dayFromParams = parseInt(searchParams.get('day_number') || '1', 10) as DayOfWeek;
  const [currentDay, setCurrentDay] = useState<DayOfWeek>(dayFromParams);

  const planId = searchParams.get('training_plan_id');

  const {data: plan, isLoading: queryLoading} = useGetTrainingPlan(planId ?? '', {
    skip: !planId,
  });

  useEffect(() => {
    const paramDay = parseInt(searchParams.get('day_number') || '1', 10) as DayOfWeek;
    if (paramDay !== currentDay && !isUserInteraction.current) {
      setCurrentDay(paramDay);
    }
    isUserInteraction.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleDayChange = (day: DayOfWeek) => {
    isUserInteraction.current = true;
    setCurrentDay(day);
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('day_number', day.toString());
      return newParams;
    });
  };

  const workoutDays = useMemo(() => {
    if (!plan?.workouts) return [];
    const days = new Set<DayOfWeek>();
    plan.workouts.forEach((workout) => {
      days.add(workout.day_number);
    });
    return Array.from(days);
  }, [plan?.workouts]);

  const exerciseNames = useMemo(() => {
    const namesMap: Record<string, string> = {};
    if (plan?.workouts) {
      plan.workouts.forEach((workout) => {
        workout.elements?.forEach((element) => {
          if (element.exercise?.id && element.exercise?.name) {
            namesMap[element.exercise.id] = element.exercise.name;
          }
        });
      });
    }
    return namesMap;
  }, [plan?.workouts]);

  const workoutDaysSet = new Set(workoutDays);
  const days = buildPlanDays(workoutDaysSet);

  return (
    <div className={'flex flex-col w-full h-full overflow-hidden relative'}>
      {queryLoading ? (
        <Spinner />
      ) : (
        <Tabs
          onSelectionChange={(selection) => handleDayChange(Number(selection) as DayOfWeek)}
          selectedKey={currentDay.toString()}
        >
          <ScrollShadow
            className="max-w-[90vw]"
            hideScrollBar
            orientation="horizontal"
            size={12}
          >
            <Tabs.ListContainer className={'w-full max-w-md'}>
              <Tabs.List aria-label="Options">
                {days.map((dayObj) => (
                  <Tabs.Tab
                    className={'px-2 md:px-4'}
                    id={dayObj.dayNumber.toString()}
                    key={'tab-' + dayObj.dayName}
                  >
                    {dayObj.shortName}
                    <Tabs.Indicator />
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>
          </ScrollShadow>
          {days.map((dayObj) => (
            <Tabs.Panel
              className={'p-1 py-4'}
              id={dayObj.dayNumber.toString()}
              key={'panel-' + dayObj.dayName}
            >
              <DayWorkoutsView
                currentDay={currentDay}
                exerciseNames={exerciseNames}
                planId={plan?.id ?? null}
                workouts={plan?.workouts ?? []}
              />
            </Tabs.Panel>
          ))}
        </Tabs>
      )}
    </div>
  );
};

export default TrainingPlanBuilder;
