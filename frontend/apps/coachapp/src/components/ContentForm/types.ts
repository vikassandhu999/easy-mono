import {CreateContentProps} from '@/store/services/contents';

// DEPRECATED: This component is not actively used. Use ContentBuilder instead.
export interface FormValues extends CreateContentProps {
    exercise_definition?: any;
    ingredient_definition?: any;
    recipe_definition?: any;
}
