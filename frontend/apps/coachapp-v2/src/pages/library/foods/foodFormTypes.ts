import type {MacroFormFields, ServingSizeFormRow} from '@/pages/library/libraryFormShared';

export type FoodFormValues = {
  calories: MacroFormFields['calories'];
  carbs: MacroFormFields['carbs'];
  category: string;
  fat: MacroFormFields['fat'];
  image_url: string;
  name: string;
  notes: string;
  protein: MacroFormFields['protein'];
  serving_sizes: ServingSizeFormRow[];
  source: string;
  tags: string[];
};
