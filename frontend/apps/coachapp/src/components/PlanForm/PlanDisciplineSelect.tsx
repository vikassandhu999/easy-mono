import {Avatar, Group, Stack, Text, UnstyledButton, useMantineTheme} from '@mantine/core';
import {IconChevronRight} from '@tabler/icons-react';

import {PlanDiscipline} from '@/store/services/plans';

import {PLAN_DISCIPLINES} from '../Configs';

interface PlanDisciplineSelectProps {
    onSelect: (discipline: PlanDiscipline) => void;
}

const PlanDisciplineSelect = ({onSelect}: PlanDisciplineSelectProps) => {
    const theme = useMantineTheme();
    const entries = Object.entries(PLAN_DISCIPLINES) as Array<
        [PlanDiscipline, (typeof PLAN_DISCIPLINES)[PlanDiscipline]]
    >;

    return (
        <Stack gap="md">
            {entries.map(([discipline, config]) => {
                const IconComponent = config.icon;

                return (
                    <UnstyledButton
                        key={discipline}
                        onClick={() => onSelect(discipline)}
                        p="lg"
                        style={{
                            backgroundColor: 'var(--mantine-color-white)',
                            border: `1px solid ${theme.colors.gray[3]}`,
                            borderRadius: theme.radius.md,
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                            cursor: 'pointer',
                            display: 'block',
                            textAlign: 'left',
                            transition: 'all 150ms ease',
                            width: '100%',
                        }}
                        styles={{
                            root: {
                                '&:hover': {
                                    borderColor: theme.colors.gray[4],
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                                    transform: 'translateY(-2px)',
                                },
                                '&:active': {
                                    transform: 'translateY(0)',
                                },
                                '&:focus-visible': {
                                    outline: `2px solid ${theme.colors.brand[5]}`,
                                    outlineOffset: '2px',
                                    borderColor: theme.colors.brand[5],
                                    boxShadow: '0 0 0 4px rgba(31, 106, 255, 0.12)',
                                },
                            },
                        }}
                    >
                        <Group
                            align="center"
                            gap="md"
                            justify="space-between"
                            wrap="nowrap"
                        >
                            <Group
                                gap="md"
                                style={{flex: 1, minWidth: 0}}
                                wrap="nowrap"
                            >
                                <Avatar
                                    color={config.color}
                                    radius="xl"
                                    size="lg"
                                    variant="light"
                                >
                                    <IconComponent size={24} />
                                </Avatar>

                                <Stack
                                    gap="xs"
                                    style={{flex: 1, minWidth: 0}}
                                >
                                    <Text
                                        fw={600}
                                        size="md"
                                    >
                                        {config.label} plan
                                    </Text>
                                    <Text
                                        c="dimmed"
                                        size="sm"
                                        style={{lineHeight: 1.5}}
                                    >
                                        {config.description}
                                    </Text>
                                </Stack>
                            </Group>

                            <IconChevronRight
                                color={theme.colors.gray[5]}
                                size={20}
                                stroke={2}
                                style={{flexShrink: 0}}
                            />
                        </Group>
                    </UnstyledButton>
                );
            })}
        </Stack>
    );
};

export default PlanDisciplineSelect;
