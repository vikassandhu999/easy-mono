import {CreateContentProps, InstructionsType} from '@/Api/Contents';

export interface FormValues extends CreateContentProps {
    instructions_type?: InstructionsType;
    exercise_metadata?: any;
    food_metadata?: any;
    recipe_metadata?: any;
}
