import {Badge, Card, Group, MantineColor, Stack, Text, ThemeIcon} from '@mantine/core';
import {
    IconBarbell,
    IconFlame,
    IconJumpRope,
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
    const CategoryIcon = content.exercise_definition?.category
        ? getCategoryIcon(content.exercise_definition.category)
        : IconBarbell;

    return (
        <Card
            bg="gray.0"
            onClick={onClick}
            padding={0}
            radius="xl"
            role={onClick ? 'button' : undefined}
            shadow="xs"
            style={{
                cursor: 'pointer',
                overflow: 'hidden',
            }}
            tabIndex={onClick ? 0 : undefined}
            withBorder
        >
            <Group
                align="stretch"
                gap={0}
                wrap="nowrap"
            >
                {/* Left icon section */}
                <Stack
                    align="center"
                    gap={0}
                    justify="center"
                    style={{
                        width: 56,
                        minHeight: '100%',
                    }}
                >
                    <ThemeIcon
                        color={
                            content.exercise_definition?.category
                                ? getCategoryColor(content.exercise_definition.category)
                                : 'blue'
                        }
                        radius="xl"
                        size={40}
                        variant="light"
                    >
                        <CategoryIcon
                            size={22}
                            stroke={2}
                        />
                    </ThemeIcon>
                </Stack>

                {/* Main content */}
                <Stack
                    flex={1}
                    gap="xs"
                    p="md"
                >
                    {/* Title row */}
                    <Group
                        align="center"
                        gap="xs"
                        wrap="nowrap"
                    >
                        <Text
                            c="dark.9"
                            fw={600}
                            lineClamp={1}
                            size="md"
                            style={{flex: 1}}
                        >
                            {content.name}
                        </Text>
                    </Group>

                    {/* Metadata row */}
                    <Group gap="xs">
                        {content.exercise_definition?.primary_muscle &&
                            content.exercise_definition.primary_muscle.slice(0, 2).map((muscle, idx) => (
                                <Badge
                                    color="gray"
                                    key={idx}
                                    radius="xl"
                                    size="sm"
                                    variant="dot"
                                >
                                    {muscle}
                                </Badge>
                            ))}
                    </Group>
                </Stack>
            </Group>
        </Card>
    );
};
