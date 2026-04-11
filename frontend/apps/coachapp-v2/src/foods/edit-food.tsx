import {Button, Spinner} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useState} from 'react';
import {Navigate, useNavigate, useParams} from 'react-router-dom';

import type {ServingSize} from '@/api/shared';

import PageLayout from '@/@components/page-layout';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetFoodQuery, useUpdateFoodMutation} from '@/api/foods';
import {applyFormErrors, normalizeMacros} from '@/api/shared';
import FoodForm, {type FoodFormValues, useFoodForm} from '@/foods/components/food-form';

/** Build the macros Record from form values, omitting empty fields */
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

/**
 * Inner component rendered only when food data is available.
 * This avoids the need for useEffect to sync server state into local state,
 * which the React Compiler lint rule forbids.
 */
function EditFoodForm({backPath, foodId}: {backPath: string; foodId: string}) {
  const navigate = useNavigate();
  const goBack = useGoBack(backPath);
  const {data} = useGetFoodQuery(foodId);
  const [updateFood, {isLoading: isUpdating}] = useUpdateFoodMutation();

  const food = data!.data;
  const macros = normalizeMacros(food.macros);

  const [servingSizes, setServingSizes] = useState<ServingSize[]>(food.serving_sizes);

  const form = useFoodForm({
    values: {
      name: food.name,
      category: food.category ?? '',
      source: food.source ?? '',
      notes: food.notes ?? '',
      calories_per_100g: macros.calories_per_100g ?? '',
      protein_g: macros.protein_g ?? '',
      carbs_g: macros.carbs_g ?? '',
      fats_g: macros.fats_g ?? '',
      fiber_g: macros.fiber_g ?? '',
      sugar_g: macros.sugar_g ?? '',
    },
  });

  const onSubmit = async (formData: FoodFormValues) => {
    try {
      const builtMacros = buildMacros(formData);
      const body = {
        name: formData.name,
        category: formData.category || undefined,
        source: formData.source || undefined,
        notes: formData.notes || undefined,
        ...(builtMacros ? {macros: builtMacros} : {}),
        serving_sizes: servingSizes,
      };
      await updateFood({body, id: foodId}).unwrap();
      navigate(backPath);
    } catch (err) {
      applyFormErrors(err, 'Failed to update food. Please try again.', form.setError);
    }
  };

  return (
    <PageLayout
      description={food.name}
      title="Edit Food"
    >
      <div className="mb-4">
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Back
        </Button>
      </div>

      <FoodForm
        form={form}
        isSubmitting={isUpdating}
        onCancel={() => navigate(backPath)}
        onServingSizesChange={setServingSizes}
        onSubmit={onSubmit}
        servingSizes={servingSizes}
        submitLabel="Save Changes"
        submittingLabel="Saving..."
      />
    </PageLayout>
  );
}

export default function EditFood() {
  const {id} = useParams<{id: string}>();
  const {data, isError, isLoading: isFetching} = useGetFoodQuery(id!);
  const backPath = `/library/foods/${id}`;
  const goBackOuter = useGoBack(backPath);

  if (isFetching || !data) {
    return (
      <PageLayout title="Edit Food">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout title="Edit Food">
        <div className="mb-4">
          <Button
            onPress={goBackOuter}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
        </div>
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center text-sm text-danger">
          Failed to load food.
        </div>
      </PageLayout>
    );
  }

  // Guard: system foods cannot be edited — redirect to detail page
  if (data.data.source === 'system') {
    return (
      <Navigate
        replace
        to={backPath}
      />
    );
  }

  return (
    <EditFoodForm
      backPath={backPath}
      foodId={id!}
    />
  );
}
