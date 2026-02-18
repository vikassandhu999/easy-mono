import { z } from "zod";

type MacroField = "calories" | "carbs" | "fat" | "protein";

type MacroValues = {
  calories: string;
  carbs: string;
  fat: string;
  protein: string;
};

type ServingSizeValue = {
  amount: string;
  unit: string;
  weight_g: string;
};

export const CALORIES_MAX = 5000;
export const MACRO_GRAMS_MAX = 1000;
export const URL_MESSAGE = "Image URL must be a valid URL.";

export const validateMacroField = (
  ctx: z.RefinementCtx,
  values: MacroValues,
  field: MacroField,
  label: string,
  max: number,
) => {
  const raw = values[field];
  if (!raw.trim()) {
    return;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${label} must be a valid number.`,
      path: [field],
    });
    return;
  }

  if (parsed < 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${label} must be 0 or more.`,
      path: [field],
    });
    return;
  }

  if (parsed > max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${label} seems too high (max ${max}).`,
      path: [field],
    });
  }
};

export const validateImageUrl = (
  ctx: z.RefinementCtx,
  url: string,
  path: Array<number | string> = ["image_url"],
) => {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return;
  }

  const result = z.string().url(URL_MESSAGE).safeParse(trimmedUrl);
  if (!result.success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: URL_MESSAGE,
      path,
    });
  }
};

export const validateServingSizes = (
  ctx: z.RefinementCtx,
  servingSizes: ServingSizeValue[],
) => {
  servingSizes.forEach((servingSize, index) => {
    const hasUnit = Boolean(servingSize.unit.trim());
    const hasWeight = Boolean(servingSize.weight_g.trim());
    const hasAmount = Boolean(servingSize.amount.trim());

    if (!hasUnit && !hasWeight && !hasAmount) {
      return;
    }

    if (!hasUnit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Serving size ${index + 1}: unit is required.`,
        path: ["serving_sizes", index, "unit"],
      });
    }

    if (hasWeight) {
      const weight = Number(servingSize.weight_g);
      if (!Number.isFinite(weight) || weight < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Serving size ${index + 1}: weight must be 0 or more.`,
          path: ["serving_sizes", index, "weight_g"],
        });
      }
    }

    if (hasAmount) {
      const amount = Number(servingSize.amount);
      if (!Number.isFinite(amount) || amount < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Serving size ${index + 1}: amount must be 0 or more.`,
          path: ["serving_sizes", index, "amount"],
        });
      }
    }
  });
};

export const createEmptyServingSize = () => ({
  amount: "",
  unit: "",
  weight_g: "",
});
