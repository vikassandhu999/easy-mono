import {Button, Spinner} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useNavigate, useParams} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {useGetFoodQuery, useUpdateFoodMutation} from '@/api/foods';
import {applyFormErrors} from '@/api/shared';
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

export default function EditFood() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const {data, isLoading: isFetching} = useGetFoodQuery(id!);
  const [updateFood, {isLoading: isUpdating}] = useUpdateFoodMutation();

  const food = data?.data;
  const backPath = `/library/foods/${id}`;

  const form = useFoodForm({
    values: food
      ? {
          name: food.name,
          category: food.category ?? '',
          source: food.source ?? '',
          notes: food.notes ?? '',
          calories_per_100g: food.macros.calories_per_100g ?? '',
          protein_g: food.macros.protein_g ?? '',
          carbs_g: food.macros.carbs_g ?? '',
          fats_g: food.macros.fats_g ?? '',
          fiber_g: food.macros.fiber_g ?? '',
          sugar_g: food.macros.sugar_g ?? '',
        }
      : undefined,
  });

  if (isFetching || !food) {
    return (
      <PageLayout title="Edit Food">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  const onSubmit = async (formData: FoodFormValues) => {
    try {
      const macros = buildMacros(formData);
      const body = {
        name: formData.name,
        category: formData.category || undefined,
        source: formData.source || undefined,
        notes: formData.notes || undefined,
        ...(macros ? {macros} : {}),
      };
      await updateFood({body, id: id!}).unwrap();
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
          onPress={() => navigate(backPath)}
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
        onSubmit={onSubmit}
        submitLabel="Save Changes"
        submittingLabel="Saving..."
      />
    </PageLayout>
  );
}
