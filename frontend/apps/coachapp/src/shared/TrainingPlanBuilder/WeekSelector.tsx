import {ScrollArea, Text, UnstyledButton} from '@mantine/core';
import {useEffect, useRef} from 'react';

import classes from './styles.module.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

type PlanDay = {
    id: string;
    day: number;
    weekNumber: number;
    dayOfWeek: number; // 0-6 (Sun-Sat)
    weekdayName: string;
    hasWorkouts: boolean;
};

const buildPlanDays = (weeks: number, workoutDaysSet: Set<number>): PlanDay[] => {
    return Array.from({length: weeks * 7}, (_, i) => ({
        id: `day-${i + 1}`,
        day: i + 1,
        weekNumber: Math.ceil((i + 1) / 7),
        dayOfWeek: i % 7,
        weekdayName: WEEKDAYS[i % 7],
        hasWorkouts: workoutDaysSet.has(i + 1), // Check if this day number has workouts
    }));
};

type WeekSelectorProps = {
    weeks: number;
    currentDay: number;
    onSelect: (day: number) => void;
    shouldAutoScroll?: boolean;
    workoutDays?: number[]; // Day numbers that have workouts (1, 2, 3, etc.)
};

const WeekSelector = ({weeks, currentDay, onSelect, shouldAutoScroll = true, workoutDays = []}: WeekSelectorProps) => {
    const workoutDaysSet = new Set(workoutDays);
    const days = buildPlanDays(weeks, workoutDaysSet);
    const currentWeek = Math.ceil(currentDay / 7);
    const currentWeekday = WEEKDAYS[(currentDay - 1) % 7];

    const scrollViewportRef = useRef<HTMLDivElement>(null);
    const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
    const previousDay = useRef<number>(currentDay);

    useEffect(() => {
        if (!shouldAutoScroll || previousDay.current === currentDay) {
            previousDay.current = currentDay;
            return;
        }

        const selectedButton = buttonRefs.current.get(currentDay);
        if (selectedButton && scrollViewportRef.current) {
            selectedButton.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center',
            });
        }

        previousDay.current = currentDay;
    }, [currentDay, shouldAutoScroll]);

    // Group days by week
    const daysByWeek = days.reduce(
        (acc, day) => {
            const week = day.weekNumber;
            if (!acc[week]) acc[week] = [];
            acc[week].push(day);
            return acc;
        },
        {} as Record<number, typeof days>,
    );

    return (
        <div className={classes.weekSelectorContainer}>
            {/* Header */}
            <div className={classes.weekSelectorHeader}>
                <div>
                    <Text className={classes.weekSelectorTitle}>
                        {currentWeekday}, Day {currentDay}
                    </Text>
                </div>
                <Text className={classes.weekSelectorSubtitle}>
                    Week {currentWeek} of {weeks}
                </Text>
            </div>

            {/* Week-based day selector */}
            <ScrollArea
                className={classes.dayScrollbar}
                offsetScrollbars={false}
                scrollbarSize={0}
                type="scroll"
                viewportRef={scrollViewportRef}
            >
                <div className={classes.weeksContainer}>
                    {Object.entries(daysByWeek).map(([week, weekDays]) => {
                        return (
                            <div
                                className={classes.weekGroup}
                                key={week}
                            >
                                <Text className={classes.weekLabel}>Week {week}</Text>
                                <div className={classes.weekDays}>
                                    {weekDays.map((dayObj) => {
                                        const isActive = dayObj.day === currentDay;
                                        const hasWorkouts = dayObj.hasWorkouts;

                                        let className = isActive ? classes.dayCardActive : classes.dayCard;

                                        if (hasWorkouts) {
                                            className += ` ${classes.dayCardHasWorkouts}`;
                                        }

                                        return (
                                            <UnstyledButton
                                                aria-label={`${dayObj.weekdayName}, Day ${dayObj.day}${hasWorkouts ? ', has workouts' : ''}`}
                                                aria-pressed={isActive}
                                                className={className}
                                                key={dayObj.day}
                                                onClick={() => onSelect(dayObj.day)}
                                                ref={(el) => {
                                                    if (el) buttonRefs.current.set(dayObj.day, el);
                                                }}
                                            >
                                                <span className={classes.dayCardWeekday}>{dayObj.weekdayName}</span>
                                                <span className={classes.dayCardNumber}>{dayObj.day}</span>
                                            </UnstyledButton>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
};

export default WeekSelector;
