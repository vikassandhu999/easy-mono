import {AspectRatio, Badge, Card, Group, Image, MantineColor, Stack, Text, useMantineTheme} from '@mantine/core';
import {IconClock} from '@tabler/icons-react';
import {FC} from 'react';

import {Content} from '@/api/contents';

import RecipeSampleImage from '../../../public/recipe_placeholder.png';

const DIFFICULTY_COLORS: Record<string, MantineColor> = {
    easy: 'green',
    medium: 'yellow',
    hard: 'red',
};

const MEAL_TYPE_COLORS: MantineColor[] = ['blue', 'green', 'orange', 'grape'];

const getMealTypeColor = (mealType: string): MantineColor => {
    const hash = mealType.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return MEAL_TYPE_COLORS[hash % MEAL_TYPE_COLORS.length];
};

interface RecipeCardProps {
    content: Content;
    onClick?: () => void;
}

export const RecipeCard: FC<RecipeCardProps> = ({content, onClick}) => {
    const theme = useMantineTheme();

    return (
        <Card
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
                <AspectRatio
                    maw={80}
                    ratio={1}
                >
                    <Image
                        radius="lg"
                        src={RecipeSampleImage}
                    />
                </AspectRatio>

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
                    {content.recipe_definition?.meal_types && content.recipe_definition.meal_types.length > 0 && (
                        <Group gap="xs">
                            {content.recipe_definition.meal_types.slice(0, 2).map((mealType, idx) => (
                                <Badge
                                    color={getMealTypeColor(mealType)}
                                    key={idx}
                                    radius="lg"
                                    size="xs"
                                    variant="light"
                                >
                                    {mealType}
                                </Badge>
                            ))}
                        </Group>
                    )}
                    {(content.recipe_definition?.total_time_minutes ||
                        content.recipe_definition?.servings ||
                        content.recipe_definition?.nutrition_per_serving?.calories) && (
                        <Group gap="xs">
                            {content.recipe_definition?.total_time_minutes && (
                                <Badge
                                    color="gray"
                                    leftSection={<IconClock size={12} />}
                                    radius="lg"
                                    size="sm"
                                    variant="dot"
                                >
                                    {content.recipe_definition.total_time_minutes} min
                                </Badge>
                            )}
                            {content.recipe_definition?.servings && (
                                <Badge
                                    color="gray"
                                    radius="lg"
                                    size="sm"
                                    variant="dot"
                                >
                                    {content.recipe_definition.servings} servings
                                </Badge>
                            )}
                            {content.recipe_definition?.nutrition_per_serving?.calories && (
                                <Badge
                                    color="gray"
                                    radius="lg"
                                    size="sm"
                                    variant="dot"
                                >
                                    {content.recipe_definition.nutrition_per_serving.calories} cal
                                </Badge>
                            )}
                        </Group>
                    )}
                </Stack>

                {content.recipe_definition?.difficulty && (
                    <Badge
                        color={DIFFICULTY_COLORS[content.recipe_definition.difficulty.toLowerCase()] || 'gray'}
                        radius="lg"
                        size="sm"
                        tt="capitalize"
                        variant="filled"
                    >
                        {content.recipe_definition.difficulty}
                    </Badge>
                )}
            </Group>
        </Card>
    );
};
