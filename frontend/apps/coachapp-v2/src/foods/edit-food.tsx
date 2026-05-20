import {Button, Spinner, Typography} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useState} from 'react';
import {Navigate, useParams} from 'react-router-dom';

import type {ServingSize} from '@/api/shared';

import {Page} from '@/@components/page';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetFoodQuery, useUpdateFoodMutation} from '@/api/foods';
import {applyFormErrors, normalizeMacros} from '@/api/shared';
import FoodForm, {type FoodFormValues, useFoodForm} from '@/foods/food-form';

function buildMacros(data: FoodFormValues): Record<string, number> | undefined {
  const macros: Record<string, number> = {};
  const keys = ['calories_per_100g', 'protein_g', 'carbs_g', 'fats_g', 'fiber_g', 'sugar_g'] as const;
  for (const key of keys) {
    const val = data[key];
    if (val !== undefined) {
      macros[key] = val;
    }
  }
  return Object.keys(macros).length > 0 ? macros : undefined;
}

// Rendered only when food data is available, avoiding useEffect to sync server state
// into local state (which the React Compiler lint rule forbids).
function EditFoodForm({backPath, foodId}: {backPath: string; foodId: string}) {
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
      calories_per_100g: macros.calories_per_100g,
      protein_g: macros.protein_g,
      carbs_g: macros.carbs_g,
      fats_g: macros.fats_g,
      fiber_g: macros.fiber_g,
      sugar_g: macros.sugar_g,
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
      goBack();
    } catch (err) {
      applyFormErrors(err, "Food wasn't updated. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>Edit food</Page.Title>
          <Page.Description>{food.name}</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Toolbar>
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Food
        </Button>
      </Page.Toolbar>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <FoodForm
          form={form}
          isSubmitting={isUpdating}
          onCancel={goBack}
          onServingSizesChange={setServingSizes}
          onSubmit={onSubmit}
          servingSizes={servingSizes}
          submitLabel="Save changes"
          submittingLabel="Saving changes"
        />
      </Page.Content>
    </Page>
  );
}

export default function EditFood() {
  const {id} = useParams<{id: string}>();
  const {data, isError, isLoading: isFetching} = useGetFoodQuery(id!);
  const backPath = `/library/foods/${id}`;
  const goBackOuter = useGoBack(backPath);

  if (isFetching || !data) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Edit food</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <Spinner color="accent" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  if (isError) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Edit food</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Toolbar>
          <Button
            onPress={goBackOuter}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Food
          </Button>
        </Page.Toolbar>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center">
            <Typography
              className="text-danger"
              type="body-sm"
            >
              Food couldn't load
            </Typography>
          </div>
        </Page.Content>
      </Page>
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
