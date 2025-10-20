import {Badge, Card, Group, MantineColor, Stack, Text, useMantineTheme} from '@mantine/core';
import {
    IconBarbell,
    IconFlame,
    IconJumpRope,
    IconOlympics,
    IconRun,
    IconStretching,
    IconTrophy,
} from '@tabler/icons-react';
import React, {FC} from 'react';

import {Content} from '@/store/services/contents';

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

interface ExerciseCardProps {
    content: Content;
    onClick?: () => void;
}

export const ExerciseCard: FC<ExerciseCardProps> = ({content, onClick}) => {
    const theme = useMantineTheme();
    const CategoryIcon = content.exercise_definition?.category
        ? getCategoryIcon(content.exercise_definition.category)
        : IconBarbell;

    const categoryColor = content.exercise_definition?.category
        ? getCategoryColor(content.exercise_definition.category)
        : 'blue';

    // Handle keyboard interactions
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!onClick) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
        }
    };

    return (
        <Card
            onClick={onClick}
            onKeyDown={handleKeyDown}
            radius={0}
            role={onClick ? 'button' : undefined}
            style={{
                cursor: onClick ? 'pointer' : 'default',
                borderBottom: `1px solid ${theme.colors.gray[3]}`,
                transition: 'all 0.15s ease',
            }}
            styles={{
                root: {
                    paddingBlock: 'var(--mantine-spacing-lg)',
                    paddingInline: 'var(--mantine-spacing-lg)',
                    ...(onClick && {
                        '&:hover': {
                            backgroundColor: theme.colors.gray[0],
                            transform: 'translateY(-1px)',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                        },
                        '&:active': {
                            transform: 'translateY(0)',
                            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
                        },
                        '&:focus-visible': {
                            outline: '2px solid var(--mantine-color-brand-6)',
                            outlineOffset: '2px',
                        },
                    }),
                },
            }}
            tabIndex={onClick ? 0 : undefined}
        >
            <Group
                gap="md"
                wrap="nowrap"
            >
                {/* Category Icon */}
                <CategoryIcon
                    color={theme.colors[categoryColor][6]}
                    size={24}
                    stroke={2}
                />

                {/* Main content */}
                <Stack
                    flex={1}
                    gap="sm"
                    style={{minWidth: 0}}
                >
                    {/* Title */}
                    <Text
                        fw={600}
                        lineClamp={1}
                        size="lg"
                        style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {content.name}
                    </Text>

                    {/* Metadata - Primary muscles */}
                    {content.exercise_definition?.primary_muscle &&
                        content.exercise_definition.primary_muscle.length > 0 && (
                            <Group gap="xs">
                                {content.exercise_definition.primary_muscle.slice(0, 2).map((muscle, idx) => (
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
                        )}
                </Stack>
            </Group>
        </Card>
    );
};
