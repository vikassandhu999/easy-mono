import {LoadingOverlay} from '@mantine/core';
import {useEffect, useRef, useState} from 'react';
import {useSearchParams} from 'react-router';

import {useGetNutritionPlan} from '@/services/nutrition_plans';

import DayMealsView from './DayMealsView';
import DaySelector from './DaySelector';

const NutritionPlanBuilder = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isUserInteraction = useRef(false);

  // Read day from params, default to 1
  const dayFromParams = parseInt(searchParams.get('day_number') || '1', 10);
  const [currentDay, setCurrentDay] = useState<number>(dayFromParams);

  const planId = searchParams.get('nutrition_plan_id');

  const {data: plan, isLoading: queryLoading} = useGetNutritionPlan(planId as string, {
    skip: !planId,
  });

  // Sync currentDay with URL params when changed externally
  useEffect(() => {
    const paramDay = parseInt(searchParams.get('day_number') || '1', 10);
    if (paramDay !== currentDay && !isUserInteraction.current) {
      setCurrentDay(paramDay);
    }
    isUserInteraction.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Update URL when day changes
  const handleDayChange = (day: number) => {
    isUserInteraction.current = true;
    setCurrentDay(day);
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('day_number', day.toString());
      return newParams;
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--surface-secondary)',
      }}
    >
      <LoadingOverlay visible={queryLoading} />
      <DaySelector
        currentDay={currentDay}
        onSelect={handleDayChange}
        shouldAutoScroll={!isUserInteraction.current}
      />
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <DayMealsView
          currentDay={currentDay}
          meals={plan?.meals || []}
          planId={plan?.id ?? null}
        />
      </div>
    </div>
  );
};

export default NutritionPlanBuilder;
