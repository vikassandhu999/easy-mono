import {Badge, Card, Group, MantineColor, Stack, Text, ThemeIcon, useMantineTheme} from '@mantine/core';
import {
    IconBarbell,
    IconFlame,
    IconJumpRope,
    IconMedal,
    IconOlympics,
    IconRun,
    IconStretching,
    IconTrophy,
} from '@tabler/icons-react';
import {FC} from 'react';

import {Content} from '@/api/contents';

const CATEGORY_COLORS: MantineColor[] = ['blue', 'green', 'orange', 'grape'];

const getCategoryColor = (category: string): MantineColor => {
    const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
};

const CATEGORY_ICONS: Record<string, any> = {
    strength: IconBarbell,
    cardio: IconRun,
    plyometric: IconJumpRope,
    stretching: IconStretching,
    olympic: IconOlympics,
    powerlifting: IconTrophy,
    strongman: IconFlame,
};

const getCategoryIcon = (category: string) => {
    return CATEGORY_ICONS[category] || IconBarbell;
};

const levelColors = {
    beginner: 'green',
    intermediate: 'yellow',
    expert: 'red',
};

interface ExerciseCardProps {
    content: Content;
    onClick?: () => void;
}

export const ExerciseCard: FC<ExerciseCardProps> = ({content, onClick}) => {
    const theme = useMantineTheme();

    return (
        <Card
            // bg="gray.1"
            onClick={onClick}
            px="xs"
            py="sm"
            radius="lg"
            role={onClick ? 'button' : undefined}
            shadow="lg"
            style={{
                cursor: 'pointer',
                border: `1px dashed ${theme.colors.gray[4]} `,
            }}
            tabIndex={onClick ? 0 : undefined}
        >
            <Group align="flex-start">
                <ThemeIcon
                    radius="lg"
                    size="xl"
                    variant="light"
                >
                    <IconBarbell />
                </ThemeIcon>

                <Stack
                    flex={1}
                    gap="xs"
                >
                    <Text
                        fw="semi-bold"
                        size="lg"
                    >
                        {content.name}
                    </Text>
                    {content.exercise_definition?.category && (
                        <Group>
                            <Badge
                                color={getCategoryColor(content.exercise_definition.category)}
                                leftSection={(() => {
                                    const Icon = getCategoryIcon(content.exercise_definition.category);
                                    return <Icon size={12} />;
                                })()}
                                radius="lg"
                                size="xs"
                                variant="light"
                            >
                                {content.exercise_definition.category}
                            </Badge>
                        </Group>
                    )}
                    <Group>
                        {content.exercise_definition?.primary_muscle &&
                            content.exercise_definition.primary_muscle.map((v, idx) => {
                                return (
                                    <Badge
                                        color="gray"
                                        key={idx}
                                        radius="lg"
                                        size="xs"
                                        variant="dot"
                                    >
                                        {v}
                                    </Badge>
                                );
                            })}
                    </Group>
                </Stack>

                {content.exercise_definition?.level && (
                    <Badge
                        color={levelColors[content.exercise_definition.level]}
                        leftSection={<IconMedal size={14} />}
                        radius="lg"
                        size="xs"
                        variant="light"
                    >
                        {content.exercise_definition.level}
                    </Badge>
                )}
            </Group>
        </Card>
    );
};
