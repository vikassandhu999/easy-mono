import {Button} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useCreateRecipeMutation} from '@/api/generated';
import {applyFormErrors} from '@/api/shared';
import type {IngredientItem} from '@/foods/components/ingredient-list';
import RecipeForm, {
  type RecipeFormValues,
  recipeToCreateRequest,
  useRecipeForm,
} from '@/recipes/recipe-form/recipe-form';

export default function CreateRecipe() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.RECIPES);
  const [createRecipe, {isLoading}] = useCreateRecipeMutation();
  const [ingredients, setIngredients] = useState<IngredientItem[]>([]);

  const form = useRecipeForm();

  const onSubmit = async (data: RecipeFormValues) => {
    try {
      const result = await createRecipe({recipeRequest: recipeToCreateRequest({ingredients, values: data})}).unwrap();
      navigate(`/library/recipes/${result.data.id}`, {replace: true});
    } catch (err) {
      applyFormErrors(err, "Recipe wasn't created. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <div className={'flex items-center gap-1'}>
            <Button
              onPress={goBack}
              size="md"
              variant="ghost"
              isIconOnly
            >
              <ArrowLeft size={20} />
            </Button>
            <Page.Title>Create recipe</Page.Title>
          </div>
          <Page.Description>Add ingredients, nutrition details, and instructions</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <div className="max-w-160 mt-4">
          <RecipeForm
            form={form}
            ingredients={ingredients}
            isSubmitting={isLoading}
            onCancel={goBack}
            onIngredientsChange={setIngredients}
            onSubmit={onSubmit}
            submitLabel="Create recipe"
            submittingLabel="Creating recipe"
          />
        </div>
      </Page.Content>
    </Page>
  );
}
