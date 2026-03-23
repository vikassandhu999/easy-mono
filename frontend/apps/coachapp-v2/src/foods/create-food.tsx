import {Button} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useCreateFoodMutation} from '@/api/foods';
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

export default function CreateFood() {
  const navigate = useNavigate();
  const [createFood, {isLoading}] = useCreateFoodMutation();

  const form = useFoodForm();

  const onSubmit = async (data: FoodFormValues) => {
    try {
      const macros = buildMacros(data);
      const body = {
        name: data.name,
        ...(data.category && {category: data.category}),
        ...(data.source && {source: data.source}),
        ...(data.notes && {notes: data.notes}),
        ...(macros && {macros}),
      };
      const result = await createFood(body).unwrap();
      navigate(`/library/foods/${result.data.id}`);
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
          onPress={() => navigate(ROUTES.FOODS)}
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
        onSubmit={onSubmit}
        submitLabel="Create Food"
        submittingLabel="Creating..."
      />
    </PageLayout>
  );
}
