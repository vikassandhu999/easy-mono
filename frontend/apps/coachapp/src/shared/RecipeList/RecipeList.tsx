import {Loader} from '@mantine/core';
import {useIntersection} from '@mantine/hooks';
import {IconBook2, IconCaretRight, IconClock, IconFlame, IconUsers} from '@tabler/icons-react';
import {useCallback, useEffect, useMemo, useRef} from 'react';

import RecipeSampleImage from '@/../public/recipe_sample.jpg';
import {Recipe, useListRecipes} from '@/services/recipes';

import classes from './styles.module.css';

interface RecipeListItemProps {
    onClick?: (id: string) => void;
    recipe: Recipe;
}

const RecipeListItem = ({recipe, onClick}: RecipeListItemProps) => {
    return (
        <div
            className={classes.recipeCard}
            onClick={() => onClick?.(recipe.id)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick?.(recipe.id);
                }
            }}
            role="button"
            tabIndex={0}
        >
            {/* Recipe Image */}
            <div className={classes.imageWrapper}>
                <img
                    alt={recipe.name}
                    className={classes.image}
                    src={RecipeSampleImage}
                />
            </div>

            {/* Recipe Content */}
            <div className={classes.content}>
                <span className={classes.name}>{recipe.name}</span>
                {recipe.description && <span className={classes.description}>{recipe.description}</span>}
                <div className={classes.metaTags}>
                    {recipe.total_calories && (
                        <span className={`${classes.metaTag} ${classes.metaTagCalories}`}>
                            <IconFlame size={11} />
                            {parseFloat(recipe.total_calories).toFixed(0)} cal
                        </span>
                    )}
                    {recipe.prep_time_minutes && (
                        <span className={`${classes.metaTag} ${classes.metaTagTime}`}>
                            <IconClock size={11} />
                            {recipe.prep_time_minutes}m
                        </span>
                    )}
                    {recipe.servings && (
                        <span className={`${classes.metaTag} ${classes.metaTagServings}`}>
                            <IconUsers size={11} />
                            {recipe.servings}
                        </span>
                    )}
                </div>
            </div>

            {/* Arrow indicator */}
            <IconCaretRight
                className={classes.arrow}
                size={18}
            />
        </div>
    );
};

/* Skeleton loader for better perceived performance */
const RecipeListSkeleton = () => (
    <>
        {[1, 2, 3].map((i) => (
            <div
                className={classes.skeleton}
                key={i}
            >
                <div className={classes.skeletonImage} />
                <div className={classes.skeletonContent}>
                    <div className={classes.skeletonLine} />
                    <div className={classes.skeletonLine} />
                    <div className={classes.skeletonTags}>
                        <div className={classes.skeletonTag} />
                        <div className={classes.skeletonTag} />
                    </div>
                </div>
            </div>
        ))}
    </>
);

export interface RecipeListProps {
    onRecipeClick?: (id: string) => void;
    search?: string;
}

const RecipeList = ({onRecipeClick, search}: RecipeListProps) => {
    const lastCallTimeRef = useRef(0);
    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListRecipes({
        status: 'active',
        search: search || undefined,
    });

    const recipes = useMemo(() => data?.pages?.flatMap((page) => page.records) ?? [], [data?.pages]);

    // Intersection observer for infinite scroll
    const {entry, ref} = useIntersection({
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
    });

    // Throttled fetch for infinite scroll
    const handleFetchNextPage = useCallback(() => {
        const now = Date.now();
        if (now - lastCallTimeRef.current > 500 && hasNextPage && !isFetchingNextPage) {
            lastCallTimeRef.current = now;
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    useEffect(() => {
        if (entry?.isIntersecting) {
            handleFetchNextPage();
        }
    }, [entry?.isIntersecting, handleFetchNextPage]);

    // Loading state
    if (isLoading) {
        return (
            <div className={classes.listContainer}>
                <RecipeListSkeleton />
            </div>
        );
    }

    // Empty state
    if (recipes.length === 0) {
        return (
            <div className={classes.emptyState}>
                <IconBook2
                    className={classes.emptyIcon}
                    size={48}
                    stroke={1.5}
                />
                <span className={classes.emptyText}>{search ? 'No recipes match your search' : 'No recipes yet'}</span>
                <span className={classes.emptyHint}>
                    {search ? 'Try a different search term' : 'Create your first recipe to get started'}
                </span>
            </div>
        );
    }

    return (
        <div className={classes.listContainer}>
            {recipes.map((recipe) => (
                <RecipeListItem
                    key={recipe.id}
                    onClick={onRecipeClick}
                    recipe={recipe}
                />
            ))}

            {/* Infinite scroll trigger */}
            {hasNextPage && (
                <div
                    className={classes.loadMoreTrigger}
                    ref={ref}
                >
                    {isFetchingNextPage && <Loader size="sm" />}
                </div>
            )}
        </div>
    );
};

export default RecipeList;
