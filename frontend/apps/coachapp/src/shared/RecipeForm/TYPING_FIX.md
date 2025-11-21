# RecipeForm Typing Fix

## Problems Fixed

The `RecipeForm` component had two major typing issues:

### 1. Create vs Update Type Mismatch

The form was being used for both **creating** and **updating** recipes, but the type system only recognized `CreateRecipeForm`:

- When **creating**, we use `CreateRecipeForm` (no `id` field)
- When **updating**, we need `UpdateRecipe` which is `Partial<CreateRecipeForm> & {id: string}`

### 2. Recipe Ingredients Data Format Mismatch

The API returns `RecipeIngredient` with `order: number | string`, but the form schema expects `order: number`. This caused type errors when loading existing recipes.

## Solutions Implemented

### Solution 1: Discriminated Union Types

We implemented a **discriminated union** approach that uses conditional types based on whether `recipeId` exists.

#### Updated Form Handle Type

```typescript
export type RecipeFormHandle<TMode extends "create" | "update" = "create"> =
  TMode extends "update"
    ? {
        getValues: () => CreateRecipeForm;
        reset: () => void;
        submit: () => Promise<void>;
      }
    : {
        getValues: () => CreateRecipeForm;
        reset: () => void;
        submit: () => Promise<void>;
      };
```

#### Discriminated Union for Props

```typescript
// Base props shared by both modes
interface RecipeFormPropsBase {
  initialValues?: Partial<CreateRecipeForm>;
}

// Discriminated union based on recipeId presence
export type RecipeFormProps =
  | (RecipeFormPropsBase & {
      recipeId: string;
      onSubmit?: (values: UpdateRecipe) => Promise<void> | void;
      ref?: React.Ref<RecipeFormHandle<"update">>;
    })
  | (RecipeFormPropsBase & {
      recipeId?: never;
      onSubmit?: (values: CreateRecipeForm) => Promise<void> | void;
      ref?: React.Ref<RecipeFormHandle<"create">>;
    });
```

#### Runtime Logic to Add ID

The form now automatically adds the `id` when in update mode:

```typescript
const onSubmitForm = async (values: CreateRecipeForm) => {
  try {
    if (onSubmit) {
      if (recipeId) {
        await (onSubmit as (values: UpdateRecipe) => Promise<void> | void)({
          ...values,
          id: recipeId,
        });
      } else {
        await (onSubmit as (values: CreateRecipeForm) => Promise<void> | void)(
          values,
        );
      }
    }
  } catch (error) {
    const err_msg = new APIErrorParser(error).humanize();
    notifyError(err_msg);
  }
};
```

### Solution 2: Recipe Ingredients Data Transformation

Added proper data transformation in `helper.ts` to map API format to form format:

```typescript
recipe_ingredients: recipe.recipe_ingredients?.map((ingredient) => ({
    name: undefined, // Will be populated from ingredient lookup in the UI
    order: typeof ingredient.order === 'string'
        ? parseInt(ingredient.order, 10)
        : ingredient.order,
    ingredient_id: ingredient.ingredient_id,
    quantity_as_text: ingredient.quantity_as_text || '',
})),
```

**Note**: The `name` field is set to `undefined` here because it will be populated by the `IngredientsField` component when ingredients are looked up or added. This field is used for UI display purposes (showing ingredient names in the form) and is filtered out before sending to the API.

## Updated Usage

### Create Mode (RecipeCreateDrawer)

```typescript
const recipeFormRef = useRef<RecipeFormHandle<'create'>>(null);

<RecipeForm
    onSubmit={async (values) => {
        // values is typed as CreateRecipeForm (no id)
        await createRecipe(values).unwrap();
    }}
    ref={recipeFormRef}
/>
```

### Update Mode (RecipeEditDrawer)

```typescript
const recipeFormRef = useRef<RecipeFormHandle<'update'>>(null);

<RecipeForm
    recipeId={recipeId}  // ✅ This triggers update mode
    onSubmit={async (values) => {
        // values is typed as UpdateRecipe (includes id)
        await updateRecipe(values).unwrap();  // No need to manually add id!
    }}
    ref={recipeFormRef}
/>
```

## Benefits

✅ **Type Safety**: TypeScript now enforces correct types based on mode  
✅ **DRY Principle**: The form handles adding the `id` internally  
✅ **Clear Intent**: Explicitly typed refs make it obvious whether you're creating or updating  
✅ **Data Transformation**: API data is properly mapped to form expectations  
✅ **Single Source of Truth**: The presence of `recipeId` determines the mode  
✅ **No Breaking Changes**: Backward compatible with existing usage

## Files Changed

1. **RecipeForm.tsx** - Updated types and added conditional logic for create/update
2. **helper.ts** - Added recipe_ingredients data transformation to convert order field
3. **RecipeEditDrawer.tsx** - Added `recipeId` prop, updated ref type, simplified onSubmit
4. **RecipeCreateDrawer.tsx** - Updated ref type to explicitly use 'create' mode

## Root Cause Analysis

### Why did the order field mismatch exist?

The backend API returns `order` as either `number | string` (likely due to database schema or serialization), but the frontend Zod schema was defined to only accept `number`. This created a type incompatibility when loading recipes from the API to populate the form.

### Why wasn't this caught earlier?

The original code had a `@ts-expect-error` comment that suppressed the type checking error:

```typescript
// @ts-expect-error - Type mismatch: Form requires 'name' field (populated in UI), API doesn't provide it
reset(populateRecipe(recipe));
```

This masked the real issue and prevented TypeScript from catching the incompatibility.

## Testing Checklist

- [ ] Create a new recipe (create mode)
- [ ] Edit an existing recipe with ingredients (update mode)
- [ ] Verify ingredients with string order values load correctly
- [ ] Verify TypeScript has no errors in both drawers
- [ ] Verify the API receives the correct payload (with `id` for updates)
- [ ] Test form validation in both modes
- [ ] Test ingredient order values are properly converted to numbers
- [ ] Verify no `@ts-expect-error` comments remain in the code
