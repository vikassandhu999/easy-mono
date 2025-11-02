import {Group, ScrollArea, Text, UnstyledButton, useMantineTheme} from '@mantine/core';
import {useMediaQuery} from '@mantine/hooks';
import {FC, useEffect, useRef} from 'react';

import {Plan} from '@/services/plans';

export const WEEKDAYS: Record<number, string> = {
    0: 'Monday',
    1: 'Tuesday',
    2: 'Wednesday',
    3: 'Thursday',
    4: 'Friday',
    5: 'Saturday',
    6: 'Sunday',
};

export const SHORT_WEEKDAYS: Record<number, string> = {
    0: 'Mon',
    1: 'Tue',
    2: 'Wed',
    3: 'Thu',
    4: 'Fri',
    5: 'Sat',
    6: 'Sun',
};

type PlanWeekDayTabssProps = {
    plan: Plan;
    weekday: number;
    onWeekdayChange: (weekday: number) => void;
};

const PlanWeekDayTabs: FC<PlanWeekDayTabssProps> = (props) => {
    const {plan, weekday: selectedWeekday, onWeekdayChange} = props;

    const theme = useMantineTheme();
    const isSmallScreen = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

    // Automatically scrolls the selected weekday button into the center of the view
    // when the `selectedWeekday` state changes.

    const scrollViewportRef = useRef<HTMLDivElement>(null);
    const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

    useEffect(() => {
        const selectedButton = buttonRefs.current.get(selectedWeekday);
        if (selectedButton && scrollViewportRef.current) {
            selectedButton.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center',
            });
        }
    }, [selectedWeekday]);

    if (plan.recurrence !== 'weekly') {
        return null;
    }

    return (
        <ScrollArea
            offsetScrollbars={false}
            styles={{
                root: {
                    width: '100%',
                },
                viewport: {
                    paddingBottom: '4px',
                },
                scrollbar: {
                    display: 'none', // Hide scrollbar completely
                },
            }}
            type="scroll"
            viewportRef={scrollViewportRef}
        >
            <Group
                gap="xs"
                pb="xs"
                wrap="nowrap"
            >
                {Object.entries(WEEKDAYS).map(([value, label]) => {
                    const dayValue = Number(value);
                    const isSelected = selectedWeekday === dayValue;
                    const displayLabel = isSmallScreen ? SHORT_WEEKDAYS[dayValue] : label;

                    return (
                        <UnstyledButton
                            aria-label={`Select ${label}`}
                            aria-pressed={isSelected}
                            key={value}
                            onClick={() => onWeekdayChange(dayValue)}
                            ref={(el) => {
                                if (el) {
                                    buttonRefs.current.set(dayValue, el);
                                }
                            }}
                            role="button"
                            style={{
                                minWidth: isSmallScreen ? '56px' : '110px',
                                height: '48px',
                                padding: '12px 16px',
                                borderRadius: theme.radius.md,
                                border: `2px solid ${isSelected ? theme.colors.brand[6] : theme.colors.gray[3]}`,
                                backgroundColor: isSelected ? theme.colors.brand[0] : 'transparent',
                                transition: 'all 150ms ease',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                            tabIndex={0}
                        >
                            <Text
                                c={isSelected ? 'brand.7' : 'dark.9'}
                                fw={isSelected ? 600 : 500}
                                size="sm"
                                style={{
                                    whiteSpace: 'nowrap',
                                    userSelect: 'none',
                                    lineHeight: 1.5,
                                }}
                            >
                                {displayLabel}
                            </Text>
                        </UnstyledButton>
                    );
                })}
            </Group>
        </ScrollArea>
    );
};

export default PlanWeekDayTabs;
