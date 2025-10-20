import type {TablerIcon} from '@tabler/icons-react';

import {
    IconArrowBigDownLines,
    IconArrowBigUpLines,
    IconBarbell,
    IconChefHat,
    IconFlame,
    IconHandStop,
    IconJumpRope,
    IconLeaf,
    IconOlympics,
    IconRun,
    IconSalad,
    IconStretching,
    IconTarget,
    IconTrophy,
} from '@tabler/icons-react';

/**
 * Shared constants for Content Builder forms
 *
 * Centralized configuration for form options, ensuring consistency
 * across Exercise and Recipe forms.
 */

export interface SelectOption {
    label: string;
    value: string;
}

export interface SelectOptionWithIcon extends SelectOption {
    icon: TablerIcon;
}

/**
 * Exercise Form Constants
 */

export const PRIMARY_MUSCLE_OPTIONS: SelectOption[] = [
    {label: 'Chest', value: 'chest'},
    {label: 'Back', value: 'back'},
    {label: 'Shoulders', value: 'shoulders'},
    {label: 'Biceps', value: 'biceps'},
    {label: 'Triceps', value: 'triceps'},
    {label: 'Forearms', value: 'forearms'},
    {label: 'Abs', value: 'abs'},
    {label: 'Obliques', value: 'obliques'},
    {label: 'Quads', value: 'quads'},
    {label: 'Hamstrings', value: 'hamstrings'},
    {label: 'Glutes', value: 'glutes'},
    {label: 'Calves', value: 'calves'},
    {label: 'Lower Back', value: 'lower_back'},
    {label: 'Traps', value: 'traps'},
];

export const EQUIPMENT_OPTIONS: SelectOption[] = [
    {label: 'Barbell', value: 'barbell'},
    {label: 'Dumbbell', value: 'dumbbell'},
    {label: 'Kettlebell', value: 'kettlebell'},
    {label: 'Resistance Band', value: 'resistance_band'},
    {label: 'Cable Machine', value: 'cable_machine'},
    {label: 'Bodyweight', value: 'bodyweight'},
    {label: 'Machine', value: 'machine'},
    {label: 'Smith Machine', value: 'smith_machine'},
    {label: 'TRX/Suspension', value: 'suspension'},
    {label: 'Medicine Ball', value: 'medicine_ball'},
    {label: 'Plate', value: 'plate'},
];

export const CATEGORY_OPTIONS: SelectOptionWithIcon[] = [
    {label: 'Strength', value: 'strength', icon: IconBarbell},
    {label: 'Cardio', value: 'cardio', icon: IconRun},
    {label: 'Plyometric', value: 'plyometric', icon: IconJumpRope},
    {label: 'Stretching', value: 'stretching', icon: IconStretching},
    {label: 'Olympic Weightlifting', value: 'olympic', icon: IconOlympics},
    {label: 'Powerlifting', value: 'powerlifting', icon: IconTrophy},
    {label: 'Strongman', value: 'strongman', icon: IconFlame},
];

export const LEVEL_OPTIONS: SelectOptionWithIcon[] = [
    {label: 'Beginner', value: 'beginner', icon: IconTarget},
    {label: 'Intermediate', value: 'intermediate', icon: IconTrophy},
    {label: 'Expert', value: 'expert', icon: IconOlympics},
];

export const FORCE_OPTIONS: SelectOptionWithIcon[] = [
    {label: 'Push', value: 'push', icon: IconArrowBigUpLines},
    {label: 'Pull', value: 'pull', icon: IconArrowBigDownLines},
    {label: 'Static', value: 'static', icon: IconHandStop},
];

export const MECHANICS_OPTIONS: SelectOptionWithIcon[] = [
    {label: 'Compound', value: 'compound', icon: IconBarbell},
    {label: 'Isolation', value: 'isolation', icon: IconTarget},
];

export const MOVEMENT_PATTERN_OPTIONS: SelectOption[] = [
    {label: 'Squat', value: 'squat'},
    {label: 'Hinge', value: 'hinge'},
    {label: 'Lunge', value: 'lunge'},
    {label: 'Push', value: 'push'},
    {label: 'Pull', value: 'pull'},
    {label: 'Carry', value: 'carry'},
    {label: 'Rotation', value: 'rotation'},
];

/**
 * Recipe Form Constants
 */

export const DIFFICULTY_OPTIONS: SelectOptionWithIcon[] = [
    {label: 'Easy', value: 'easy', icon: IconTrophy},
    {label: 'Medium', value: 'medium', icon: IconTrophy},
    {label: 'Hard', value: 'hard', icon: IconTrophy},
];

export const MEAL_TYPE_OPTIONS: SelectOptionWithIcon[] = [
    {label: 'Breakfast', value: 'breakfast', icon: IconChefHat},
    {label: 'Lunch', value: 'lunch', icon: IconSalad},
    {label: 'Dinner', value: 'dinner', icon: IconFlame},
    {label: 'Snack', value: 'snack', icon: IconLeaf},
    {label: 'Dessert', value: 'dessert', icon: IconChefHat},
    {label: 'Beverage', value: 'beverage', icon: IconLeaf},
];

export const DISH_TYPE_OPTIONS: SelectOptionWithIcon[] = [
    {label: 'Main Course', value: 'main', icon: IconFlame},
    {label: 'Side Dish', value: 'side', icon: IconSalad},
    {label: 'Appetizer', value: 'appetizer', icon: IconLeaf},
    {label: 'Salad', value: 'salad', icon: IconSalad},
    {label: 'Soup', value: 'soup', icon: IconFlame},
    {label: 'Smoothie', value: 'smoothie', icon: IconLeaf},
];

export const DIET_TYPE_OPTIONS: SelectOption[] = [
    {label: 'Vegan', value: 'vegan'},
    {label: 'Vegetarian', value: 'vegetarian'},
    {label: 'Gluten-Free', value: 'gluten_free'},
    {label: 'Dairy-Free', value: 'dairy_free'},
    {label: 'Keto', value: 'keto'},
    {label: 'Paleo', value: 'paleo'},
    {label: 'Low-Carb', value: 'low_carb'},
    {label: 'High-Protein', value: 'high_protein'},
];

export const COOKING_METHOD_OPTIONS: SelectOption[] = [
    {label: 'Baking', value: 'baking'},
    {label: 'Stovetop', value: 'stovetop'},
    {label: 'Grilling', value: 'grilling'},
    {label: 'No Cook', value: 'no_cook'},
    {label: 'Slow Cooker', value: 'slow_cooker'},
    {label: 'Instant Pot', value: 'instant_pot'},
    {label: 'Air Fryer', value: 'air_fryer'},
];

/**
 * Form Section Constants
 */

export const FORM_SECTIONS = [
    {
        label: 'Instructions',
        value: 'instructions',
    },
    {
        label: 'Advanced',
        value: 'advanced',
    },
] as const;
