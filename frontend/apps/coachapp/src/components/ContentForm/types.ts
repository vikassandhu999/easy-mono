import {CreateContentProps, InstructionsType} from '@/api/contents.ts';

export interface FormValues extends CreateContentProps {
    exercise_metadata?: any;
    food_metadata?: any;
    instructions_type?: InstructionsType;
    recipe_metadata?: any;
}
