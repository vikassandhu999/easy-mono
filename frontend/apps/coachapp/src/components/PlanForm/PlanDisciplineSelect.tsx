import {ActionIcon, Avatar, Box, Group, Stack, Text, UnstyledButton, useMantineTheme} from '@mantine/core';
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
        <Stack gap="sm">
            {entries.map(([discipline, config]) => {
                const IconComponent = config.icon;

                return (
                    <UnstyledButton
                        key={discipline}
                        onClick={() => onSelect(discipline)}
                        style={{width: '100%'}}
                    >
                        <Box
                            p="md"
                            style={{
                                backgroundColor: 'white',
                                borderRadius: theme.radius.lg,
                                border: `1px dotted ${theme.colors.gray[3]}`,
                                transition: 'all 0.15s ease',
                                cursor: 'pointer',
                            }}
                        >
                            <Group
                                align="flex-start"
                                gap="sm"
                                justify="space-between"
                                wrap="nowrap"
                            >
                                <Avatar
                                    color={config.color}
                                    radius="xl"
                                    size="md"
                                    variant="light"
                                >
                                    <IconComponent size={20} />
                                </Avatar>

                                <Group
                                    gap="sm"
                                    style={{flex: 1, minWidth: 0}}
                                    wrap="nowrap"
                                >
                                    <Stack
                                        gap={2}
                                        style={{flex: 1, minWidth: 0}}
                                    >
                                        <Group
                                            gap="xs"
                                            wrap="nowrap"
                                        >
                                            <Text
                                                fw={600}
                                                size="md"
                                            >
                                                {config.label}
                                            </Text>
                                        </Group>
                                        <Text
                                            c="dimmed"
                                            size="xs"
                                            style={{
                                                lineHeight: 1.4,
                                            }}
                                        >
                                            {config.description}
                                        </Text>
                                    </Stack>

                                    {/* Arrow CTA Indicator */}
                                    <ActionIcon
                                        color="gray"
                                        radius="xl"
                                        size="xl"
                                        variant="light"
                                    >
                                        <IconChevronRight
                                            size={18}
                                            stroke={2.5}
                                        />
                                    </ActionIcon>
                                </Group>
                            </Group>
                        </Box>
                    </UnstyledButton>
                );
            })}
        </Stack>
    );
};

export default PlanDisciplineSelect;
