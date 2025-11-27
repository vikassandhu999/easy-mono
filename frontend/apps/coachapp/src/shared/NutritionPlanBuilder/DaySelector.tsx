import {ScrollArea, Text, UnstyledButton} from '@mantine/core';
import {useEffect, useRef} from 'react';

import classes from './styles.module.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const buildPlanDays = (weeks: number) => {
    return Array.from({length: weeks * 7}, (_, i) => ({
        id: `day-${i + 1}`,
        day: i + 1,
        weekNumber: Math.ceil((i + 1) / 7),
        weekdayIndex: i % 7, // 0 = Sun, 1 = Mon, etc.
        weekdayName: WEEKDAYS[i % 7],
    }));
};

type DaySelectorProps = {
    weeks: number;
    currentDay: number;
    onSelect: (day: number) => void;
    shouldAutoScroll?: boolean;
};

const DaySelector = ({weeks, currentDay, onSelect, shouldAutoScroll = true}: DaySelectorProps) => {
    const days = buildPlanDays(weeks);
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
        <div className={classes.daySelectorContainer}>
            {/* Header */}
            <div className={classes.daySelectorHeader}>
                <Text className={classes.daySelectorTitle}>
                    {currentWeekday}, Day {currentDay}
                </Text>
                <Text className={classes.daySelectorSubtitle}>
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
                    {Object.entries(daysByWeek).map(([week, weekDays]) => (
                        <div
                            className={classes.weekGroup}
                            key={week}
                        >
                            <Text className={classes.weekLabel}>Week {week}</Text>
                            <div className={classes.weekDays}>
                                {weekDays.map((dayObj) => {
                                    const isActive = dayObj.day === currentDay;
                                    return (
                                        <UnstyledButton
                                            aria-label={`${dayObj.weekdayName}, Day ${dayObj.day}`}
                                            aria-pressed={isActive}
                                            className={isActive ? classes.dayCardActive : classes.dayCard}
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
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};

export default DaySelector;
