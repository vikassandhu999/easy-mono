import {Badge, Box, Button, Divider, Group, Paper, Stack, Table, Text, Title} from '@mantine/core';
import {IconClock, IconPencil, IconUsers} from '@tabler/icons-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import {useGetRecipe} from '@/services/recipes';
import AutoDrawer from '@/shared/AutoDrawer/AutoDrawer';

import {DrawerErrorState, DrawerLoadingState} from './shared';

dayjs.extend(relativeTime);

const RecipeViewDrawer = () => {
    const {openDrawer, closeDrawer, getDrawerParams} = useParamsDrawer({});

    const params = getDrawerParams();
    const recipeId = params.recipe_id;

    const {
        data: recipe,
        isLoading: recipeLoading,
        error,
        refetch,
    } = useGetRecipe(recipeId ?? '', {
        skip: !recipeId,
    });

    const handleClose = () => {
        closeDrawer();
    };

    const handleEdit = () => {
        if (recipeId) {
            openDrawer(DRAWER_KEYS.RECIPE_EDIT, {recipe_id: recipeId});
        }
    };

    // Loading state
    const renderLoading = () => (
        <AutoDrawer
            actions={null}
            content={<DrawerLoadingState message="Loading recipe..." />}
            onClose={handleClose}
            title="Loading..."
        />
    );

    // Error state
    const renderError = () => (
        <AutoDrawer
            actions={null}
            content={
                <DrawerErrorState
                    message={error ? 'An error occurred while loading the recipe.' : 'Recipe not found.'}
                    onRetry={refetch}
                    title="Failed to load recipe"
                />
            }
            onClose={handleClose}
            title="Error"
        />
    );

    // Main content
    const renderContent = () => {
        if (!recipe) return null;

        const hasNutrition =
            recipe.total_calories ||
            recipe.total_protein ||
            recipe.total_carbohydrates ||
            recipe.total_fats ||
            recipe.total_fiber;

        return (
            <AutoDrawer
                actions={
                    <Group>
                        <Button
                            leftSection={<IconPencil size={12} />}
                            onClick={handleEdit}
                            radius="xl"
                            size="xs"
                            variant="light"
                        >
                            Edit
                        </Button>
                    </Group>
                }
                content={
                    <Stack gap="lg">
                        {/* Header */}
                        <Box>
                            <Badge
                                color={
                                    recipe.status === 'active' ? 'green' : recipe.status === 'draft' ? 'gray' : 'red'
                                }
                                variant="light"
                            >
                                {recipe.status}
                            </Badge>
                            <Group
                                gap="xs"
                                mb="xs"
                            >
                                <Title order={2}>{recipe.name}</Title>
                            </Group>

                            {recipe.description && (
                                <Text
                                    c="dimmed"
                                    size="sm"
                                >
                                    {recipe.description}
                                </Text>
                            )}

                            {/* Meta info */}
                            <Group
                                gap="lg"
                                mt="md"
                            >
                                {recipe.prep_time_minutes && (
                                    <Group gap="xs">
                                        <IconClock size={18} />
                                        <Text size="sm">{recipe.prep_time_minutes} min</Text>
                                    </Group>
                                )}
                                {recipe.servings && (
                                    <Group gap="xs">
                                        <IconUsers size={18} />
                                        <Text size="sm">{recipe.servings} servings</Text>
                                    </Group>
                                )}
                            </Group>
                        </Box>

                        <Divider />

                        <Box>
                            <Title
                                mb="sm"
                                order={4}
                            >
                                Ingredients
                            </Title>
                            {/* Ingredients */}
                            {recipe.recipe_ingredients && recipe.recipe_ingredients.length > 0 ? (
                                <Table
                                    highlightOnHover
                                    striped
                                    withColumnBorders
                                    withTableBorder
                                >
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Ingredient</Table.Th>
                                            <Table.Th>Quantity</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {recipe.recipe_ingredients.map((ingredient, index) => (
                                            <Table.Tr key={index}>
                                                <Table.Td>
                                                    <Text size="sm">{ingredient?.ingredient?.name || 'Unknown'}</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text
                                                        fw={500}
                                                        size="sm"
                                                    >
                                                        {ingredient.quantity_as_text || '-'}
                                                    </Text>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            ) : (
                                <Text
                                    fs="italic"
                                    size="sm"
                                >
                                    Not added yet. You can add by clicking on edit.
                                </Text>
                            )}
                        </Box>

                        {/* Nutrition */}
                        <Divider />
                        <Box>
                            <Title
                                mb="sm"
                                order={4}
                            >
                                Nutrition Information
                            </Title>
                            {hasNutrition ? (
                                <Paper
                                    p="md"
                                    radius="md"
                                    style={{backgroundColor: '#f8f9fa'}}
                                    withBorder
                                >
                                    <Group
                                        gap="xl"
                                        wrap="wrap"
                                    >
                                        {recipe.total_calories && (
                                            <Box>
                                                <Text
                                                    c="dimmed"
                                                    size="xs"
                                                >
                                                    Calories
                                                </Text>
                                                <Text
                                                    fw={600}
                                                    size="lg"
                                                >
                                                    {recipe.total_calories}
                                                </Text>
                                            </Box>
                                        )}
                                        {recipe.total_protein && (
                                            <Box>
                                                <Text
                                                    c="dimmed"
                                                    size="xs"
                                                >
                                                    Protein
                                                </Text>
                                                <Text
                                                    fw={600}
                                                    size="lg"
                                                >
                                                    {recipe.total_protein}g
                                                </Text>
                                            </Box>
                                        )}
                                        {recipe.total_carbohydrates && (
                                            <Box>
                                                <Text
                                                    c="dimmed"
                                                    size="xs"
                                                >
                                                    Carbs
                                                </Text>
                                                <Text
                                                    fw={600}
                                                    size="lg"
                                                >
                                                    {recipe.total_carbohydrates}g
                                                </Text>
                                            </Box>
                                        )}
                                        {recipe.total_fats && (
                                            <Box>
                                                <Text
                                                    c="dimmed"
                                                    size="xs"
                                                >
                                                    Fats
                                                </Text>
                                                <Text
                                                    fw={600}
                                                    size="lg"
                                                >
                                                    {recipe.total_fats}g
                                                </Text>
                                            </Box>
                                        )}
                                        {recipe.total_fiber && (
                                            <Box>
                                                <Text
                                                    c="dimmed"
                                                    size="xs"
                                                >
                                                    Fiber
                                                </Text>
                                                <Text
                                                    fw={600}
                                                    size="lg"
                                                >
                                                    {recipe.total_fiber}g
                                                </Text>
                                            </Box>
                                        )}
                                    </Group>
                                </Paper>
                            ) : (
                                <Text
                                    fs="italic"
                                    size="sm"
                                >
                                    Not added yet. You can add by clicking on edit.
                                </Text>
                            )}
                        </Box>

                        {/* Instructions */}
                        <Divider />

                        <Box>
                            <Title
                                mb="sm"
                                order={4}
                            >
                                Instructions
                            </Title>
                            {recipe.instructions &&
                            Array.isArray(recipe.instructions) &&
                            recipe.instructions.length > 0 ? (
                                <Stack gap="xs">
                                    {recipe.instructions.map((instruction, index) => (
                                        <Group
                                            gap="xs"
                                            key={index}
                                            wrap="nowrap"
                                        >
                                            <Badge
                                                color="orange"
                                                variant="light"
                                            >
                                                {index + 1}
                                            </Badge>
                                            <Text
                                                size="sm"
                                                style={{whiteSpace: 'pre-wrap'}}
                                            >
                                                {instruction}
                                            </Text>
                                        </Group>
                                    ))}
                                </Stack>
                            ) : recipe.instructions_as_text ? (
                                <Text
                                    size="sm"
                                    style={{whiteSpace: 'pre-wrap'}}
                                >
                                    {recipe.instructions_as_text}
                                </Text>
                            ) : (
                                <Text
                                    fs="italic"
                                    size="sm"
                                >
                                    Not added yet. You can add by clicking on edit.
                                </Text>
                            )}
                        </Box>
                    </Stack>
                }
                onClose={handleClose}
                title={recipe.name || 'Recipe Details'}
            />
        );
    };

    // Render based on state
    if (recipeLoading) return renderLoading();
    if (error || !recipe) return renderError();
    return renderContent();
};

export default RecipeViewDrawer;
