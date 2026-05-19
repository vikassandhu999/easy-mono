import {Button} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';

import type {Food} from '@/api/foods';
import type {ServingSize} from '@/api/shared';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useCreateFoodMutation} from '@/api/foods';
import {applyFormErrors, normalizeMacros} from '@/api/shared';
import FoodForm, {type FoodFormValues, useFoodForm} from '@/foods/components/food-form';

function buildMacros(data: FoodFormValues): Record<string, number> | undefined {
  const macros: Record<string, number> = {};
  const keys = ['calories_per_100g', 'protein_g', 'carbs_g', 'fats_g', 'fiber_g', 'sugar_g'] as const;
  for (const key of keys) {
    const val = data[key];
    if (val !== '' && val !== undefined && typeof val === 'number') {
      macros[key] = val;
    }
  }
  return Object.keys(macros).length > 0 ? macros : undefined;
}

export default function CreateFood() {
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = useGoBack(ROUTES.FOODS);
  const [createFood, {isLoading}] = useCreateFoodMutation();

  // Duplicate pre-fill: read food data passed via route state
  const duplicateFrom = (location.state as null | {duplicateFrom?: Food})?.duplicateFrom ?? null;

  const duplicateFormValues = useMemo<FoodFormValues | undefined>(() => {
    if (!duplicateFrom) return undefined;
    const m = normalizeMacros(duplicateFrom.macros);
    return {
      name: `${duplicateFrom.name} (copy)`,
      category: duplicateFrom.category ?? '',
      source: '', // Clear source — this will be a coach-owned food
      notes: duplicateFrom.notes ?? '',
      calories_per_100g: m.calories_per_100g ?? '',
      protein_g: m.protein_g ?? '',
      carbs_g: m.carbs_g ?? '',
      fats_g: m.fats_g ?? '',
      fiber_g: m.fiber_g ?? '',
      sugar_g: m.sugar_g ?? '',
    };
  }, [duplicateFrom]);

  const [servingSizes, setServingSizes] = useState<ServingSize[]>(duplicateFrom?.serving_sizes ?? []);

  const form = useFoodForm(duplicateFormValues ? {defaultValues: duplicateFormValues} : undefined);

  const onSubmit = async (data: FoodFormValues) => {
    try {
      const macros = buildMacros(data);
      const body = {
        name: data.name,
        ...(data.category && {category: data.category}),
        ...(data.source && {source: data.source}),
        ...(data.notes && {notes: data.notes}),
        ...(macros && {macros}),
        ...(servingSizes.length > 0 && {serving_sizes: servingSizes}),
      };
      const result = await createFood(body).unwrap();
      navigate(`/library/foods/${result.data.id}`, {replace: true});
    } catch (err) {
      applyFormErrors(err, 'Failed to create food. Please try again.', form.setError);
    }
  };

  return (
    <PageLayout
      description="Add a new food item to your library."
      title="Create Food"
    >
      <div className="mb-4">
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Foods
        </Button>
      </div>

      <FoodForm
        form={form}
        isSubmitting={isLoading}
        onCancel={() => navigate(ROUTES.FOODS)}
        onServingSizesChange={setServingSizes}
        onSubmit={onSubmit}
        servingSizes={servingSizes}
        submitLabel="Create Food"
        submittingLabel="Creating..."
      />
    </PageLayout>
  );
}
