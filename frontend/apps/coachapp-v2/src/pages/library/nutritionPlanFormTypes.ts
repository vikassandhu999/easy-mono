export type NutritionPlanFormValues = {
  calories: string;
  carbs: string;
  description: string;
  fat: string;
  name: string;
  protein: string;
  status: 'active' | 'archived' | 'draft';
  tags: string[];
  type: 'personal' | 'template';
};
