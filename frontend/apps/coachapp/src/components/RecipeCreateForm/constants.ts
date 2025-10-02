import {
    IconCarrot,
    IconFish,
    IconGrain,
    IconHeart,
    IconLeaf,
    IconMeat,
    IconMilkOff,
    IconSalad,
    IconScale,
    IconStethoscope,
} from '@tabler/icons-react';

// Recipe form constants

// Difficulty options for recipes
export const DIFFICULTY_OPTIONS = [
    {label: 'Easy', value: 'easy'},
    {label: 'Medium', value: 'medium'},
    {label: 'Hard', value: 'hard'},
];

// Default difficulty level
export const DEFAULT_DIFFICULTY = 'medium';

// Meal type options
export const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Appetizer', 'Side Dish'];

// Cooking method options
export const COOKING_METHODS = [
    'Baking',
    'Grilling',
    'Stovetop',
    'No Cook',
    'Slow Cooker',
    'Instant Pot',
    'Air Fryer',
    'Microwave',
    'Roasting',
    'Steaming',
    'Sautéing',
    'Boiling',
];

// Diet type options with icons
export const DIET_TYPES = [
    {label: 'Vegetarian', value: 'Vegetarian', icon: IconCarrot},
    {label: 'Vegan', value: 'Vegan', icon: IconLeaf},
    {label: 'Gluten Free', value: 'Gluten Free', icon: IconGrain},
    {label: 'Dairy Free', value: 'Dairy Free', icon: IconMilkOff},
    {label: 'Keto', value: 'Keto', icon: IconMeat},
    {label: 'Paleo', value: 'Paleo', icon: IconFish},
    {label: 'Low Carb', value: 'Low Carb', icon: IconScale},
    {label: 'High Protein', value: 'High Protein', icon: IconMeat},
    {label: 'Mediterranean', value: 'Mediterranean', icon: IconSalad},
    {label: 'Heart Healthy', value: 'Heart Healthy', icon: IconHeart},
    {label: 'Diabetic Friendly', value: 'Diabetic Friendly', icon: IconStethoscope},
];

// Diet type options as simple array (for backward compatibility)
export const DIET_TYPE_VALUES = DIET_TYPES.map((diet) => diet.value);

// Default form values
export const DEFAULT_FORM_VALUES = {
    cook_time_minutes: 15,
    cooking_methods: [],
    description: '',
    diet_types: [],
    difficulty: DEFAULT_DIFFICULTY,
    duration: 30,
    equipment_needed: [],
    instructions: '',
    meal_prep_friendly: false,
    meal_types: [],
    name: '',
    prep_time_minutes: 15,
    servings: 4,
    storage_instructions: [],
    // Nutrition initial values
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fats_g: 0,
    fiber_g: 0,
    sugar_g: 0,
};

// Form validation constraints
export const VALIDATION_CONSTRAINTS = {
    name: {
        minLength: 3,
        maxLength: 255,
    },
    description: {
        maxLength: 500,
    },
    servings: {
        min: 1,
        max: 20,
    },
    time: {
        min: 0,
        max: 300,
    },
};
