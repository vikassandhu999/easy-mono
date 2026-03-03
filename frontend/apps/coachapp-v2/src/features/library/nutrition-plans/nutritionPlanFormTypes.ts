import type {MacroFormFields, ResourceStatus} from '@/features/library/libraryFormShared';

export type NutritionPlanFormValues = {
  calories: MacroFormFields['calories'];
  carbs: MacroFormFields['carbs'];
  description: string;
  fat: MacroFormFields['fat'];
  name: string;
  protein: MacroFormFields['protein'];
  status: ResourceStatus;
  tags: string[];
  type: 'personal' | 'template';
};
