import {
  Button,
  Card,
  FieldError,
  Input,
  Label,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, type FieldPath, useForm } from "react-hook-form";
import {
  useBeforeUnload,
  useLocation,
  useNavigate,
  useParams,
} from "react-router";

import ConfirmDialog from "@/components/ConfirmDialog";
import {
  useCreateFoodMutation,
  useDeleteFoodMutation,
  useGetFoodQuery,
  useUpdateFoodMutation,
} from "@/api/foods";
import { handleFormError } from "@/api/shared";
import ServingSizeRows from "@/pages/library/ServingSizeRows";
import TagsInput from "@/pages/library/TagsInput";
import {
  FOOD_FORM_SCHEMA,
  FOOD_INITIAL_VALUES,
  FOOD_NUMERIC_STEP,
  mapFoodToFormValues,
  parseOptionalMacroNumber,
} from "@/pages/library/foodFormSchema";
import type { FoodFormValues } from "@/pages/library/foodFormTypes";

export default function FoodFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const [formError, setFormError] = useState<null | string>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const returnTo =
    typeof location.state === "object" &&
    location.state &&
    "from" in location.state &&
    typeof location.state.from === "string"
      ? location.state.from
      : "/library";

  const {
    data: foodData,
    isError: isFoodError,
    isLoading: isFoodLoading,
    refetch: refetchFood,
  } = useGetFoodQuery(id ?? "", {
    skip: !id,
  });

  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<FoodFormValues>({
    defaultValues: FOOD_INITIAL_VALUES,
    resolver: zodResolver(FOOD_FORM_SCHEMA),
  });

  useEffect(() => {
    if (!isEditing) {
      reset(FOOD_INITIAL_VALUES);
      return;
    }
    if (foodData?.data) {
      reset(mapFoodToFormValues(foodData.data));
    }
  }, [foodData?.data, isEditing, reset]);

  const [createFood, { isLoading: isCreating }] = useCreateFoodMutation();
  const [deleteFood, { isLoading: isDeleting }] = useDeleteFoodMutation();
  const [updateFood, { isLoading: isUpdating }] = useUpdateFoodMutation();
  const isSubmitting = isCreating || isUpdating;
  const hasPendingChanges = isDirty && !isSubmitting;

  const attemptNavigate = (target: string) => {
    if (hasPendingChanges) {
      const shouldLeave = window.confirm(
        "You have unsaved changes. Leave without saving?",
      );
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
    event.returnValue = "";
  });

  const pageTitle = useMemo(() => {
    if (!isEditing) {
      return "Create Food";
    }
    return foodData?.data?.name ? `Edit ${foodData.data.name}` : "Edit Food";
  }, [foodData?.data?.name, isEditing]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    const calories = parseOptionalMacroNumber(values.calories);
    const protein = parseOptionalMacroNumber(values.protein);
    const carbs = parseOptionalMacroNumber(values.carbs);
    const fat = parseOptionalMacroNumber(values.fat);

    const macros =
      calories !== undefined ||
      protein !== undefined ||
      carbs !== undefined ||
      fat !== undefined
        ? {
            calories: calories ?? 0,
            carbs: carbs ?? 0,
            fat: fat ?? 0,
            protein: protein ?? 0,
          }
        : undefined;

    const servingSizes = values.serving_sizes
      .map((row) => ({
        amount: parseOptionalMacroNumber(row.amount) ?? null,
        unit: row.unit.trim(),
        weight_g: parseOptionalMacroNumber(row.weight_g) ?? null,
      }))
      .filter((row) => row.unit || row.weight_g !== null || row.amount !== null)
      .map((row) => ({
        amount: row.amount,
        unit: row.unit || "serving",
        weight_g: row.weight_g,
      }));

    const payload = {
      category: values.category.trim() || undefined,
      image_url: values.image_url.trim() || undefined,
      macros,
      name: values.name.trim(),
      notes: values.notes.trim() || undefined,
      serving_sizes: servingSizes.length > 0 ? servingSizes : undefined,
      source: values.source.trim() || undefined,
      tags: values.tags.length > 0 ? values.tags : undefined,
    };

    try {
      if (id) {
        await updateFood({ body: payload, id }).unwrap();
        toast.success(`Food "${values.name.trim()}" updated successfully.`);
      } else {
        await createFood(payload).unwrap();
        toast.success(`Food "${values.name.trim()}" created successfully.`);
      }
      reset(values);
      navigate(returnTo);
    } catch (err) {
      const result = handleFormError(
        err,
        id
          ? "Unable to update food. Please try again."
          : "Unable to create food. Please try again.",
      );
      if (result.fieldErrors) {
        const namedFieldMap: Record<string, FieldPath<FoodFormValues>> = {
          calories: "calories",
          carbs: "carbs",
          category: "category",
          image_url: "image_url",
          fat: "fat",
          name: "name",
          notes: "notes",
          protein: "protein",
          source: "source",
          tags: "tags",
        };

        Object.entries(result.fieldErrors).forEach(([key, messages]) => {
          const path = namedFieldMap[key];
          if (!path || messages.length === 0) {
            return;
          }
          setError(path, { type: "server", message: messages[0] });
        });
      }
      setFormError(result.formError);
      if (!result.fieldErrors) {
        toast.danger(result.formError);
      }
    }
  });

  const handleDelete = async () => {
    if (!id || !foodData?.data) {
      return;
    }
    try {
      await deleteFood(id).unwrap();
      toast.success(`Food "${foodData.data.name}" deleted successfully.`);
      setIsDeleteOpen(false);
      navigate(returnTo);
    } catch (err) {
      const result = handleFormError(
        err,
        "Unable to delete food. Please try again.",
      );
      toast.danger(result.formError);
    }
  };

  if (isEditing && isFoodLoading) {
    return (
      <Card className="border border-separator bg-surface p-6">
        <p className="text-sm text-muted">Loading food details...</p>
      </Card>
    );
  }

  if (isEditing && isFoodError) {
    return (
      <Card className="border border-separator bg-surface p-6">
        <div className="flex flex-col gap-3">
          <p className="font-semibold text-foreground">Could not load food</p>
          <p className="text-sm text-muted">
            Please retry. If this continues, check API connectivity.
          </p>
          <div className="flex gap-2">
            <Button
              className="min-h-11"
              onPress={() => refetchFood()}
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
          Add or update a shared food with optional macros and metadata.
        </p>
      </div>

      <form className="flex flex-col gap-6" onSubmit={onSubmit}>
        <section className="flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">Basics</p>

          <TextField isInvalid={Boolean(errors.name?.message)}>
            <Label className="text-sm font-medium text-foreground">
              Food name
            </Label>
            <Input
              placeholder="e.g. Rolled Oats"
              variant="secondary"
              {...register("name")}
            />
            {errors.name?.message ? (
              <FieldError>{errors.name.message}</FieldError>
            ) : null}
          </TextField>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField isInvalid={Boolean(errors.category?.message)}>
              <Label className="text-sm font-medium text-foreground">
                Category
              </Label>
              <Input
                placeholder="e.g. Grain"
                variant="secondary"
                {...register("category")}
              />
              {errors.category?.message ? (
                <FieldError>{errors.category.message}</FieldError>
              ) : null}
            </TextField>

            <TextField isInvalid={Boolean(errors.source?.message)}>
              <Label className="text-sm font-medium text-foreground">
                Source
              </Label>
              <Input
                placeholder="e.g. USDA"
                variant="secondary"
                {...register("source")}
              />
              {errors.source?.message ? (
                <FieldError>{errors.source.message}</FieldError>
              ) : null}
            </TextField>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5">
          <TextField isInvalid={Boolean(errors.notes?.message)}>
            <Label className="text-sm font-medium text-foreground">Notes</Label>
            <TextArea
              placeholder="Optional notes"
              variant="secondary"
              {...register("notes")}
            />
            {errors.notes?.message ? (
              <FieldError>{errors.notes.message}</FieldError>
            ) : null}
          </TextField>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5">
          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
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
          <TextField isInvalid={Boolean(errors.image_url?.message)}>
            <Label className="text-sm font-medium text-foreground">
              Image URL
            </Label>
            <Input
              placeholder="https://example.com/food.jpg"
              variant="secondary"
              {...register("image_url")}
            />
            {errors.image_url?.message ? (
              <FieldError>{errors.image_url.message}</FieldError>
            ) : null}
          </TextField>
        </section>

        <ServingSizeRows
          control={control}
          errors={errors}
          register={register}
          title="Serving sizes"
        />

        <section className="flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">Macros</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField isInvalid={Boolean(errors.calories?.message)}>
              <Label className="text-sm font-medium text-foreground">
                Calories
              </Label>
              <Input
                placeholder="e.g. 150"
                step={FOOD_NUMERIC_STEP}
                type="number"
                variant="secondary"
                {...register("calories")}
              />
              {errors.calories?.message ? (
                <FieldError>{errors.calories.message}</FieldError>
              ) : null}
            </TextField>

            <TextField isInvalid={Boolean(errors.protein?.message)}>
              <Label className="text-sm font-medium text-foreground">
                Protein (g)
              </Label>
              <Input
                placeholder="e.g. 12"
                step={FOOD_NUMERIC_STEP}
                type="number"
                variant="secondary"
                {...register("protein")}
              />
              {errors.protein?.message ? (
                <FieldError>{errors.protein.message}</FieldError>
              ) : null}
            </TextField>

            <TextField isInvalid={Boolean(errors.carbs?.message)}>
              <Label className="text-sm font-medium text-foreground">
                Carbs (g)
              </Label>
              <Input
                placeholder="e.g. 27"
                step={FOOD_NUMERIC_STEP}
                type="number"
                variant="secondary"
                {...register("carbs")}
              />
              {errors.carbs?.message ? (
                <FieldError>{errors.carbs.message}</FieldError>
              ) : null}
            </TextField>

            <TextField isInvalid={Boolean(errors.fat?.message)}>
              <Label className="text-sm font-medium text-foreground">
                Fat (g)
              </Label>
              <Input
                placeholder="e.g. 4.5"
                step={FOOD_NUMERIC_STEP}
                type="number"
                variant="secondary"
                {...register("fat")}
              />
              {errors.fat?.message ? (
                <FieldError>{errors.fat.message}</FieldError>
              ) : null}
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
              Delete food
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
            {isSubmitting
              ? isEditing
                ? "Saving..."
                : "Creating..."
              : isEditing
                ? "Save food"
                : "Create food"}
          </Button>
        </div>
      </form>
      <ConfirmDialog
        confirmLabel="Delete food"
        description={`Are you sure you want to delete ${foodData?.data?.name ?? "this food"}? This cannot be undone.`}
        isLoading={isDeleting}
        isOpen={isDeleteOpen}
        onConfirm={handleDelete}
        onOpenChange={setIsDeleteOpen}
        title="Delete food"
      />
    </div>
  );
}
