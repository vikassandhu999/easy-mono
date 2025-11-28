import {Loader, Text, TextInput} from '@mantine/core';
import {useDebouncedCallback, useIntersection, useLocalStorage} from '@mantine/hooks';
import {CheckIcon, MagnifyingGlassIcon, XIcon} from '@phosphor-icons/react';
import {IconBolt, IconClock, IconFlame, IconHistory, IconLeaf, IconPlus, IconUsers} from '@tabler/icons-react';
import {useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState} from 'react';

import RecipeSampleImage from '@/../public/recipe_sample.jpg';
import {Recipe, useListRecipes} from '@/services/recipes';
import RecipeCreateDrawer from '@/shared/drawers/RecipeCreateDrawer';

import classes from './styles.module.css';

// Quick filter definitions
type QuickFilter = 'highProtein' | 'lowCal' | 'quick' | null;

const QUICK_FILTERS: {id: QuickFilter; label: string; icon: React.ReactNode}[] = [
    {id: 'quick', label: 'Quick', icon: <IconBolt size={14} />},
    {id: 'lowCal', label: 'Low cal', icon: <IconLeaf size={14} />},
    {id: 'highProtein', label: 'High protein', icon: <IconFlame size={14} />},
];

interface RecipeCardProps {
    focused: boolean;
    isSelected: boolean;
    onSelect: () => void;
    recipe: Recipe;
}

const RecipeCard = ({recipe, isSelected, onSelect, focused}: RecipeCardProps) => {
    const cardRef = useRef<HTMLDivElement>(null);

    // Scroll into view when focused
    useEffect(() => {
        if (focused && cardRef.current) {
            cardRef.current.scrollIntoView({behavior: 'smooth', block: 'nearest'});
        }
    }, [focused]);

    return (
        <div
            aria-selected={isSelected}
            className={`${classes.recipeCard} ${isSelected ? classes.selected : ''} ${focused ? classes.focused : ''}`}
            onClick={onSelect}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect();
                }
            }}
            ref={cardRef}
            role="option"
            tabIndex={0}
        >
            {/* Recipe Image */}
            <div className={classes.recipeImage}>
                <img
                    alt=""
                    src={RecipeSampleImage}
                />
            </div>

            {/* Recipe Info */}
            <div className={classes.recipeInfo}>
                <span className={classes.recipeName}>{recipe.name}</span>
                <div className={classes.recipeMeta}>
                    {recipe.total_calories && (
                        <span>
                            <IconFlame size={12} />
                            {parseFloat(recipe.total_calories).toFixed(0)} cal
                        </span>
                    )}
                    {recipe.prep_time_minutes && (
                        <span>
                            <IconClock size={12} />
                            {recipe.prep_time_minutes}m
                        </span>
                    )}
                    {recipe.servings && (
                        <span>
                            <IconUsers size={12} />
                            {recipe.servings}
                        </span>
                    )}
                </div>
                {recipe.description && <span className={classes.recipeDescription}>{recipe.description}</span>}
            </div>

            {/* Selection Indicator */}
            <div className={classes.selectionIndicator}>
                {isSelected && (
                    <CheckIcon
                        size={14}
                        weight="bold"
                    />
                )}
            </div>
        </div>
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
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [activeFilter, setActiveFilter] = useState<QuickFilter>(null);
    const [recentRecipeIds, setRecentRecipeIds] = useLocalStorage<string[]>({
        key: 'recent-recipe-ids',
        defaultValue: [],
    });

    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const onSearchChangeDebounced = useDebouncedCallback(setSearch, 300);

    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListRecipes({
        status: 'active',
        search: search || undefined,
    });

    // Infinite scroll trigger
    const {ref: loadMoreRef, entry} = useIntersection({
        root: listRef.current,
        threshold: 0.5,
    });

    useEffect(() => {
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [entry?.isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const recipes = useMemo(() => {
        if (!data?.pages) return [];
        let allRecipes = data.pages.flatMap((page) => page.records);

        // Apply quick filters client-side
        if (activeFilter) {
            allRecipes = allRecipes.filter((recipe) => {
                switch (activeFilter) {
                    case 'quick':
                        return recipe.prep_time_minutes && recipe.prep_time_minutes <= 15;
                    case 'lowCal':
                        return recipe.total_calories && parseFloat(recipe.total_calories) <= 400;
                    case 'highProtein':
                        return recipe.total_protein && parseFloat(recipe.total_protein) >= 25;
                    default:
                        return true;
                }
            });
        }

        return allRecipes;
    }, [data?.pages, activeFilter]);

    // Get recent recipes from the loaded data
    const recentRecipes = useMemo(() => {
        if (!recentRecipeIds.length) return [];
        return recentRecipeIds
            .slice(0, 3)
            .map((id) => recipesMap[id])
            .filter(Boolean);
    }, [recentRecipeIds, recipesMap]);

    // Update recipes map when recipes change
    useEffect(() => {
        setRecipesMap((prev) => {
            const newMap = {...prev};
            recipes.forEach((recipe) => {
                newMap[recipe.id] = recipe;
            });
            return newMap;
        });
    }, [recipes]);

    // Reset focus when search changes
    useEffect(() => {
        setFocusedIndex(-1);
    }, [search]);

    const handleSelect = useCallback(
        (id: string) => {
            // Update recent recipes
            setRecentRecipeIds((prev) => {
                const filtered = prev.filter((prevId) => prevId !== id);
                return [id, ...filtered].slice(0, 10);
            });

            // For single-select mode, immediately call onComplete
            if (!multiple) {
                const selectedRecipe = recipesMap[id];
                onComplete?.([id], selectedRecipe ? [selectedRecipe] : undefined);
                return;
            }

            // For multi-select mode, toggle the selection
            setSelectedIds((prev) =>
                prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id],
            );
        },
        [multiple, onComplete, recipesMap, setRecentRecipeIds],
    );

    const handleSave = useCallback(() => {
        const selectedRecipes = selectedIds.map((id) => recipesMap[id]).filter(Boolean);
        onComplete?.(selectedIds, selectedRecipes);
    }, [selectedIds, recipesMap, onComplete]);

    useImperativeHandle(ref, () => ({
        handleSave,
    }));

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (recipes.length === 0) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setFocusedIndex((prev) => Math.min(prev + 1, recipes.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setFocusedIndex((prev) => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    if (focusedIndex >= 0 && focusedIndex < recipes.length) {
                        e.preventDefault();
                        handleSelect(recipes[focusedIndex].id);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    setFocusedIndex(-1);
                    searchInputRef.current?.focus();
                    break;
            }
        },
        [recipes, focusedIndex, handleSelect],
    );

    const handleSearchKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'ArrowDown' && recipes.length > 0) {
                e.preventDefault();
                setFocusedIndex(0);
            } else if (e.key === 'Enter' && recipes.length > 0 && focusedIndex === -1) {
                e.preventDefault();
                // Select first recipe on Enter if nothing focused
                handleSelect(recipes[0].id);
            } else if (e.key === 'Escape') {
                setSearch('');
                onSearchChangeDebounced('');
            }
        },
        [recipes, focusedIndex, handleSelect, onSearchChangeDebounced],
    );

    const handleRecipeCreated = useCallback(
        (recipeId: string) => {
            setIsCreateDrawerOpen(false);
            if (!multiple) {
                onComplete?.([recipeId]);
            } else {
                setSelectedIds((prev) => [...prev, recipeId]);
            }
        },
        [multiple, onComplete],
    );

    return (
        <>
            {isCreateDrawerOpen && (
                <RecipeCreateDrawer
                    onClose={() => setIsCreateDrawerOpen(false)}
                    onSuccess={handleRecipeCreated}
                />
            )}

            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
            <div
                className={classes.container}
                onKeyDown={handleKeyDown}
            >
                {/* Search Section */}
                <div className={classes.searchSection}>
                    <div className={classes.searchInputWrapper}>
                        <TextInput
                            leftSection={<MagnifyingGlassIcon size={18} />}
                            onChange={(e) => onSearchChangeDebounced(e.currentTarget.value)}
                            onKeyDown={handleSearchKeyDown}
                            placeholder="Search recipes..."
                            ref={searchInputRef}
                            rightSection={
                                isLoading ? (
                                    <Loader
                                        color="orange"
                                        size="xs"
                                    />
                                ) : search ? (
                                    <button
                                        aria-label="Clear search"
                                        onClick={() => {
                                            setSearch('');
                                            onSearchChangeDebounced('');
                                            searchInputRef.current?.focus();
                                        }}
                                        style={{background: 'none', border: 'none', cursor: 'pointer', padding: 4}}
                                        type="button"
                                    >
                                        <XIcon size={16} />
                                    </button>
                                ) : null
                            }
                            size="md"
                        />
                    </div>

                    {/* Quick Filters */}
                    <div className={classes.quickFilters}>
                        {QUICK_FILTERS.map((filter) => (
                            <button
                                aria-pressed={activeFilter === filter.id}
                                className={`${classes.filterChip} ${activeFilter === filter.id ? classes.filterChipActive : ''}`}
                                key={filter.id}
                                onClick={() => setActiveFilter(activeFilter === filter.id ? null : filter.id)}
                                type="button"
                            >
                                {filter.icon}
                                <span>{filter.label}</span>
                            </button>
                        ))}

                        <button
                            className={classes.createButton}
                            onClick={() => setIsCreateDrawerOpen(true)}
                            type="button"
                        >
                            <IconPlus size={14} />
                            <span>New</span>
                        </button>

                        {multiple && selectedIds.length > 0 && (
                            <div className={classes.selectionBadge}>
                                <CheckIcon
                                    size={12}
                                    weight="bold"
                                />
                                <span>{selectedIds.length}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Recipes Section */}
                {!search && !activeFilter && recentRecipes.length > 0 && (
                    <div className={classes.recentSection}>
                        <div className={classes.sectionHeader}>
                            <IconHistory size={14} />
                            <span>Recent</span>
                        </div>
                        <div className={classes.recentList}>
                            {recentRecipes.map((recipe) => (
                                <button
                                    className={`${classes.recentChip} ${selectedIds.includes(recipe.id) ? classes.recentChipSelected : ''}`}
                                    key={recipe.id}
                                    onClick={() => handleSelect(recipe.id)}
                                    type="button"
                                >
                                    <span className={classes.recentChipName}>{recipe.name}</span>
                                    {recipe.total_calories && (
                                        <span className={classes.recentChipMeta}>
                                            {parseFloat(recipe.total_calories).toFixed(0)} cal
                                        </span>
                                    )}
                                    {selectedIds.includes(recipe.id) && (
                                        <CheckIcon
                                            size={12}
                                            weight="bold"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recipe List */}
                {isLoading && recipes.length === 0 ? (
                    <div className={classes.loadingContainer}>
                        <Loader
                            color="orange"
                            size="md"
                        />
                        <span className={classes.loadingText}>Loading recipes...</span>
                    </div>
                ) : recipes.length === 0 ? (
                    <div className={classes.emptyState}>
                        <Text className={classes.emptyStateText}>
                            {search
                                ? `No recipes found for "${search}"`
                                : activeFilter
                                  ? `No ${activeFilter === 'quick' ? 'quick' : activeFilter === 'lowCal' ? 'low calorie' : 'high protein'} recipes found`
                                  : 'No recipes yet'}
                        </Text>
                        {activeFilter && (
                            <button
                                className={classes.clearFilterButton}
                                onClick={() => setActiveFilter(null)}
                                type="button"
                            >
                                Clear filter
                            </button>
                        )}
                        <button
                            className={`${classes.createButton} ${classes.emptyStateAction}`}
                            onClick={() => setIsCreateDrawerOpen(true)}
                            type="button"
                        >
                            <IconPlus size={16} />
                            <span>Create your first recipe</span>
                        </button>
                    </div>
                ) : (
                    <div
                        aria-label="Recipe list"
                        className={classes.recipeList}
                        ref={listRef}
                        role="listbox"
                    >
                        {recipes.map((recipe, idx) => (
                            <RecipeCard
                                focused={focusedIndex === idx}
                                isSelected={selectedIds.includes(recipe.id)}
                                key={recipe.id}
                                onSelect={() => handleSelect(recipe.id)}
                                recipe={recipe}
                            />
                        ))}

                        {/* Infinite scroll trigger */}
                        {hasNextPage && (
                            <div
                                className={classes.loadMoreTrigger}
                                ref={loadMoreRef}
                            >
                                {isFetchingNextPage && (
                                    <Loader
                                        color="orange"
                                        size="sm"
                                    />
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Keyboard hint - only show when actively navigating */}
                {recipes.length > 0 && focusedIndex >= 0 && (
                    <Text
                        c="dimmed"
                        className={classes.searchHint}
                        size="xs"
                    >
                        ↑↓ navigate • Enter select • Esc cancel
                    </Text>
                )}
            </div>
        </>
    );
}
