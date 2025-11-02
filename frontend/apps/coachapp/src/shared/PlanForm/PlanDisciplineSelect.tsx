import {Avatar, Card, Group, Stack, Text, useMantineTheme} from '@mantine/core';
import {IconChevronRight} from '@tabler/icons-react';

import {PlanDiscipline} from '@/services/plans';

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
        <Stack
            px="sm"
            py="lg"
        >
            <Stack gap="sm">
                <Text
                    fw={600}
                    size="lg"
                >
                    Choose plan type
                </Text>
                <Text
                    c="dimmed"
                    size="sm"
                >
                    Select a plan category to tailor the setup to your client's goals.
                </Text>
            </Stack>

            {entries.map(([discipline, config]) => {
                const IconComponent = config.icon;

                return (
                    <Card
                        component="button"
                        key={discipline}
                        onClick={() => onSelect(discipline)}
                        p="lg"
                        radius="lg"
                        style={{
                            cursor: 'pointer',
                        }}
                        withBorder
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
                                    align="start"
                                    gap="xs"
                                    justify="start"
                                    style={{flex: 1, minWidth: 0}}
                                    ta="left"
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
                                        ta="left"
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
                    </Card>
                );
            })}
        </Stack>
    );
};

export default PlanDisciplineSelect;
