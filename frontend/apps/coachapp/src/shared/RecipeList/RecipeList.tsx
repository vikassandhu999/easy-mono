import {AspectRatio, Badge, Card, Group, Image, Stack, Text} from '@mantine/core';
import {useMemo} from 'react';

import RecipeSampleImage from '@/../public/recipe_sample.jpg';
import {Recipe, useListRecipes} from '@/services/recipes';
import {EmptyState} from '@/shared/layouts/EmptyState';
import RecordsList from '@/shared/layouts/RecordsList';

interface RecipeListItemProps {
    onClick?: (id: string) => void;
    recipe: Recipe;
}

const RecipeListItem = ({recipe, onClick}: RecipeListItemProps) => {
    return (
        <Card
            bg="gray.1"
            onClick={() => {
                onClick?.(recipe.id);
            }}
            radius="xl"
            style={{cursor: 'pointer'}}
            withBorder={false}
        >
            <Group
                align="flex-start"
                wrap="nowrap"
            >
                <AspectRatio
                    flex="0 0 80px"
                    ratio={1}
                >
                    <Image
                        height={80}
                        radius="lg"
                        src={RecipeSampleImage}
                        width={80}
                    />
                </AspectRatio>
                <Stack gap="sm">
                    <Text fw={500}>{recipe.name}</Text>
                    {recipe.description && (
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            {recipe.description}
                        </Text>
                    )}
                    <Group gap="xs">
                        {recipe.total_calories && (
                            <Badge
                                color="blue"
                                variant="light"
                            >
                                {parseFloat(recipe.total_calories).toFixed(0)} cal
                            </Badge>
                        )}
                        {recipe.prep_time_minutes && (
                            <Badge
                                color="grape"
                                variant="light"
                            >
                                {recipe.prep_time_minutes} min
                            </Badge>
                        )}
                        {recipe.servings && (
                            <Badge
                                color="green"
                                variant="light"
                            >
                                {recipe.servings} servings
                            </Badge>
                        )}
                    </Group>
                </Stack>
            </Group>
        </Card>
    );
};

export interface RecipeListProps {
    onRecipeClick?: (id: string) => void;
    search?: string;
}

const RecipeList = ({onRecipeClick, search}: RecipeListProps) => {
    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListRecipes({
        status: 'active',
        search: search || undefined,
    });

    const recipes = useMemo(() => data?.pages?.flatMap((page) => page.records) ?? [], [data?.pages]);

    return (
        <RecordsList
            emptyState={<Text>No Recipe Found</Text>}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            isLoading={isLoading}
            records={recipes}
            renderItem={(recipe) => (
                <RecipeListItem
                    onClick={onRecipeClick}
                    recipe={recipe}
                />
            )}
        />
    );
};

export default RecipeList;
