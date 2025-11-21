import {LoadingOverlay, Stack} from '@mantine/core';
import {useEffect, useRef, useState} from 'react';
import {useSearchParams} from 'react-router';

import {useGetNutritionPlan} from '@/services/nutrition_plans';

import DayMealsView from './DayMealsView';
import DaySelector from './DaySelector';

const NutritionPlanBuilder = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const isUserInteraction = useRef(false); // Track if change is from user click

    // Read day from params, default to 1
    const dayFromParams = parseInt(searchParams.get('day_number') || '1', 10);
    const [currentDay, setCurrentDay] = useState<number>(dayFromParams);

    const planId = searchParams.get('nutrition_plan_id');

    const {data: plan, isLoading: queryLoading} = useGetNutritionPlan(planId, {
        skip: !planId,
    });

    // Sync currentDay with URL params ONLY when changed externally (browser nav, etc.)
    useEffect(() => {
        const paramDay = parseInt(searchParams.get('day_number') || '1', 10);
        if (paramDay !== currentDay && !isUserInteraction.current) {
            setCurrentDay(paramDay);
        }
        // Reset flag after sync
        isUserInteraction.current = false;
    }, [searchParams]);

    // Update URL when day changes
    const handleDayChange = (day: number) => {
        isUserInteraction.current = true; // Mark as user interaction
        setCurrentDay(day);
        setSearchParams((prev) => {
            const newParams = new URLSearchParams(prev);
            newParams.set('day_number', day.toString());
            return newParams;
        });
    };

    return (
        <Stack style={{width: '100%', overflow: 'hidden', position: 'relative'}}>
            <LoadingOverlay visible={queryLoading} />
            <DaySelector
                currentDay={currentDay}
                onSelect={handleDayChange}
                shouldAutoScroll={!isUserInteraction.current}
                weeks={plan?.duration_weeks ?? 3}
            />
            <DayMealsView
                currentDay={currentDay}
                meals={plan?.meals || []}
                planId={plan?.id ?? null}
            />
        </Stack>
    );
};

export default NutritionPlanBuilder;
