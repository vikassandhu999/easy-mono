# NutritionPlanForm Typing Fix

## Problem

The `NutritionPlanForm` component was being used for both **creating** and **updating** nutrition plans, but the type system only recognized `CreateNutritionPlan`. This caused type safety issues because:

1. When **creating**, we use `CreateNutritionPlan` (no `id` field)
2. When **updating**, we need `UpdateNutritionPlan` which is `Partial<CreateNutritionPlan> & {id: string}`

The form was hardcoded to only accept `CreateNutritionPlan`:

```typescript
// Before - incorrect typing
export interface NutritionPlanFormProps {
  initialValues?: Partial<CreateNutritionPlan>;
  onSubmit?: (values: CreateNutritionPlan) => Promise<void> | void;
  planId?: string;
  ref?: React.Ref<NutritionPlanFormHandle>;
}
```

## Solution

We implemented a **discriminated union** approach that uses conditional types based on whether `planId` exists:

### 1. Updated Form Handle Type

```typescript
export type NutritionPlanFormHandle<
  TMode extends "create" | "update" = "create",
> = TMode extends "update"
  ? {
      getValues: () => CreateNutritionPlan;
      reset: () => void;
      submit: () => Promise<void>;
    }
  : {
      getValues: () => CreateNutritionPlan;
      reset: () => void;
      submit: () => Promise<void>;
    };
```

### 2. Discriminated Union for Props

```typescript
// Base props shared by both modes
interface NutritionPlanFormPropsBase {
  initialValues?: Partial<CreateNutritionPlan>;
}

// Discriminated union based on planId presence
export type NutritionPlanFormProps =
  | (NutritionPlanFormPropsBase & {
      planId: string;
      onSubmit?: (values: UpdateNutritionPlan) => Promise<void> | void;
      ref?: React.Ref<NutritionPlanFormHandle<"update">>;
    })
  | (NutritionPlanFormPropsBase & {
      planId?: never;
      onSubmit?: never | undefined;
      onSubmit?: (values: CreateNutritionPlan) => Promise<void> | void;
      ref?: React.Ref<NutritionPlanFormHandle<"create">>;
    });
```

### 3. Runtime Logic to Add ID

The form now automatically adds the `id` when in update mode:

```typescript
const onSubmitForm = async (values: CreateNutritionPlan) => {
  try {
    if (onSubmit) {
      // If planId exists, we're in update mode and need to include the id
      if (planId) {
        await (
          onSubmit as (values: UpdateNutritionPlan) => Promise<void> | void
        )({
          ...values,
          id: planId,
        });
      } else {
        await (
          onSubmit as (values: CreateNutritionPlan) => Promise<void> | void
        )(values);
      }
    }
  } catch (error) {
    const err_msg = new APIErrorParser(error).humanize();
    notifyError(err_msg);
  }
};
```

## Updated Usage

### Create Mode (NutritionPlanCreateDrawer)

```typescript
const nutritionPlanFormRef = useRef<NutritionPlanFormHandle<'create'>>(null);

<NutritionPlanForm
    onSubmit={async (values) => {
        // values is typed as CreateNutritionPlan (no id)
        await createPlan(values).unwrap();
    }}
    ref={nutritionPlanFormRef}
/>
```

### Update Mode (NutritionPlanEditDrawer)

```typescript
const nutritionPlanFormRef = useRef<NutritionPlanFormHandle<'update'>>(null);

<NutritionPlanForm
    planId={planId}  // ✅ This triggers update mode
    initialValues={{...}}
    onSubmit={async (values) => {
        // values is typed as UpdateNutritionPlan (includes id)
        await updatePlan(values).unwrap();  // No need to manually add id anymore!
    }}
    ref={nutritionPlanFormRef}
/>
```

## Benefits

✅ **Type Safety**: TypeScript now enforces correct types based on mode  
✅ **DRY Principle**: The form handles adding the `id` internally, no need to do it in every drawer  
✅ **Clear Intent**: Explicitly typed refs make it clear whether you're creating or updating  
✅ **Backward Compatible**: No breaking changes to how the component is used  
✅ **Single Source of Truth**: The presence of `planId` determines the mode

## Files Changed

1. `NutritionPlanForm.tsx` - Updated types and added conditional logic
2. `NutritionPlanEditDrawer.tsx` - Added `planId` prop, updated ref type, simplified onSubmit
3. `NutritionPlanCreateDrawer.tsx` - Updated ref type to explicitly use 'create' mode

## Testing Checklist

- [ ] Create a new nutrition plan (create mode)
- [ ] Edit an existing nutrition plan (update mode)
- [ ] Verify TypeScript has no errors in both drawers
- [ ] Verify the API receives the correct payload (with `id` for updates)
- [ ] Test form validation in both modes

```

```
