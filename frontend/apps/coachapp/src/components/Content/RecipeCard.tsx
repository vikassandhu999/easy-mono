import {Badge, Card, Group, Image, MantineColor, Stack, Text} from '@mantine/core';
import {IconClock} from '@tabler/icons-react';
import {FC} from 'react';

import {Content} from '@/store/services/contents';

import RecipeSampleImage from '../../../public/recipe_placeholder.png';

interface RecipeCardProps {
    content: Content;
    onClick?: () => void;
}

export const RecipeCard: FC<RecipeCardProps> = ({content, onClick}) => {
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
                {/* Left image section */}

                <Image
                    alt={content.name}
                    radius={0}
                    src={RecipeSampleImage}
                    style={{borderRadius: 0, objectFit: 'cover'}}
                    w="60px"
                />

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
                                variant="light"
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
                                {content.recipe_definition.servings}s
                            </Badge>
                        )}

                        {content.recipe_definition?.nutrition_per_serving?.calories && (
                            <Badge
                                color="gray"
                                radius="xl"
                                size="sm"
                                variant="dot"
                            >
                                {Math.round(content.recipe_definition.nutrition_per_serving.calories)}kcal
                            </Badge>
                        )}
                    </Group>
                </Stack>
            </Group>
        </Card>
    );
};
