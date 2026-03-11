import type {Meal} from '@/entities/meals/api/meals';
import type {PlanItem} from '@/entities/nutritionPlans/api/nutritionPlans';

export type ConfirmDialogState = {
  confirmLabel: string;
  description: string;
  isOpen: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  title: string;
};

export type CopyDayDialogState = {
  dayMealCounts: Record<string, number>;
  isOpen: boolean;
  onConfirm: (targetDay: string) => void;
  onOpenChange: (open: boolean) => void;
  sourceDay: string;
};

export type PendingConfirm = {
  confirmLabel: string;
  description: string;
  onConfirm: () => void;
  title: string;
};

export type PendingCopyDay = {
  sourceDay: string;
};

export type NutritionPlanBuilderData = {
  effectivePlanItems: PlanItem[];
  itemsByDay: Record<string, PlanItem[]>;
  meals: Meal[];
  mealsById: Record<string, Meal>;
  mealUsageCount: number;
  setPlanItemsOverride: (items: null | PlanItem[]) => void;
};

export type UseNutritionPlanBuilderActionsResult = {
  confirmDialog: ConfirmDialogState | null;
  copyDayDialog: CopyDayDialogState | null;
  dayActions: {
    onClearDay: (day: string) => void;
    onCopyDay: (day: string) => void;
    onCreateMealForDay: (day: string, mealName: string, mealType: string) => Promise<void>;
    onLinkMealToDay: (day: string, mealId: string, mealType: string) => Promise<void>;
  };
  duplicatePlan: () => void;
  isDuplicatingAssignment: boolean;
  isDuplicatingPlan: boolean;
  itemActions: {
    onDuplicateForDay: (planItem: PlanItem) => void;
    onEditAssignment: (planItem: PlanItem) => void;
    onEditMeal: (mealId: string) => void;
    onRemoveFromDay: (planItemId: string) => void;
  };
  itemsByDay: Record<string, PlanItem[]>;
  meals: Meal[];
  mealsById: Record<string, Meal>;
  mealUsageCount: number;
};
