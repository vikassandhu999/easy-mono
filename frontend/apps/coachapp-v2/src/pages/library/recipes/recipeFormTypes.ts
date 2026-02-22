import type {MacroFormFields, ServingSizeFormRow} from '@/pages/library/libraryFormShared';

export type RecipeFormIngredient = {
  amount: string;
  food_id: string;
  unit: string;
  weight_g: string;
};

export type RecipeFormValues = {
  calories: MacroFormFields['calories'];
  carbs: MacroFormFields['carbs'];
  category: string;
  cooked_weight_g: string;
  fat: MacroFormFields['fat'];
  image_url: string;
  ingredients: RecipeFormIngredient[];
  instructions: string;
  name: string;
  protein: MacroFormFields['protein'];
  service_size_type: 'serving_based' | 'weight_based';
  serving_sizes: ServingSizeFormRow[];
  source: string;
  tags: string[];
};
