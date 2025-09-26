import {Button, Group, Space, TextInput, useDrawersStack} from '@mantine/core';
import {IconPlus} from '@tabler/icons-react';

import RecipeCard from '@/components/RecipeCard';
import RecipeCreateDrawer from '@/components/RecipeCreateDrawer';

// Sample recipe data
const sampleRecipes = [
    {
        id: 1,
        name: 'Protein Rich Dalia',
        prepTime: '15 min',
        cookTime: '30 min',
        servings: 4,
        calories: '320 calories',
        groups: ['Vegetarian', 'High Protein'],
        thumbnailUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=100&h=100&fit=crop&crop=center',
    },
    {
        id: 2,
        name: 'Grilled Chicken Salad',
        prepTime: '10 min',
        cookTime: '20 min',
        servings: 2,
        calories: '280 calories',
        groups: ['Low Carb', 'High Protein'],
        thumbnailUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop&crop=center',
    },
    {
        id: 3,
        name: 'Quinoa Power Bowl',
        prepTime: '20 min',
        cookTime: '25 min',
        servings: 3,
        calories: '450 calories',
        groups: ['Vegan', 'Gluten Free'],
        thumbnailUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=100&h=100&fit=crop&crop=center',
    },
    {
        id: 4,
        name: 'Mediterranean Pasta',
        prepTime: '12 min',
        cookTime: '18 min',
        servings: 4,
        calories: '380 calories',
        groups: ['Vegetarian', 'Mediterranean'],
        thumbnailUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=100&h=100&fit=crop&crop=center',
    },
];

const RecipeListPage = () => {
    const stack = useDrawersStack(['create-recipe']);

    return (
        <>
            <RecipeCreateDrawer stack={stack} />
            <Group
                align="start"
                justify="space-between"
                wrap="nowrap"
            >
                <TextInput
                    flex={1}
                    placeholder="Search recipes.."
                    size="sm"
                />
                <Button
                    onClick={() => {
                        stack.open('create-recipe');
                    }}
                    rightSection={<IconPlus size={16} />}
                    size="sm"
                >
                    Create Recipe
                </Button>
            </Group>

            {sampleRecipes.map((recipe) => (
                <>
                    <RecipeCard
                        calories={recipe.calories}
                        cookTime={recipe.cookTime}
                        groups={recipe.groups}
                        key={recipe.id}
                        name={recipe.name}
                        prepTime={recipe.prepTime}
                        servings={recipe.servings}
                        thumbnailUrl={recipe.thumbnailUrl}
                    />
                    <Space h="md" />
                </>
            ))}
        </>
    );
};
export default RecipeListPage;
