/**
 * Recipe Card Component
 *
 * Displays recipe content in a list format optimized for coaches.
 * Shows key information needed for meal planning and client assignment.
 *
 * UX Focus:
 * - Recipe name (primary)
 * - Meal type (breakfast, lunch, dinner - critical for planning)
 * - Time to prepare (practical constraint)
 * - Servings (portion planning)
 * - Key macros (calories, protein - most referenced)
 */

import {Badge, Card, Group, Stack, Text, useMantineTheme} from '@mantine/core';
import {IconClock, IconFlame, IconMeat} from '@tabler/icons-react';
import React, {FC} from 'react';

import {Content} from '@/services/contents';

interface RecipeCardProps {
    content: Content;
    onClick?: () => void;
}

export const RecipeCard: FC<RecipeCardProps> = ({content, onClick}) => {
    const theme = useMantineTheme();

    // Handle keyboard interactions
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!onClick) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
        }
    };

    const mealTypes = content.recipe_definition?.meal_types || [];
    const totalTime = content.recipe_definition?.total_time_minutes;
    const servings = content.recipe_definition?.servings;
    const nutrition = content.recipe_definition?.nutrition_per_serving;

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
                <Stack
                    flex={1}
                    gap="xs"
                    style={{minWidth: 0}}
                >
                    {/* Recipe name */}
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

                    {/* Metadata Row 1: Meal Type (most important for planning) */}
                    {mealTypes.length > 0 && (
                        <Group gap="xs">
                            {mealTypes.slice(0, 2).map((type, idx) => (
                                <Badge
                                    color="blue"
                                    key={`meal-${idx}`}
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
                                    {type}
                                </Badge>
                            ))}
                            {mealTypes.length > 2 && (
                                <Badge
                                    color="blue"
                                    radius="xl"
                                    size="sm"
                                    variant="light"
                                >
                                    +{mealTypes.length - 2}
                                </Badge>
                            )}
                        </Group>
                    )}

                    {/* Metadata Row 2: Time, Servings, Nutrition */}
                    <Group gap="xs">
                        {/* Time */}
                        {totalTime && (
                            <Badge
                                color="gray"
                                leftSection={<IconClock size={12} />}
                                radius="xl"
                                size="sm"
                                variant="dot"
                            >
                                {totalTime}m
                            </Badge>
                        )}

                        {/* Servings */}
                        {servings && (
                            <Badge
                                color="gray"
                                radius="xl"
                                size="sm"
                                variant="dot"
                            >
                                {servings} {servings === 1 ? 'serving' : 'servings'}
                            </Badge>
                        )}

                        {/* Calories - Most referenced macro */}
                        {nutrition?.calories && (
                            <Badge
                                color="gray"
                                leftSection={<IconFlame size={12} />}
                                radius="xl"
                                size="sm"
                                variant="outline"
                            >
                                {Math.round(nutrition.calories)}
                            </Badge>
                        )}

                        {/* Protein - Second most referenced macro */}
                        {nutrition?.macros?.protein_g && (
                            <Badge
                                color="gray"
                                leftSection={<IconMeat size={12} />}
                                radius="xl"
                                size="sm"
                                variant="outline"
                            >
                                {Math.round(nutrition.macros.protein_g)}g
                            </Badge>
                        )}
                    </Group>
                </Stack>

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
