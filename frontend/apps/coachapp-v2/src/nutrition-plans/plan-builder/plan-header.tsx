/**
 * PlanHeader — inline-editable plan name + macro TARGET fields.
 *
 * Renders the plan name as a large editable input and number inputs for each
 * daily macro target (calories, protein, carbs, fat). Each field
 * autosaves on blur via PATCH.
 *
 * Cache: optimistic updateQueryData('getNutritionPlan', {id: planId}, …) +
 * patch.undo() on failure + toast.danger. Mirrors the pattern used in
 * meal-card.tsx / amount-sheet.tsx. Skip-unchanged guard avoids no-op PATCHes.
 *
 * Header badge shows: "Target 2100 · 180P 200C 60F" (only set targets shown).
 */

import {Spinner, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {FormNumberField, FormTextField} from '@/@components/form-fields';
import type {NutritionPlan} from '@/api/generated';
import {coachApi, useUpdateNutritionPlanMutation} from '@/api/generated';
import {useAppDispatch} from '@/store';

// ---------------------------------------------------------------------------
// Schema + form values
// ---------------------------------------------------------------------------

const optionalNumber = z.number().min(0, 'Use 0 or higher').optional();

const planHeaderSchema = z.object({
  name: z.string().min(1, 'Enter plan name'),
  calories: optionalNumber,
  protein_g: optionalNumber,
  carbs_g: optionalNumber,
  fats_g: optionalNumber,
});

type PlanHeaderFormValues = z.infer<typeof planHeaderSchema>;

function planToFormValues(plan: NutritionPlan): PlanHeaderFormValues {
  return {
    name: plan.name,
    calories: plan.target_calories ?? undefined,
    protein_g: plan.target_protein_g ?? undefined,
    carbs_g: plan.target_carbs_g ?? undefined,
    fats_g: plan.target_fat_g ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Target summary badge
// ---------------------------------------------------------------------------

function TargetSummary({plan}: {plan: NutritionPlan}) {
  const kcalPart = plan.target_calories != null ? String(plan.target_calories) : '';

  const macroParts: string[] = [];
  if (plan.target_protein_g != null) {
    macroParts.push(`${plan.target_protein_g}P`);
  }
  if (plan.target_carbs_g != null) {
    macroParts.push(`${plan.target_carbs_g}C`);
  }
  if (plan.target_fat_g != null) {
    macroParts.push(`${plan.target_fat_g}F`);
  }

  const summary = [kcalPart, macroParts.join(' ')].filter(Boolean).join(' · ');

  if (summary.length === 0) {
    return <span className="text-xs text-muted">No targets set</span>;
  }

  return <span className="text-xs font-medium text-muted">Target {summary}</span>;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlanHeaderProps {
  plan: NutritionPlan;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlanHeader({plan}: PlanHeaderProps) {
  const dispatch = useAppDispatch();
  const [updatePlan, {isLoading: isSaving}] = useUpdateNutritionPlanMutation();

  const form = useForm<PlanHeaderFormValues>({
    defaultValues: planToFormValues(plan),
    resolver: zodResolver(planHeaderSchema),
    // Re-sync when the plan prop changes (e.g. after a successful PATCH).
    values: planToFormValues(plan),
  });

  const {control, getValues} = form;

  // Autosave on blur. Optimistic-update the cache; undo + toast on failure.
  const handleBlur = async (field: keyof PlanHeaderFormValues) => {
    const isValid = await form.trigger(field);
    if (!isValid) {
      return;
    }

    const values = getValues();

    // Build the PATCH body and determine whether anything actually changed.
    let changed = false;
    const body: {
      name?: string;
      target_calories?: number | null;
      target_protein_g?: number | null;
      target_carbs_g?: number | null;
      target_fat_g?: number | null;
    } = {};

    if (field === 'name') {
      const next = values.name;
      if (next !== plan.name) {
        body.name = next;
        changed = true;
      }
    } else if (field === 'calories') {
      const next = values.calories ?? null;
      if (next !== (plan.target_calories ?? null)) {
        body.target_calories = next;
        changed = true;
      }
    } else if (field === 'protein_g') {
      const next = values.protein_g ?? null;
      if (next !== (plan.target_protein_g ?? null)) {
        body.target_protein_g = next;
        changed = true;
      }
    } else if (field === 'carbs_g') {
      const next = values.carbs_g ?? null;
      if (next !== (plan.target_carbs_g ?? null)) {
        body.target_carbs_g = next;
        changed = true;
      }
    } else if (field === 'fats_g') {
      const next = values.fats_g ?? null;
      if (next !== (plan.target_fat_g ?? null)) {
        body.target_fat_g = next;
        changed = true;
      }
    }

    if (!changed) {
      return;
    }

    // Optimistic update — merge body fields into the cached plan.
    const patch = dispatch(
      coachApi.util.updateQueryData('getNutritionPlan', {id: plan.id}, (draft) => {
        if (body.name !== undefined) {
          draft.data.name = body.name;
        }
        if ('target_calories' in body) {
          draft.data.target_calories = body.target_calories;
        }
        if ('target_protein_g' in body) {
          draft.data.target_protein_g = body.target_protein_g;
        }
        if ('target_carbs_g' in body) {
          draft.data.target_carbs_g = body.target_carbs_g;
        }
        if ('target_fat_g' in body) {
          draft.data.target_fat_g = body.target_fat_g;
        }
      }),
    );

    try {
      await updatePlan({
        id: plan.id,
        nutritionPlanRequest: {
          // name is required in the request type — always send the current name.
          name: body.name ?? plan.name,
          ...body,
        },
      }).unwrap();
    } catch {
      patch.undo();
      toast.danger("Couldn't save changes");
    }
  };

  return (
    <div className="w-full space-y-3 py-4">
      {/* Section label + saving indicator + target summary */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Plan details</span>
        {isSaving ? (
          <Spinner
            color="accent"
            size="sm"
          />
        ) : (
          <TargetSummary plan={plan} />
        )}
      </div>

      {/* Plan name — large inline input */}
      <FormTextField
        control={control}
        inputProps={{
          className:
            'bg-transparent border-0 border-b border-border rounded-none px-0 text-xl font-semibold focus:border-[#6c8cff] focus:ring-0 transition-colors placeholder:text-muted',
          placeholder: 'Plan name',
        }}
        label=""
        name="name"
        onFieldBlur={() => handleBlur('name')}
      />

      {/* Macro targets — two-column grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FormNumberField
          control={control}
          label="Calories (kcal)"
          minValue={0}
          name="calories"
          onFieldBlur={() => handleBlur('calories')}
          step={1}
        />
        <FormNumberField
          control={control}
          label="Protein (g)"
          minValue={0}
          name="protein_g"
          onFieldBlur={() => handleBlur('protein_g')}
          step={0.1}
        />
        <FormNumberField
          control={control}
          label="Carbs (g)"
          minValue={0}
          name="carbs_g"
          onFieldBlur={() => handleBlur('carbs_g')}
          step={0.1}
        />
        <FormNumberField
          control={control}
          label="Fat (g)"
          minValue={0}
          name="fats_g"
          onFieldBlur={() => handleBlur('fats_g')}
          step={0.1}
        />
      </div>
    </div>
  );
}
