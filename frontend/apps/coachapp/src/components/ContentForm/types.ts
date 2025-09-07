import {CreateContentProps, InstructionsType} from '@/api/contents.ts';

export interface FormValues extends CreateContentProps {
    instructions_type?: InstructionsType;
    exercise_metadata?: any;
    food_metadata?: any;
    recipe_metadata?: any;
}
