import {Group, ScrollArea, Text, UnstyledButton, useMantineTheme} from '@mantine/core';
import {useMediaQuery} from '@mantine/hooks';
import {FC, useEffect, useRef, useState} from 'react';

import {Plan} from '@/store/services/plans';

import {SHORT_WEEKDAYS, WEEKDAYS} from './constants';

type PlanBuilderWeekDaysProps = {
    plan: Plan;
};

const PlanBuilderWeekDays: FC<PlanBuilderWeekDaysProps> = ({plan}) => {
    const [selectedWeekday, setSelectedWeekday] = useState<number>(0);
    const theme = useMantineTheme();
    const isSmallScreen = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
    const scrollViewportRef = useRef<HTMLDivElement>(null);
    const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

    // Auto-scroll selected day into view
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
                            onClick={() => setSelectedWeekday(dayValue)}
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

export default PlanBuilderWeekDays;
