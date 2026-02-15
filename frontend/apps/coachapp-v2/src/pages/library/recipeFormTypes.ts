export type RecipeFormIngredient = {
  amount: string;
  food_id: string;
  unit: string;
  weight_g: string;
};

export type RecipeFormValues = {
  calories: string;
  carbs: string;
  category: string;
  cooked_weight_g: string;
  fat: string;
  image_url: string;
  ingredients: RecipeFormIngredient[];
  instructions: string;
  name: string;
  protein: string;
  service_size_type: 'serving_based' | 'weight_based';
  serving_sizes: {
    amount: string;
    unit: string;
    weight_g: string;
  }[];
  source: string;
  tags: string[];
};
