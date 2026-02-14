import { Card } from "@heroui/react";
import { Apple, MessageSquareText, Ruler, Tag } from "lucide-react";

import type { Food } from "@/api/foods";

function formatMacros(macros: Record<string, number> | undefined) {
  if (!macros) return null;
  const protein = macros.protein ?? macros.protein_g ?? 0;
  const carbs = macros.carbs ?? macros.carbs_g ?? 0;
  const fat = macros.fat ?? macros.fat_g ?? 0;
  const calories = macros.calories ?? macros.kcal ?? 0;

  return { calories, carbs, fat, protein };
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

type FoodCardProps = {
  onEdit: (food: Food) => void;
  food: Food;
};

export default function FoodCard({ food, onEdit }: FoodCardProps) {
  const macros = formatMacros(food.macros);
  const servingCount = food.serving_sizes?.length ?? 1;
  const defaultServing = food.serving_sizes?.[0];
  const servingText = defaultServing
    ? `${defaultServing.amount ?? 1} ${defaultServing.unit ?? "serving"}`.trim()
    : "1 serving";

  return (
    <Card
      className="h-full cursor-pointer border border-separator bg-surface p-4 text-left transition-none hover:bg-surface-secondary"
      onClick={() => onEdit(food)}
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <Apple className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-semibold text-foreground">
                {food.name}
              </span>
              <span className="truncate text-sm text-muted">
                Food / Ingredient
              </span>
            </div>
          </div>
        </div>

        {macros ? (
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">Cal</span>
              <span className="font-semibold text-foreground">
                {Math.round(macros.calories)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">Pro</span>
              <span className="font-semibold text-foreground">
                {Math.round(macros.protein)}g
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">Carb</span>
              <span className="font-semibold text-foreground">
                {Math.round(macros.carbs)}g
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">Fat</span>
              <span className="font-semibold text-foreground">
                {Math.round(macros.fat)}g
              </span>
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-4 text-sm text-muted">
          <div className="flex items-center gap-1.5">
            <Ruler className="h-4 w-4" />
            <span>
              {servingCount} serving{servingCount > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Tag className="h-4 w-4" />
            <span>{servingText}</span>
          </div>
        </div>

        <div className="min-h-6">
          {food.tags && food.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {food.tags.slice(0, 3).map((tag) => (
                <span
                  className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-muted"
                  key={tag}
                >
                  {tag}
                </span>
              ))}
              {food.tags.length > 3 ? (
                <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-muted">
                  +{food.tags.length - 3}
                </span>
              ) : null}
            </div>
          ) : food.category ? (
            <div className="flex flex-wrap gap-1">
              <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-muted">
                {food.category}
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-separator pt-3 text-sm">
          <div className="flex items-center gap-2 text-muted">
            <span>{formatDate(food.updated_at)}</span>
            {food.notes ? <MessageSquareText className="h-4 w-4" /> : null}
          </div>
          <span className="text-xs text-muted">Tap to edit</span>
        </div>
      </div>
    </Card>
  );
}
