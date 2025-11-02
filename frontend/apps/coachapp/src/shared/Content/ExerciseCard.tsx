/**
 * Exercise Card Component
 *
 * Displays exercise content in a list format optimized for coaches.
 * Shows key information needed for quick scanning and selection.
 *
 * UX Focus:
 * - Exercise name (primary)
 * - Category and level (for quick filtering/context)
 * - Primary muscles (what it targets)
 * - Equipment needed (important for program building)
 */

import {Badge, Card, Group, Stack, Text, useMantineTheme} from '@mantine/core';
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

import {Content} from '@/services/contents';

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
    return CATEGORY_ICONS[category.toLowerCase()] || IconBarbell;
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

    // Handle keyboard interactions
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!onClick) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
        }
    };

    const category = content.exercise_definition?.category;
    const level = content.exercise_definition?.level;
    const primaryMuscles = content.exercise_definition?.primary_muscle || [];
    const equipment = content.exercise_definition?.equipment || [];

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
                justify="space-between"
                wrap="nowrap"
            >
                <Group
                    gap="md"
                    style={{flex: 1, minWidth: 0}}
                    wrap="nowrap"
                >
                    {/* Category Icon */}
                    <CategoryIcon
                        color={theme.colors.blue[6]}
                        size={24}
                        stroke={2}
                        style={{flexShrink: 0}}
                    />

                    {/* Main content */}
                    <Stack
                        flex={1}
                        gap="xs"
                        style={{minWidth: 0}}
                    >
                        {/* Exercise name */}
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

                        {/* Metadata Row 1: Category & Level (most important for context) */}
                        <Group gap="xs">
                            {category && (
                                <Badge
                                    color="blue"
                                    radius="xl"
                                    size="sm"
                                    styles={{
                                        label: {
                                            textTransform: 'capitalize',
                                            fontWeight: 500,
                                        },
                                    }}
                                    variant="light"
                                >
                                    {category}
                                </Badge>
                            )}

                            {level && (
                                <Badge
                                    color="gray"
                                    radius="xl"
                                    size="sm"
                                    styles={{
                                        label: {
                                            textTransform: 'capitalize',
                                            fontWeight: 500,
                                        },
                                    }}
                                    variant="dot"
                                >
                                    {level}
                                </Badge>
                            )}
                        </Group>

                        {/* Metadata Row 2: Muscles & Equipment */}
                        {(primaryMuscles.length > 0 || equipment.length > 0) && (
                            <Group gap="xs">
                                {/* Primary muscles - show up to 2 */}
                                {primaryMuscles.slice(0, 2).map((muscle, idx) => (
                                    <Badge
                                        color="gray"
                                        key={`muscle-${idx}`}
                                        radius="xl"
                                        size="sm"
                                        styles={{
                                            label: {
                                                textTransform: 'capitalize',
                                                fontWeight: 400,
                                            },
                                        }}
                                        variant="outline"
                                    >
                                        {muscle}
                                    </Badge>
                                ))}

                                {/* Equipment - show first one if exists */}
                                {equipment.length > 0 && (
                                    <Badge
                                        color="gray"
                                        radius="xl"
                                        size="sm"
                                        styles={{
                                            label: {
                                                fontWeight: 400,
                                            },
                                        }}
                                        variant="outline"
                                    >
                                        {equipment[0]}
                                        {equipment.length > 1 && ` +${equipment.length - 1}`}
                                    </Badge>
                                )}
                            </Group>
                        )}
                    </Stack>
                </Group>

                {/* Scope indicator - subtle visual on the right */}
                {content.scope === 'system' && (
                    <Badge
                        color="gray"
                        radius="xl"
                        size="sm"
                        style={{flexShrink: 0}}
                        styles={{
                            label: {
                                fontWeight: 400,
                            },
                        }}
                        variant="dot"
                    >
                        System
                    </Badge>
                )}
            </Group>
        </Card>
    );
};
