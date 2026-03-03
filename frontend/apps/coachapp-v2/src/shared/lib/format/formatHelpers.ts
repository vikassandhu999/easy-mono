export const formatDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

export type FormattedMacros = {
  calories: number;
  carbs: number;
  fat: number;
  protein: number;
};

export const formatMacros = (macros: Record<string, number> | undefined): FormattedMacros | null => {
  if (!macros) {
    return null;
  }

  return {
    calories: macros.calories ?? macros.kcal ?? 0,
    carbs: macros.carbs ?? macros.carbs_g ?? 0,
    fat: macros.fat ?? macros.fat_g ?? 0,
    protein: macros.protein ?? macros.protein_g ?? 0,
  };
};

export const toSentenceCase = (snake: string): string => {
  return snake
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};
