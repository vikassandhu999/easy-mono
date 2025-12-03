import {LoadingOverlay} from '@mantine/core';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useSearchParams} from 'react-router';

import {type DayOfWeek, useGetTrainingPlan} from '@/services/training_plans';

import DayWorkoutsView from './DayWorkoutsView';
import WeekSelector from './WeekSelector';

const TrainingPlanBuilder = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const isUserInteraction = useRef(false);

    // Read day from params, default to 1 (Monday)
    const dayFromParams = parseInt(searchParams.get('day_number') || '1', 10) as DayOfWeek;
    const [currentDay, setCurrentDay] = useState<DayOfWeek>(dayFromParams);

    const planId = searchParams.get('training_plan_id');

    const {data: plan, isLoading: queryLoading} = useGetTrainingPlan(planId ?? '', {
        skip: !planId,
    });

    // Sync currentDay with URL params when changed externally
    useEffect(() => {
        const paramDay = parseInt(searchParams.get('day_number') || '1', 10) as DayOfWeek;
        if (paramDay !== currentDay && !isUserInteraction.current) {
            setCurrentDay(paramDay);
        }
        isUserInteraction.current = false;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // Update URL when day changes
    const handleDayChange = (day: DayOfWeek) => {
        isUserInteraction.current = true;
        setCurrentDay(day);
        setSearchParams((prev) => {
            const newParams = new URLSearchParams(prev);
            newParams.set('day_number', day.toString());
            return newParams;
        });
    };

    // Get all days that have workouts for visual indicator
    const workoutDays = useMemo(() => {
        if (!plan?.workouts) return [];
        const days = new Set<DayOfWeek>();
        plan.workouts.forEach((workout) => {
            days.add(workout.day_number);
        });
        return Array.from(days);
    }, [plan?.workouts]);

    // Build exercise names map from workouts
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
            <WeekSelector
                currentDay={currentDay}
                onSelect={handleDayChange}
                workoutDays={workoutDays}
            />
            <div
                style={{
                    flex: 1,
                    overflow: 'auto',
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                <DayWorkoutsView
                    currentDay={currentDay}
                    exerciseNames={exerciseNames}
                    planId={plan?.id ?? null}
                    workouts={plan?.workouts ?? []}
                />
            </div>
        </div>
    );
};

export default TrainingPlanBuilder;
