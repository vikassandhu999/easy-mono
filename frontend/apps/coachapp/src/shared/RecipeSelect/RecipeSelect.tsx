import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Card,
    Center,
    Group,
    Loader,
    Paper,
    Stack,
    Text,
    TextInput,
} from '@mantine/core';
import {useDebouncedCallback} from '@mantine/hooks';
import {CheckIcon, MagnifyingGlassIcon, XIcon} from '@phosphor-icons/react';
import {IconPlus} from '@tabler/icons-react';
import {useEffect, useImperativeHandle, useMemo, useState} from 'react';

import RecipeSampleImage from '@/../public/recipe_sample.jpg';
import {Recipe, useListRecipes} from '@/services/recipes';
import RecipeCreateDrawer from '@/shared/drawers/RecipeCreateDrawer';

import RecordsList from '../layouts/RecordsList';

interface RecipeCardProps {
    isSelected: boolean;
    multiple: boolean;
    onToggleSelect: (id: string) => void;
    recipe: Recipe;
}

const RecipeCard = ({recipe, isSelected, multiple, onToggleSelect}: RecipeCardProps) => {
    return (
        <Card
            aria-label={`${isSelected ? 'Deselect' : 'Select'} ${recipe.name}: ${recipe.description || ''}`}
            onClick={() => onToggleSelect(recipe.id)}
            p="sm"
            role="button"
            style={{
                backgroundColor: isSelected ? 'var(--mantine-color-blue-0)' : 'white',
                borderColor: isSelected ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-gray-3)',
                borderWidth: isSelected ? 2 : 1,
                borderRadius: 8,
                boxShadow: isSelected ? '0 2px 12px rgba(59, 130, 246, 0.2)' : 'none',
                cursor: 'pointer',
                transform: 'scale(1)',
                transition: 'all 200ms ease',
            }}
            styles={{
                root: {
                    '&:hover': {
                        backgroundColor: multiple
                            ? isSelected
                                ? 'var(--mantine-color-blue-1)'
                                : 'var(--mantine-color-gray-0)'
                            : 'var(--mantine-color-blue-0)',
                        borderColor: 'var(--mantine-color-blue-5)',
                        boxShadow: '0 4px 16px rgba(59, 130, 246, 0.25)',
                        transform: 'scale(1.01)',
                    },
                    '&:active': {
                        transform: 'scale(0.99)',
                    },
                },
            }}
            tabIndex={0}
            withBorder
        >
            <Group
                align="flex-start"
                gap="sm"
                wrap="nowrap"
            >
                {/* Recipe Image */}
                <Box
                    style={{
                        flexShrink: 0,
                        width: 80,
                        height: 80,
                        borderRadius: 8,
                        overflow: 'hidden',
                    }}
                >
                    <img
                        alt={recipe.name}
                        src={RecipeSampleImage}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                    />
                </Box>

                {/* Recipe Details */}
                <Stack
                    gap="xs"
                    style={{flex: 1, minWidth: 0}}
                >
                    <Text
                        fw={600}
                        lineClamp={1}
                        size="sm"
                    >
                        {recipe.name}
                    </Text>

                    {/* Recipe Metadata */}
                    {recipe.description && (
                        <Text
                            c="dimmed"
                            lineClamp={2}
                            size="xs"
                        >
                            {recipe.description}
                        </Text>
                    )}

                    {/* Nutritional and Prep Badges */}
                    <Group gap="xs">
                        {recipe.total_calories && (
                            <Badge
                                color="blue"
                                size="xs"
                                variant="light"
                            >
                                {parseFloat(recipe.total_calories).toFixed(0)} cal
                            </Badge>
                        )}
                        {recipe.prep_time_minutes && (
                            <Badge
                                color="grape"
                                size="xs"
                                variant="light"
                            >
                                {recipe.prep_time_minutes} min
                            </Badge>
                        )}
                        {recipe.servings && (
                            <Badge
                                color="green"
                                size="xs"
                                variant="light"
                            >
                                {recipe.servings} servings
                            </Badge>
                        )}
                    </Group>
                </Stack>

                {/* Selection Indicator - Only in single-select mode */}
                {!multiple && isSelected && (
                    <ActionIcon
                        color="blue"
                        radius="xl"
                        size="lg"
                        variant="filled"
                    >
                        <CheckIcon
                            size={18}
                            weight="bold"
                        />
                    </ActionIcon>
                )}
            </Group>
        </Card>
    );
};

export interface RecipeSelectHandle {
    handleSave: () => void;
}

interface RecipeSelectProps {
    multiple?: boolean;
    onComplete?: (selectedIds: string[], selectedRecipes?: Recipe[]) => void;
    ref?: React.Ref<RecipeSelectHandle>;
    search?: string;
}

export default function RecipeSelect(props: RecipeSelectProps) {
    const {multiple = true, onComplete, search: initialSearch = '', ref} = props;

    const [search, setSearch] = useState(initialSearch);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [recipesMap, setRecipesMap] = useState<Record<string, Recipe>>({});
    const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

    const onSearchChangeDebounced = useDebouncedCallback(setSearch, 300);

    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListRecipes({
        status: 'active',
        search: search || undefined,
    });

    const recipes = useMemo(() => {
        if (!data?.pages) return [];
        return data.pages.flatMap((page) => page.records);
    }, [data?.pages]);

    // Update recipes map when recipes change
    useEffect(() => {
        const newMap = {...recipesMap};
        recipes.forEach((recipe) => {
            newMap[recipe.id] = recipe;
        });
        setRecipesMap(newMap);
    }, [recipes, recipesMap]);

    const handleToggleSelect = (id: string) => {
        // For single-select mode, immediately call onComplete and return
        if (!multiple) {
            const selectedRecipe = recipesMap[id];
            onComplete?.([id], selectedRecipe ? [selectedRecipe] : undefined);
            return;
        }

        // For multi-select mode, toggle the selection
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]));
    };

    const handleSave = () => {
        const selectedRecipes = selectedIds.map((id) => recipesMap[id]).filter(Boolean);
        onComplete?.(selectedIds, selectedRecipes);
    };

    useImperativeHandle(ref, () => ({
        handleSave,
    }));

    return (
        <>
            {isCreateDrawerOpen && (
                <RecipeCreateDrawer
                    onClose={() => setIsCreateDrawerOpen(false)}
                    onSuccess={(recipeId: string) => {
                        setIsCreateDrawerOpen(false);
                        // Optionally auto-select the newly created recipe
                        if (!multiple) {
                            // For single select, immediately complete with new recipe
                            onComplete?.([recipeId]);
                        } else {
                            // For multi-select, add to selection
                            setSelectedIds((prev) => [...prev, recipeId]);
                        }
                    }}
                />
            )}

            <Stack>
                <Group justify="space-between">
                    <Button
                        color="orange"
                        fullWidth
                        onClick={() => setIsCreateDrawerOpen(true)}
                        radius="lg"
                        rightSection={<IconPlus size="18" />}
                        variant="light"
                    >
                        Create New Recipe
                    </Button>
                    {multiple && (
                        <Badge
                            color="blue"
                            size="lg"
                            variant="dot"
                        >
                            {selectedIds.length} selected
                        </Badge>
                    )}
                </Group>

                <TextInput
                    leftSection={<MagnifyingGlassIcon size={18} />}
                    onChange={(e) => onSearchChangeDebounced(e.currentTarget.value)}
                    placeholder="Search recipes..."
                    rightSection={
                        search ? (
                            <ActionIcon
                                onClick={() => {
                                    setSearch('');
                                    onSearchChangeDebounced('');
                                }}
                                size="sm"
                                variant="subtle"
                            >
                                <XIcon size={16} />
                            </ActionIcon>
                        ) : null
                    }
                    size="md"
                />

                <Box style={{flex: 1, overflow: 'auto'}}>
                    <Box>
                        {isLoading ? (
                            <Center py="xl">
                                <Loader size="lg" />
                            </Center>
                        ) : recipes.length === 0 ? (
                            <Paper
                                p="xl"
                                style={{textAlign: 'center'}}
                            >
                                <Text
                                    c="dimmed"
                                    size="sm"
                                >
                                    No recipes found
                                </Text>
                            </Paper>
                        ) : (
                            <RecordsList
                                emptyState={
                                    <Paper
                                        p="xl"
                                        style={{textAlign: 'center'}}
                                    >
                                        <Text
                                            c="dimmed"
                                            size="sm"
                                        >
                                            No recipes found
                                        </Text>
                                    </Paper>
                                }
                                fetchNextPage={fetchNextPage}
                                hasNextPage={hasNextPage}
                                isFetchingNextPage={isFetchingNextPage}
                                isLoading={isLoading}
                                records={recipes}
                                renderItem={(recipe: Recipe) => (
                                    <RecipeCard
                                        isSelected={selectedIds.includes(recipe.id)}
                                        key={recipe.id}
                                        multiple={multiple}
                                        onToggleSelect={handleToggleSelect}
                                        recipe={recipe}
                                    />
                                )}
                            />
                        )}
                    </Box>
                </Box>
            </Stack>
        </>
    );
}
