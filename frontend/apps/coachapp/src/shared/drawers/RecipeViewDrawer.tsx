import {humanizeError} from '@easy/error-parser';
import {ActionIcon, Button, Group, Image, Loader, Text} from '@mantine/core';
import {modals} from '@mantine/modals';
import {IconAlertCircle, IconChefHat, IconClock, IconCopy, IconPencil, IconTrash, IconUsers} from '@tabler/icons-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import {useDeleteRecipe, useDuplicateRecipe, useGetRecipe} from '@/services/recipes';
import AutoDrawer from '@/shared/AutoDrawer/AutoDrawer';
import {notifyError, notifySuccess} from '@/utils/notification';

import classes from './RecipeViewDrawer.module.css';

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

    const [deleteRecipe, {isLoading: isDeleting}] = useDeleteRecipe();
    const [duplicateRecipe, {isLoading: isDuplicating}] = useDuplicateRecipe();

    const handleClose = () => {
        closeDrawer();
    };

    const handleEdit = () => {
        if (recipeId) {
            openDrawer(DRAWER_KEYS.RECIPE_EDIT, {recipe_id: recipeId});
        }
    };

    const handleDuplicate = async () => {
        if (!recipeId) return;

        try {
            const duplicatedRecipe = await duplicateRecipe({id: recipeId}).unwrap();
            notifySuccess('Recipe duplicated successfully');

            // Open the duplicated recipe in view mode
            openDrawer(DRAWER_KEYS.RECIPE_VIEW, {
                recipe_id: duplicatedRecipe.id,
            });
        } catch (error) {
            const errMsg = humanizeError(error);
            notifyError(errMsg);
        }
    };

    const handleDelete = () => {
        modals.openConfirmModal({
            title: 'Delete Recipe',
            children: <Text size="sm">Are you sure you want to delete this recipe? This action cannot be undone.</Text>,
            labels: {confirm: 'Delete', cancel: 'Cancel'},
            confirmProps: {color: 'red'},
            cancelProps: {variant: 'light'},
            centered: true,
            onConfirm: async () => {
                try {
                    await deleteRecipe(recipeId!).unwrap();
                    notifySuccess('Recipe deleted');
                    closeDrawer();
                } catch (error) {
                    notifyError('Failed to delete recipe');
                }
            },
        });
    };

    // Loading state
    const renderLoading = () => (
        <AutoDrawer
            actions={null}
            content={
                <div className={classes.loadingContainer}>
                    <Loader size="md" />
                    <span className={classes.loadingText}>Loading recipe...</span>
                </div>
            }
            onClose={handleClose}
            title="Loading..."
        />
    );

    // Error state
    const renderError = () => (
        <AutoDrawer
            actions={null}
            content={
                <div className={classes.errorContainer}>
                    <IconAlertCircle
                        className={classes.errorIcon}
                        size={48}
                    />
                    <h3 className={classes.errorTitle}>Failed to load recipe</h3>
                    <p className={classes.errorMessage}>
                        {error ? 'An error occurred while loading the recipe.' : 'Recipe not found.'}
                    </p>
                    <button
                        className={classes.retryButton}
                        onClick={() => refetch()}
                        type="button"
                    >
                        Try Again
                    </button>
                </div>
            }
            onClose={handleClose}
            title="Error"
        />
    );

    // Render actions
    const renderActions = () => {
        return (
            <Group w="100%">
                <Button
                    color="blue"
                    flex={1}
                    leftSection={<IconPencil size={16} />}
                    onClick={handleEdit}
                    radius="xl"
                    size="sm"
                    variant="light"
                >
                    Edit
                </Button>
                <ActionIcon
                    color="blue"
                    loading={isDuplicating}
                    onClick={handleDuplicate}
                    radius="xl"
                    size="lg"
                    variant="light"
                >
                    <IconCopy size={18} />
                </ActionIcon>
                <ActionIcon
                    color="red"
                    loading={isDeleting}
                    onClick={handleDelete}
                    radius="xl"
                    size="lg"
                    variant="light"
                >
                    <IconTrash size={18} />
                </ActionIcon>
            </Group>
        );
    };

    // Main content
    const renderContent = () => {
        if (!recipe) return null;

        const hasNutrition =
            recipe.total_calories ||
            recipe.total_protein ||
            recipe.total_carbohydrates ||
            recipe.total_fats ||
            recipe.total_fiber;

        const getStatusClass = () => {
            switch (recipe.status) {
                case 'active':
                    return classes.statusActive;
                case 'draft':
                    return classes.statusDraft;
                default:
                    return classes.statusArchived;
            }
        };

        return (
            <AutoDrawer
                actions={renderActions()}
                content={
                    <div className={classes.container}>
                        {/* Header Section */}
                        <div className={classes.headerSection}>
                            <span className={`${classes.statusBadge} ${getStatusClass()}`}>{recipe.status}</span>
                            <h1 className={classes.recipeName}>{recipe.name}</h1>
                            {recipe.description && <p className={classes.recipeDescription}>{recipe.description}</p>}

                            {/* Recipe Image */}
                            {recipe.image_url && (
                                <div className={classes.imageWrapper}>
                                    <Image
                                        alt={recipe.name}
                                        fit="cover"
                                        h={180}
                                        radius="md"
                                        src={recipe.image_url}
                                    />
                                </div>
                            )}

                            {/* Meta info */}
                            <div className={classes.metaRow}>
                                {recipe.prep_time_minutes && (
                                    <div className={classes.metaItem}>
                                        <IconClock size={16} />
                                        <span>Prep: {recipe.prep_time_minutes} min</span>
                                    </div>
                                )}
                                {recipe.cook_time_minutes && (
                                    <div className={classes.metaItem}>
                                        <IconChefHat size={16} />
                                        <span>Cook: {recipe.cook_time_minutes} min</span>
                                    </div>
                                )}
                                {recipe.servings && (
                                    <div className={classes.metaItem}>
                                        <IconUsers size={16} />
                                        <span>{recipe.servings} servings</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={classes.divider} />

                        {/* Ingredients Section */}
                        <div className={classes.section}>
                            <div className={classes.sectionHeader}>
                                <h2 className={classes.sectionTitle}>Ingredients</h2>
                            </div>
                            {recipe.recipe_ingredients && recipe.recipe_ingredients.length > 0 ? (
                                <div className={classes.ingredientsList}>
                                    {recipe.recipe_ingredients.map((ingredient, index) => (
                                        <div
                                            className={classes.ingredientRow}
                                            key={index}
                                        >
                                            <span className={classes.ingredientName}>
                                                {ingredient?.ingredient?.name || 'Unknown'}
                                            </span>
                                            <span className={classes.ingredientQuantity}>
                                                {ingredient.quantity_as_text || '-'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={classes.emptyState}>
                                    No ingredients added yet. Click Edit to add some.
                                </div>
                            )}
                        </div>

                        <div className={classes.divider} />

                        {/* Nutrition Section */}
                        <div className={classes.section}>
                            <div className={classes.sectionHeader}>
                                <h2 className={classes.sectionTitle}>Nutrition</h2>
                            </div>
                            {hasNutrition ? (
                                <div className={classes.nutritionGrid}>
                                    {recipe.total_calories && (
                                        <div className={`${classes.nutritionCard} ${classes.nutritionCardCalories}`}>
                                            <span className={classes.nutritionLabel}>Calories</span>
                                            <span className={classes.nutritionValue}>{recipe.total_calories}</span>
                                        </div>
                                    )}
                                    {recipe.total_protein && (
                                        <div className={classes.nutritionCard}>
                                            <span className={classes.nutritionLabel}>Protein</span>
                                            <span className={classes.nutritionValue}>{recipe.total_protein}g</span>
                                        </div>
                                    )}
                                    {recipe.total_carbohydrates && (
                                        <div className={classes.nutritionCard}>
                                            <span className={classes.nutritionLabel}>Carbs</span>
                                            <span className={classes.nutritionValue}>
                                                {recipe.total_carbohydrates}g
                                            </span>
                                        </div>
                                    )}
                                    {recipe.total_fats && (
                                        <div className={classes.nutritionCard}>
                                            <span className={classes.nutritionLabel}>Fats</span>
                                            <span className={classes.nutritionValue}>{recipe.total_fats}g</span>
                                        </div>
                                    )}
                                    {recipe.total_fiber && (
                                        <div className={classes.nutritionCard}>
                                            <span className={classes.nutritionLabel}>Fiber</span>
                                            <span className={classes.nutritionValue}>{recipe.total_fiber}g</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className={classes.emptyState}>
                                    No nutrition info added yet. Click Edit to add some.
                                </div>
                            )}
                        </div>

                        <div className={classes.divider} />

                        {/* Instructions Section */}
                        <div className={classes.section}>
                            <div className={classes.sectionHeader}>
                                <h2 className={classes.sectionTitle}>Instructions</h2>
                            </div>
                            {recipe.instructions &&
                            Array.isArray(recipe.instructions) &&
                            recipe.instructions.length > 0 ? (
                                <div className={classes.instructionsList}>
                                    {recipe.instructions.map((instruction, index) => (
                                        <div
                                            className={classes.instructionItem}
                                            key={index}
                                        >
                                            <span className={classes.instructionNumber}>{index + 1}</span>
                                            <span className={classes.instructionText}>{instruction}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : recipe.instructions_as_text ? (
                                <p className={classes.instructionsPlainText}>{recipe.instructions_as_text}</p>
                            ) : (
                                <div className={classes.emptyState}>
                                    No instructions added yet. Click Edit to add some.
                                </div>
                            )}
                        </div>
                    </div>
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
