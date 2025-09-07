import {Text, Center, Box, Card, Group, Stack, ActionIcon} from '@mantine/core';
import {CaretRightIcon} from '@phosphor-icons/react';
import {ScheduleCategory} from '@/Api/Schedules';
import {SCHEDULE_CATEGORIES} from '../Configs';

interface ScheduleCategorySelectProps {
    onSelect: (category: ScheduleCategory) => void;
}

const ScheduleCategorySelect = ({onSelect}: ScheduleCategorySelectProps) => {
    return (
        <Stack gap={'sm'}>
            {Object.keys(SCHEDULE_CATEGORIES).map((key) => {
                const config = SCHEDULE_CATEGORIES[key];
                const IconComponent = config.icon;

                return (
                    <Card
                        key={key}
                        withBorder
                        style={{
                            cursor: 'pointer',
                            borderRadius: 'var(--body-offset)',
                            paddingTop: 'var(--body-offset)',
                            paddingInline: 'var(--ce-size-md)',
                            paddingBottom: 'var(--ce-size-md)',
                        }}
                        onClick={() => onSelect(key as any)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Select ${config.label}: ${config.description}`}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onSelect(key as any);
                            }
                        }}
                    >
                        <Group
                            justify="space-between"
                            align="center"
                            wrap={'nowrap'}
                        >
                            <Group
                                gap={'md'}
                                wrap={'nowrap'}
                                style={{flex: 1, minWidth: 0}}
                            >
                                <Center
                                    w={48}
                                    h={48}
                                    style={{
                                        backgroundColor: config.color || 'var(--mantine-color-brand-1)',
                                        borderRadius: 12,
                                        flexShrink: 0,
                                    }}
                                >
                                    <IconComponent
                                        size={24}
                                        color={config.iconColor || 'var(--mantine-color-brand-6)'}
                                    />
                                </Center>
                                <Box style={{flex: 1, minWidth: 0, gap: 0}}>
                                    <Text
                                        c={'dark'}
                                        style={{
                                            fontSize: 'var(--body-font-size)',
                                            lineHeight: 'var(--body-line-height)',
                                            color: 'var(--mantine-color-gray-9)',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {config.label}
                                    </Text>
                                    <Text
                                        c={'dark'}
                                        style={{
                                            fontSize: 'var(--callout-font-size)',
                                            lineHeight: 'var(--callout-line-height)',
                                            color: 'var(--mantine-color-gray-9)',
                                            fontWeight: 400,
                                        }}
                                    >
                                        {config.description}
                                    </Text>
                                </Box>
                            </Group>

                            <ActionIcon
                                variant={'subtle'}
                                color={'gray'}
                                size={'lg'}
                                style={{flexShrink: 0}}
                            >
                                <CaretRightIcon size={20} />
                            </ActionIcon>
                        </Group>
                    </Card>
                );
            })}
        </Stack>
    );
};

export default ScheduleCategorySelect;
