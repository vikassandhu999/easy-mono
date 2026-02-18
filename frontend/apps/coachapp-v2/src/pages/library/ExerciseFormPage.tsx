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
import { AlertCircle, ChevronLeft, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Controller,
  type FieldPath,
  useFieldArray,
  useForm,
} from "react-hook-form";
import {
  useBeforeUnload,
  useLocation,
  useNavigate,
  useParams,
} from "react-router";

import type { ExerciseFormValues } from "@/pages/library/exerciseFormTypes";

import {
  useCreateExerciseMutation,
  useDeleteExerciseMutation,
  useGetExerciseQuery,
  useListEquipmentQuery,
  useListMusclesQuery,
  useUpdateExerciseMutation,
} from "@/api/exercises";
import { handleFormError } from "@/api/shared";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  buildExerciseImageUrls,
  createEmptyExerciseImageField,
  EXERCISE_FORM_SCHEMA,
  EXERCISE_INITIAL_VALUES,
  mapExerciseToFormValues,
} from "@/pages/library/exerciseFormSchema";
import ExerciseTagSelector from "@/pages/library/ExerciseTagSelector";
import { getReturnTo } from "@/pages/library/libraryFormShared";

const MECHANICS_OPTIONS = [
  { label: "Not set", value: "" },
  { label: "Compound", value: "compound" },
  { label: "Isolation", value: "isolation" },
  { label: "Isometric", value: "isometric" },
] as const;

const FORCE_OPTIONS = [
  { label: "Not set", value: "" },
  { label: "Push", value: "push" },
  { label: "Pull", value: "pull" },
  { label: "Static", value: "static" },
] as const;

export default function ExerciseFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const [formError, setFormError] = useState<null | string>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const returnTo = getReturnTo(location, "/library");

  const {
    data: exerciseData,
    isError: isExerciseError,
    isLoading: isExerciseLoading,
    refetch: refetchExercise,
  } = useGetExerciseQuery(id ?? "", {
    skip: !id,
  });

  const {
    data: musclesData,
    isError: isMusclesError,
    isLoading: isMusclesLoading,
    refetch: refetchMuscles,
  } = useListMusclesQuery();
  const {
    data: equipmentData,
    isError: isEquipmentError,
    isLoading: isEquipmentLoading,
    refetch: refetchEquipment,
  } = useListEquipmentQuery();

  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<ExerciseFormValues>({
    defaultValues: EXERCISE_INITIAL_VALUES,
    resolver: zodResolver(EXERCISE_FORM_SCHEMA),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "images",
  });

  useEffect(() => {
    if (!isEditing) {
      reset(EXERCISE_INITIAL_VALUES);
      return;
    }
    if (exerciseData?.data) {
      reset(mapExerciseToFormValues(exerciseData.data));
    }
  }, [exerciseData?.data, isEditing, reset]);

  const [createExercise, { isLoading: isCreating }] =
    useCreateExerciseMutation();
  const [deleteExercise, { isLoading: isDeleting }] =
    useDeleteExerciseMutation();
  const [updateExercise, { isLoading: isUpdating }] =
    useUpdateExerciseMutation();
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
      return "Create Exercise";
    }
    return exerciseData?.data?.name
      ? `Edit ${exerciseData.data.name}`
      : "Edit Exercise";
  }, [exerciseData?.data?.name, isEditing]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    const imageUrls = buildExerciseImageUrls(values);
    const payload = {
      description: values.description.trim() || undefined,
      equipment_ids:
        values.equipment_ids.length > 0 ? values.equipment_ids : undefined,
      force: values.force || undefined,
      images: imageUrls.length > 0 ? imageUrls : undefined,
      instructions: values.instructions.trim() || undefined,
      mechanics: values.mechanics || undefined,
      muscle_ids: values.muscle_ids.length > 0 ? values.muscle_ids : undefined,
      name: values.name.trim(),
    };

    try {
      if (id) {
        await updateExercise({
          body: payload,
          id,
        }).unwrap();
        toast.success(`Exercise "${values.name.trim()}" updated successfully.`);
      } else {
        await createExercise(payload).unwrap();
        toast.success(`Exercise "${values.name.trim()}" created successfully.`);
      }
      reset(values);
      navigate(returnTo);
    } catch (err) {
      const result = handleFormError(
        err,
        id
          ? "Unable to update exercise. Please try again."
          : "Unable to create exercise. Please try again.",
      );
      if (result.fieldErrors) {
        const namedFieldMap: Record<string, FieldPath<ExerciseFormValues>> = {
          description: "description",
          equipment_ids: "equipment_ids",
          force: "force",
          instructions: "instructions",
          mechanics: "mechanics",
          muscle_ids: "muscle_ids",
          name: "name",
        };

        Object.entries(result.fieldErrors).forEach(([key, messages]) => {
          if (messages.length === 0) {
            return;
          }

          if (key === "images" && fields.length > 0) {
            setError("images.0.url", {
              type: "server",
              message: messages[0],
            });
            return;
          }

          const path = namedFieldMap[key];
          if (!path) {
            return;
          }

          setError(path, {
            type: "server",
            message: messages[0],
          });
        });
      }
      setFormError(result.formError);
      if (!result.fieldErrors) {
        toast.danger(result.formError);
      }
    }
  });

  const handleDelete = async () => {
    if (!id || !exerciseData?.data) {
      return;
    }
    try {
      await deleteExercise(id).unwrap();
      toast.success(
        `Exercise "${exerciseData.data.name}" deleted successfully.`,
      );
      setIsDeleteOpen(false);
      navigate(returnTo);
    } catch (err) {
      const result = handleFormError(
        err,
        "Unable to delete exercise. Please try again.",
      );
      toast.danger(result.formError);
    }
  };

  if (isEditing && isExerciseLoading) {
    return (
      <Card className="border border-separator bg-surface p-6">
        <p className="text-sm text-muted">Loading exercise details...</p>
      </Card>
    );
  }

  if (isEditing && isExerciseError) {
    return (
      <Card className="border border-separator bg-surface p-6">
        <div className="flex flex-col gap-3">
          <p className="font-semibold text-foreground">
            Could not load exercise
          </p>
          <p className="text-sm text-muted">
            Please retry. If this continues, check API connectivity.
          </p>
          <div className="flex gap-2">
            <Button
              className="min-h-11"
              onPress={() => refetchExercise()}
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
          Add or update a shared exercise with movement details, target muscles,
          equipment, and image URLs.
        </p>
      </div>

      <form className="flex flex-col gap-6" onSubmit={onSubmit}>
        <section className="flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">Basics</p>

          <TextField isInvalid={Boolean(errors.name?.message)}>
            <Label className="text-sm font-medium text-foreground">
              Exercise name
            </Label>
            <Input
              placeholder="e.g. Barbell Back Squat"
              variant="secondary"
              {...register("name")}
            />
            {errors.name?.message ? (
              <FieldError>{errors.name.message}</FieldError>
            ) : null}
          </TextField>

          <TextField isInvalid={Boolean(errors.description?.message)}>
            <Label className="text-sm font-medium text-foreground">
              Description
            </Label>
            <TextArea
              placeholder="Optional short summary"
              variant="secondary"
              {...register("description")}
            />
            {errors.description?.message ? (
              <FieldError>{errors.description.message}</FieldError>
            ) : null}
          </TextField>

          <TextField isInvalid={Boolean(errors.instructions?.message)}>
            <Label className="text-sm font-medium text-foreground">
              Instructions
            </Label>
            <TextArea
              placeholder="Cue setup, movement, and execution details"
              variant="secondary"
              {...register("instructions")}
            />
            {errors.instructions?.message ? (
              <FieldError>{errors.instructions.message}</FieldError>
            ) : null}
          </TextField>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">
            Classification
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="mechanics"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium text-foreground">
                    Mechanics
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {MECHANICS_OPTIONS.map((option) => (
                      <Button
                        className="min-h-11"
                        key={option.value || "empty"}
                        onPress={() => field.onChange(option.value)}
                        size="sm"
                        type="button"
                        variant={
                          field.value === option.value ? "secondary" : "outline"
                        }
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                  {errors.mechanics?.message ? (
                    <FieldError>{errors.mechanics.message}</FieldError>
                  ) : null}
                </div>
              )}
            />

            <Controller
              control={control}
              name="force"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium text-foreground">
                    Force
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {FORCE_OPTIONS.map((option) => (
                      <Button
                        className="min-h-11"
                        key={option.value || "empty"}
                        onPress={() => field.onChange(option.value)}
                        size="sm"
                        type="button"
                        variant={
                          field.value === option.value ? "secondary" : "outline"
                        }
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                  {errors.force?.message ? (
                    <FieldError>{errors.force.message}</FieldError>
                  ) : null}
                </div>
              )}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5">
          {isMusclesError ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-separator bg-surface-secondary p-3">
              <p className="text-sm text-foreground">Could not load muscles.</p>
              <Button
                className="min-h-11"
                onPress={() => refetchMuscles()}
                size="sm"
                type="button"
                variant="outline"
              >
                Retry
              </Button>
            </div>
          ) : null}
          <Controller
            control={control}
            name="muscle_ids"
            render={({ field }) => (
              <ExerciseTagSelector
                emptyLabel="No muscles match your search."
                isLoading={isMusclesLoading}
                items={musclesData?.data ?? []}
                label="Target muscles"
                onChange={field.onChange}
                searchPlaceholder="Search muscles"
                selectedIds={field.value}
              />
            )}
          />
          {errors.muscle_ids?.message ? (
            <FieldError>{errors.muscle_ids.message}</FieldError>
          ) : null}
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5">
          {isEquipmentError ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-separator bg-surface-secondary p-3">
              <p className="text-sm text-foreground">
                Could not load equipment.
              </p>
              <Button
                className="min-h-11"
                onPress={() => refetchEquipment()}
                size="sm"
                type="button"
                variant="outline"
              >
                Retry
              </Button>
            </div>
          ) : null}
          <Controller
            control={control}
            name="equipment_ids"
            render={({ field }) => (
              <ExerciseTagSelector
                emptyLabel="No equipment match your search."
                isLoading={isEquipmentLoading}
                items={equipmentData?.data ?? []}
                label="Equipment"
                onChange={field.onChange}
                searchPlaceholder="Search equipment"
                selectedIds={field.value}
              />
            )}
          />
          {errors.equipment_ids?.message ? (
            <FieldError>{errors.equipment_ids.message}</FieldError>
          ) : null}
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 border-b border-separator pb-2">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Image URLs
              </p>
              <p className="text-xs text-muted">
                {fields.length} image{fields.length === 1 ? "" : "s"}
              </p>
            </div>
            <Button
              className="min-h-11 gap-1 px-3"
              onPress={() => append(createEmptyExerciseImageField())}
              size="sm"
              type="button"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              <span>Add image</span>
            </Button>
          </div>

          {fields.length === 0 ? (
            <div className="rounded-lg border border-dashed border-separator bg-surface-secondary p-4 text-center">
              <p className="text-sm font-medium text-foreground">
                No image URLs yet
              </p>
              <p className="mt-1 text-xs text-muted">
                Add an image URL to help identify this exercise.
              </p>
              <div className="mt-3">
                <Button
                  className="min-h-11"
                  onPress={() => append(createEmptyExerciseImageField())}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Add first image
                </Button>
              </div>
            </div>
          ) : null}

          {fields.map((field, index) => (
            <div
              className="rounded-lg border border-separator bg-surface-secondary p-3"
              key={field.id}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted">
                  Image {index + 1}
                </span>
                <Button
                  aria-label="Remove image"
                  className="min-h-11 px-3"
                  onPress={() => remove(index)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>

              <TextField
                isInvalid={Boolean(errors.images?.[index]?.url?.message)}
              >
                <Label className="text-xs font-medium text-foreground">
                  Image URL
                </Label>
                <Input
                  placeholder="https://example.com/exercise.jpg"
                  variant="secondary"
                  {...register(`images.${index}.url`)}
                />
                {errors.images?.[index]?.url?.message ? (
                  <FieldError>{errors.images[index]?.url?.message}</FieldError>
                ) : null}
              </TextField>
            </div>
          ))}
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
              Delete exercise
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
                ? "Save exercise"
                : "Create exercise"}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        confirmLabel="Delete exercise"
        description={`Are you sure you want to delete ${exerciseData?.data?.name ?? "this exercise"}? This cannot be undone.`}
        isLoading={isDeleting}
        isOpen={isDeleteOpen}
        onConfirm={handleDelete}
        onOpenChange={setIsDeleteOpen}
        title="Delete exercise"
      />
    </div>
  );
}
