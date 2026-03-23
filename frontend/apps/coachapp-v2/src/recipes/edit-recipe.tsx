import {Button, Spinner} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useNavigate, useParams} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {useGetRecipeQuery, useUpdateRecipeMutation} from '@/api/recipes';
import {applyFormErrors} from '@/api/shared';
import RecipeForm, {type RecipeFormValues, useRecipeForm} from '@/recipes/components/recipe-form';

/** Build the macros Record from form values, omitting empty fields */
function buildMacros(data: RecipeFormValues): Record<string, number> | undefined {
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

export default function EditRecipe() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const {data, isLoading: isFetching} = useGetRecipeQuery(id!);
  const [updateRecipe, {isLoading: isUpdating}] = useUpdateRecipeMutation();

  const recipe = data?.data;
  const backPath = `/library/recipes/${id}`;

  const form = useRecipeForm({
    values: recipe
      ? {
          name: recipe.name,
          category: recipe.category ?? '',
          source: recipe.source ?? '',
          instructions: recipe.instructions ?? '',
          cooked_weight_g: recipe.cooked_weight_g ?? '',
          calories_per_100g: recipe.macros.calories_per_100g ?? '',
          protein_g: recipe.macros.protein_g ?? '',
          carbs_g: recipe.macros.carbs_g ?? '',
          fats_g: recipe.macros.fats_g ?? '',
          fiber_g: recipe.macros.fiber_g ?? '',
          sugar_g: recipe.macros.sugar_g ?? '',
        }
      : undefined,
  });

  if (isFetching || !recipe) {
    return (
      <PageLayout title="Edit Recipe">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  const onSubmit = async (formData: RecipeFormValues) => {
    try {
      const macros = buildMacros(formData);
      const cookedWeight = formData.cooked_weight_g;
      const body = {
        name: formData.name,
        category: formData.category || undefined,
        source: formData.source || undefined,
        instructions: formData.instructions || undefined,
        ...(cookedWeight !== '' && cookedWeight !== undefined && typeof cookedWeight === 'number'
          ? {cooked_weight_g: cookedWeight}
          : {}),
        ...(macros ? {macros} : {}),
      };
      await updateRecipe({body, id: id!}).unwrap();
      navigate(backPath);
    } catch (err) {
      applyFormErrors(err, 'Failed to update recipe. Please try again.', form.setError);
    }
  };

  return (
    <PageLayout
      description={recipe.name}
      title="Edit Recipe"
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

      <RecipeForm
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
