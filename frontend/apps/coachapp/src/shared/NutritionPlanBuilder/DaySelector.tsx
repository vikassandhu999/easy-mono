import {Group, Text, UnstyledButton, useMantineTheme} from '@mantine/core';
import {IconPoint} from '@tabler/icons-react';
import {useEffect, useRef} from 'react';

import styles from './styles.module.css';

const buildPlanDays = (weeks: number) => {
    return Array.from({length: weeks * 7}, (_, i) => ({
        id: `day-${i + 1}`,
        day: i + 1,
    }));
};

type DaySelectorProps = {
    weeks: number;
    currentDay: number;
    onSelect: (day: number) => void;
    shouldAutoScroll?: boolean; // New prop to control auto-scroll
};

const DaySelector = ({weeks, currentDay, onSelect, shouldAutoScroll = true}: DaySelectorProps) => {
    const theme = useMantineTheme();
    const days = buildPlanDays(weeks);

    const scrollViewportRef = useRef<HTMLDivElement>(null);
    const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
    const previousDay = useRef<number>(currentDay);

    useEffect(() => {
        // Only auto-scroll if:
        // 1. shouldAutoScroll is true (not a user click)
        // 2. Day actually changed
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

    return (
        <Group
            bg="white"
            className={styles.dayScrollbar}
            gap="xs"
            maw="100%"
            pb="xs"
            ref={scrollViewportRef}
            style={{
                overflowX: 'scroll',
            }}
            w="100%"
            wrap="nowrap"
        >
            {days.map((day) => {
                const isSelected = currentDay === day.day;
                return (
                    <UnstyledButton
                        key={day.id}
                        onClick={() => onSelect(day.day)}
                        ref={(el) => {
                            if (el) {
                                buttonRefs.current.set(day.day, el);
                            }
                        }}
                        style={{
                            minWidth: '72px',
                            padding: theme.spacing.xs,
                            borderRadius: theme.radius.md,
                            border: `2px solid ${isSelected ? theme.colors.blue[6] : theme.colors.gray[3]}`,
                            backgroundColor: isSelected ? theme.colors.blue[0] : 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 150ms ease',
                            flexShrink: 0,
                        }}
                    >
                        <Text
                            c={isSelected ? 'blue.7' : 'dimmed'}
                            size="xs"
                            tt="uppercase"
                        >
                            Day
                        </Text>
                        <Text
                            c={isSelected ? 'blue.7' : 'dark.9'}
                            fw={isSelected ? 600 : 500}
                        >
                            {day.day}
                        </Text>
                        <IconPoint
                            color={isSelected ? theme.colors.blue[4] : theme.colors.gray[4]}
                            size={24}
                        />
                    </UnstyledButton>
                );
            })}
        </Group>
    );
};

export default DaySelector;
