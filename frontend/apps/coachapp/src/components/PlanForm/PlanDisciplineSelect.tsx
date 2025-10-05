import {ActionIcon, Box, Card, Center, Group, Stack, Text} from '@mantine/core';
import {CaretRightIcon} from '@phosphor-icons/react';

import {PlanDiscipline} from '@/api/plans';

import {PLAN_DISCIPLINES} from '../Configs';

interface PlanDisciplineSelectProps {
    onSelect: (discipline: PlanDiscipline) => void;
}

const PlanDisciplineSelect = ({onSelect}: PlanDisciplineSelectProps) => {
    const entries = Object.entries(PLAN_DISCIPLINES) as Array<
        [PlanDiscipline, (typeof PLAN_DISCIPLINES)[PlanDiscipline]]
    >;

    return (
        <Stack gap={'sm'}>
            {entries.map(([discipline, config]) => {
                const IconComponent = config.icon;

                return (
                    <Card
                        aria-label={`Select ${config.label}: ${config.description}`}
                        key={discipline}
                        onClick={() => onSelect(discipline)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onSelect(discipline);
                            }
                        }}
                        role="button"
                        style={{
                            borderRadius: 'var(--body-offset)',
                            cursor: 'pointer',
                            paddingBottom: 'var(--ce-size-md)',
                            paddingInline: 'var(--ce-size-md)',
                            paddingTop: 'var(--body-offset)',
                        }}
                        tabIndex={0}
                        withBorder
                    >
                        <Group
                            align="center"
                            justify="space-between"
                            wrap={'nowrap'}
                        >
                            <Group
                                gap={'md'}
                                style={{flex: 1, minWidth: 0}}
                                wrap={'nowrap'}
                            >
                                <Center
                                    h={48}
                                    style={{
                                        backgroundColor: config.color || 'var(--mantine-color-brand-1)',
                                        borderRadius: 12,
                                        flexShrink: 0,
                                    }}
                                    w={48}
                                >
                                    <IconComponent
                                        color={config.iconColor || 'var(--mantine-color-brand-6)'}
                                        size={24}
                                    />
                                </Center>
                                <Box style={{flex: 1, gap: 0, minWidth: 0}}>
                                    <Text
                                        c={'dark'}
                                        style={{
                                            color: 'var(--mantine-color-gray-9)',
                                            fontSize: 'var(--body-font-size)',
                                            fontWeight: 600,
                                            lineHeight: 'var(--body-line-height)',
                                        }}
                                    >
                                        {config.label}
                                    </Text>
                                    <Text
                                        c={'dark'}
                                        style={{
                                            color: 'var(--mantine-color-gray-9)',
                                            fontSize: 'var(--callout-font-size)',
                                            fontWeight: 400,
                                            lineHeight: 'var(--callout-line-height)',
                                        }}
                                    >
                                        {config.description}
                                    </Text>
                                </Box>
                            </Group>

                            <ActionIcon
                                color={'gray'}
                                size={'lg'}
                                style={{flexShrink: 0}}
                                variant={'subtle'}
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

export default PlanDisciplineSelect;
