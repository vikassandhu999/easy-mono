import {Badge, Card, Group, Image, Stack, Text, useMantineTheme} from '@mantine/core';
import {IconClock} from '@tabler/icons-react';
import React, {FC} from 'react';

import {Content} from '@/store/services/contents';

import RecipeSampleImage from '../../../public/recipe_placeholder.png';

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
                {/* Recipe Image */}
                <Image
                    alt={content.name}
                    h={56}
                    radius="md"
                    src={RecipeSampleImage}
                    style={{objectFit: 'cover'}}
                    w={56}
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

                    {/* Metadata - Meal type, time, servings, calories */}
                    <Group gap="xs">
                        {content.recipe_definition?.meal_types && content.recipe_definition.meal_types.length > 0 && (
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
                                {content.recipe_definition.meal_types[0]}
                            </Badge>
                        )}

                        {content.recipe_definition?.total_time_minutes && (
                            <Badge
                                color="gray"
                                leftSection={<IconClock size={12} />}
                                radius="xl"
                                size="sm"
                                variant="dot"
                            >
                                {content.recipe_definition.total_time_minutes}m
                            </Badge>
                        )}

                        {content.recipe_definition?.servings && (
                            <Badge
                                color="gray"
                                radius="xl"
                                size="sm"
                                variant="dot"
                            >
                                {content.recipe_definition.servings} servings
                            </Badge>
                        )}

                        {content.recipe_definition?.nutrition_per_serving?.calories && (
                            <Badge
                                color="gray"
                                radius="xl"
                                size="sm"
                                variant="dot"
                            >
                                {Math.round(content.recipe_definition.nutrition_per_serving.calories)} cal
                            </Badge>
                        )}
                    </Group>
                </Stack>
            </Group>
        </Card>
    );
};
