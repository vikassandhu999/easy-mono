import {Button, Card, FieldError, Input, Label, TextArea, TextField, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {AlertCircle, ChevronLeft} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {Controller, type FieldPath, useForm} from 'react-hook-form';
import {useBeforeUnload, useLocation, useNavigate, useParams} from 'react-router';

import type {NutritionPlanFormValues} from '@/pages/library/nutritionPlanFormTypes';

import {
  useCreateNutritionPlanMutation,
  useDeleteNutritionPlanMutation,
  useGetNutritionPlanQuery,
  useUpdateNutritionPlanMutation,
} from '@/api/nutritionPlans';
import {handleFormError} from '@/api/shared';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  mapNutritionPlanToFormValues,
  NUTRITION_PLAN_FORM_SCHEMA,
  NUTRITION_PLAN_INITIAL_VALUES,
  parseOptionalPlanNumber,
} from '@/pages/library/nutritionPlanFormSchema';
import TagsInput from '@/pages/library/TagsInput';

export default function NutritionPlanFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id} = useParams();
  const isEditing = Boolean(id);
  const [formError, setFormError] = useState<null | string>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const returnTo =
    typeof location.state === 'object' &&
    location.state &&
    'from' in location.state &&
    typeof location.state.from === 'string'
      ? location.state.from
      : '/library';

  const {
    data: nutritionPlanData,
    isError: isNutritionPlanError,
    isLoading: isNutritionPlanLoading,
    refetch: refetchNutritionPlan,
  } = useGetNutritionPlanQuery(id ?? '', {
    skip: !id,
  });

  const {
    control,
    formState: {errors, isDirty},
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
    watch,
  } = useForm<NutritionPlanFormValues>({
    defaultValues: NUTRITION_PLAN_INITIAL_VALUES,
    resolver: zodResolver(NUTRITION_PLAN_FORM_SCHEMA),
  });

  useEffect(() => {
    if (!isEditing) {
      reset(NUTRITION_PLAN_INITIAL_VALUES);
      return;
    }

    if (nutritionPlanData?.data) {
      reset(mapNutritionPlanToFormValues(nutritionPlanData.data));
    }
  }, [isEditing, nutritionPlanData?.data, reset]);

  const [createNutritionPlan, {isLoading: isCreating}] = useCreateNutritionPlanMutation();
  const [deleteNutritionPlan, {isLoading: isDeleting}] = useDeleteNutritionPlanMutation();
  const [updateNutritionPlan, {isLoading: isUpdating}] = useUpdateNutritionPlanMutation();

  const isSubmitting = isCreating || isUpdating;
  const hasPendingChanges = isDirty && !isSubmitting;
  const selectedType = watch('type');
  const selectedStatus = watch('status');

  const attemptNavigate = (target: string) => {
    if (hasPendingChanges) {
      const shouldLeave = window.confirm('You have unsaved changes. Leave without saving?');
      if (!shouldLeave) {
        return;
      }
    }
    navigate(target);
  };

  useBeforeUnload((event) => {
    if (!hasPendingChanges) {
      return;
    }
    event.preventDefault();
    event.returnValue = '';
  });

  const pageTitle = useMemo(() => {
    if (!isEditing) {
      return 'Create Nutrition Plan';
    }
    return nutritionPlanData?.data?.name ? `Edit ${nutritionPlanData.data.name}` : 'Edit Nutrition Plan';
  }, [isEditing, nutritionPlanData?.data?.name]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    const calories = parseOptionalPlanNumber(values.calories);
    const protein = parseOptionalPlanNumber(values.protein);
    const carbs = parseOptionalPlanNumber(values.carbs);
    const fat = parseOptionalPlanNumber(values.fat);

    const macrosGoal =
      calories !== undefined || protein !== undefined || carbs !== undefined || fat !== undefined
        ? {
            calories: calories ?? 0,
            carbs: carbs ?? 0,
            fat: fat ?? 0,
            protein: protein ?? 0,
          }
        : undefined;

    const payload = {
      description: values.description.trim() || undefined,
      macros_goal: macrosGoal,
      name: values.name.trim(),
      status: values.status,
      tags: values.tags.length > 0 ? values.tags : undefined,
      ...(isEditing ? {} : {type: values.type}),
    };

    try {
      const response = id
        ? await updateNutritionPlan({body: payload, id}).unwrap()
        : await createNutritionPlan(payload).unwrap();

      toast.success(
        id
          ? `Nutrition plan \"${values.name.trim()}\" updated successfully.`
          : `Nutrition plan \"${values.name.trim()}\" created successfully.`,
      );
      reset(values);

      if (id) {
        navigate(returnTo);
        return;
      }

      navigate(`/library/nutrition-plans/${response.data.id}/builder`, {
        state: {from: returnTo},
      });
    } catch (error) {
      const result = handleFormError(
        error,
        id
          ? 'Unable to update nutrition plan. Please try again.'
          : 'Unable to create nutrition plan. Please try again.',
      );

      if (result.fieldErrors) {
        const namedFieldMap: Record<string, FieldPath<NutritionPlanFormValues>> = {
          calories: 'calories',
          carbs: 'carbs',
          description: 'description',
          fat: 'fat',
          name: 'name',
          protein: 'protein',
          status: 'status',
          tags: 'tags',
          type: 'type',
        };

        Object.entries(result.fieldErrors).forEach(([key, messages]) => {
          const path = namedFieldMap[key];
          if (!path || messages.length === 0) {
            return;
          }
          setError(path, {type: 'server', message: messages[0]});
        });
      }

      setFormError(result.formError);
      if (!result.fieldErrors) {
        toast.danger(result.formError);
      }
    }
  });

  const handleDelete = async () => {
    if (!id || !nutritionPlanData?.data) {
      return;
    }

    try {
      await deleteNutritionPlan(id).unwrap();
      toast.success(`Nutrition plan \"${nutritionPlanData.data.name}\" deleted successfully.`);
      setIsDeleteOpen(false);
      navigate(returnTo);
    } catch (error) {
      const result = handleFormError(error, 'Unable to delete nutrition plan. Please try again.');
      toast.danger(result.formError);
    }
  };

  if (isEditing && isNutritionPlanLoading) {
    return (
      <Card className="border border-separator bg-surface p-6">
        <p className="text-sm text-muted">Loading nutrition plan details...</p>
      </Card>
    );
  }

  if (isEditing && isNutritionPlanError) {
    return (
      <Card className="border border-separator bg-surface p-6">
        <div className="flex flex-col gap-3">
          <p className="font-semibold text-foreground">Could not load nutrition plan</p>
          <p className="text-sm text-muted">Please retry. If this continues, check API connectivity.</p>
          <div className="flex gap-2">
            <Button
              className="min-h-11"
              onPress={() => refetchNutritionPlan()}
              size="md"
              variant="outline"
            >
              Retry
            </Button>
            <Button
              className="min-h-11"
              onPress={() => attemptNavigate(returnTo)}
              size="md"
              variant="ghost"
            >
              Back
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Button
          className="min-h-11 w-fit gap-2 px-2"
          onPress={() => attemptNavigate(returnTo)}
          size="sm"
          variant="ghost"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to library</span>
        </Button>
        <p className="text-sm text-muted">Library</p>
        <h1 className="text-2xl font-semibold md:text-3xl">{pageTitle}</h1>
        <p className="max-w-2xl text-sm text-muted">
          Define plan metadata, intent, and macro goals before building meals and schedule.
        </p>
      </div>

      <form
        className="flex flex-col gap-6"
        onSubmit={onSubmit}
      >
        <section className="flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">Basics</p>

          <TextField isInvalid={Boolean(errors.name?.message)}>
            <Label className="text-sm font-medium text-foreground">Name</Label>
            <Input
              placeholder="e.g. Fat Loss Starter"
              variant="secondary"
              {...register('name')}
            />
            {errors.name?.message ? <FieldError>{errors.name.message}</FieldError> : null}
          </TextField>

          <TextField isInvalid={Boolean(errors.description?.message)}>
            <Label className="text-sm font-medium text-foreground">Description</Label>
            <TextArea
              placeholder="Optional plan notes"
              variant="secondary"
              {...register('description')}
            />
            {errors.description?.message ? <FieldError>{errors.description.message}</FieldError> : null}
          </TextField>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">Plan setup</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground">Type</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="min-h-11"
                  isDisabled={isEditing}
                  onPress={() => setValue('type', 'template')}
                  type="button"
                  variant={selectedType === 'template' ? 'secondary' : 'outline'}
                >
                  Template
                </Button>
                <Button
                  className="min-h-11"
                  isDisabled={isEditing}
                  onPress={() => setValue('type', 'personal')}
                  type="button"
                  variant={selectedType === 'personal' ? 'secondary' : 'outline'}
                >
                  Personal
                </Button>
              </div>
              {isEditing ? <p className="text-xs text-muted">Type is locked after creation.</p> : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground">Status</Label>
              <div className="flex flex-wrap gap-2">
                {(['draft', 'active', 'archived'] as const).map((status) => (
                  <Button
                    className="min-h-11"
                    key={status}
                    onPress={() => setValue('status', status)}
                    type="button"
                    variant={selectedStatus === status ? 'secondary' : 'outline'}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5">
          <Controller
            control={control}
            name="tags"
            render={({field}) => (
              <TagsInput
                label="Tags"
                onChange={(nextTags) => field.onChange(nextTags)}
                placeholder="Add tags (press Enter or comma)"
                value={field.value}
              />
            )}
          />
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">Macros goal</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField isInvalid={Boolean(errors.calories?.message)}>
              <Label className="text-sm font-medium text-foreground">Calories</Label>
              <Input
                placeholder="e.g. 2200"
                type="number"
                variant="secondary"
                {...register('calories')}
              />
              {errors.calories?.message ? <FieldError>{errors.calories.message}</FieldError> : null}
            </TextField>

            <TextField isInvalid={Boolean(errors.protein?.message)}>
              <Label className="text-sm font-medium text-foreground">Protein (g)</Label>
              <Input
                placeholder="e.g. 180"
                type="number"
                variant="secondary"
                {...register('protein')}
              />
              {errors.protein?.message ? <FieldError>{errors.protein.message}</FieldError> : null}
            </TextField>

            <TextField isInvalid={Boolean(errors.carbs?.message)}>
              <Label className="text-sm font-medium text-foreground">Carbs (g)</Label>
              <Input
                placeholder="e.g. 220"
                type="number"
                variant="secondary"
                {...register('carbs')}
              />
              {errors.carbs?.message ? <FieldError>{errors.carbs.message}</FieldError> : null}
            </TextField>

            <TextField isInvalid={Boolean(errors.fat?.message)}>
              <Label className="text-sm font-medium text-foreground">Fat (g)</Label>
              <Input
                placeholder="e.g. 70"
                type="number"
                variant="secondary"
                {...register('fat')}
              />
              {errors.fat?.message ? <FieldError>{errors.fat.message}</FieldError> : null}
            </TextField>
          </div>
        </section>

        {formError ? (
          <div className="flex items-start gap-2 rounded-lg border border-separator bg-surface-secondary p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
            <p className="text-sm text-foreground">{formError}</p>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-separator pt-4 sm:flex-row sm:justify-end">
          {isEditing ? (
            <Button
              className="min-h-11 sm:mr-auto"
              onPress={() => setIsDeleteOpen(true)}
              size="md"
              type="button"
              variant="danger"
            >
              Delete nutrition plan
            </Button>
          ) : null}
          <Button
            className="min-h-11"
            onPress={() => attemptNavigate(returnTo)}
            size="md"
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            className="min-h-11"
            isDisabled={isSubmitting}
            size="md"
            type="submit"
            variant="primary"
          >
            {isSubmitting ? (isEditing ? 'Saving...' : 'Creating...') : isEditing ? 'Save plan' : 'Create plan'}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        confirmLabel="Delete nutrition plan"
        description={`Are you sure you want to delete ${nutritionPlanData?.data?.name ?? 'this nutrition plan'}? This cannot be undone.`}
        isLoading={isDeleting}
        isOpen={isDeleteOpen}
        onConfirm={handleDelete}
        onOpenChange={setIsDeleteOpen}
        title="Delete nutrition plan"
      />
    </div>
  );
}
