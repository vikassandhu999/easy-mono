import {Recipe} from '@/services/recipes';

export const getDefaultValues = () => ({
    name: '',
    description: '',
    instructions: [],
    instructions_as_text: '',
    prep_time_minutes: undefined,
    servings: undefined,
    recipe_ingredients: undefined,
    total_calories: undefined,
    total_protein: undefined,
    total_carbohydrates: undefined,
    total_fats: undefined,
    total_fiber: undefined,
    status: 'active',
});

export const populateRecipe = (recipe: Recipe) => ({
    name: recipe.name,
    description: recipe.description || '',
    instructions: recipe.instructions || [],
    instructions_as_text: recipe.instructions_as_text || '',

    recipe_ingredients: recipe.recipe_ingredients,

    prep_time_minutes: recipe.prep_time_minutes || undefined,
    servings: recipe.servings || undefined,

    total_calories: recipe.total_calories ? Number(recipe.total_calories) : undefined,
    total_protein: recipe.total_protein ? Number(recipe.total_protein) : undefined,
    total_carbohydrates: recipe.total_carbohydrates ? Number(recipe.total_carbohydrates) : undefined,
    total_fats: recipe.total_fats ? Number(recipe.total_fats) : undefined,
    total_fiber: recipe.total_fiber ? Number(recipe.total_fiber) : undefined,
    status: recipe.status,
});

export const containsNutrition = (recipe: Recipe) => {
    return (
        recipe.total_calories ||
        recipe.total_protein ||
        recipe.total_carbohydrates ||
        recipe.total_fats ||
        recipe.total_fiber
    );
};
