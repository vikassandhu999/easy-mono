export type FoodFormValues = {
  calories: string;
  carbs: string;
  category: string;
  fat: string;
  image_url: string;
  name: string;
  notes: string;
  protein: string;
  serving_sizes: {
    amount: string;
    unit: string;
    weight_g: string;
  }[];
  source: string;
  tags: string[];
};
