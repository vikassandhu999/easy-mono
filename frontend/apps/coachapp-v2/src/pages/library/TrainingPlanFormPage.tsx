import {Button, Card, FieldError, Input, Label, TextArea, TextField, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {AlertCircle, ChevronLeft, FileText, Layers, Settings2} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {type FieldPath, useForm} from 'react-hook-form';
import {useBeforeUnload, useLocation, useNavigate, useParams} from 'react-router';

import type {TrainingPlanFormValues} from '@/pages/library/trainingPlanFormTypes';

import {useListClientsQuery} from '@/api/clients';
import {handleFormError} from '@/api/shared';
import {
  useCreateTrainingPlanMutation,
  useDeleteTrainingPlanMutation,
  useGetTrainingPlanQuery,
  useUpdateTrainingPlanMutation,
} from '@/api/trainingPlans';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  mapTrainingPlanToFormValues,
  TRAINING_PLAN_FORM_SCHEMA,
  TRAINING_PLAN_INITIAL_VALUES,
} from '@/pages/library/trainingPlanFormSchema';

export default function TrainingPlanFormPage() {
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
    data: trainingPlanData,
    isError: isTrainingPlanError,
    isLoading: isTrainingPlanLoading,
    refetch: refetchTrainingPlan,
  } = useGetTrainingPlanQuery(id ?? '', {
    skip: !id,
  });

  const {data: clientsData} = useListClientsQuery({limit: 200, offset: 0});
  const clients = clientsData?.data ?? [];

  const {
    formState: {errors, isDirty},
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
    watch,
  } = useForm<TrainingPlanFormValues>({
    defaultValues: TRAINING_PLAN_INITIAL_VALUES,
    resolver: zodResolver(TRAINING_PLAN_FORM_SCHEMA),
  });

  useEffect(() => {
    if (!isEditing) {
      reset(TRAINING_PLAN_INITIAL_VALUES);
      return;
    }

    if (trainingPlanData?.data) {
      reset(mapTrainingPlanToFormValues(trainingPlanData.data));
    }
  }, [isEditing, trainingPlanData?.data, reset]);

  const [createTrainingPlan, {isLoading: isCreating}] = useCreateTrainingPlanMutation();
  const [deleteTrainingPlan, {isLoading: isDeleting}] = useDeleteTrainingPlanMutation();
  const [updateTrainingPlan, {isLoading: isUpdating}] = useUpdateTrainingPlanMutation();

  const isSubmitting = isCreating || isUpdating;
  const hasPendingChanges = isDirty && !isSubmitting;
  const isTemplate = watch('is_template');
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
      return 'Create Training Plan';
    }
    return trainingPlanData?.data?.name ? `Edit ${trainingPlanData.data.name}` : 'Edit Training Plan';
  }, [isEditing, trainingPlanData?.data?.name]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    const payload = {
      description: values.description.trim() || undefined,
      end_date: !values.is_template && values.end_date.trim() ? values.end_date : undefined,
      is_template: values.is_template,
      name: values.name.trim(),
      start_date: !values.is_template && values.start_date.trim() ? values.start_date : undefined,
      status: values.status,
      ...(values.is_template ? {} : {client_id: values.client_id.trim()}),
    };

    try {
      const response = id
        ? await updateTrainingPlan({body: payload, id}).unwrap()
        : await createTrainingPlan(payload).unwrap();

      toast.success(
        id
          ? `Training plan "${values.name.trim()}" updated successfully.`
          : `Training plan "${values.name.trim()}" created successfully.`,
      );
      reset(values);

      if (id) {
        navigate(returnTo);
        return;
      }

      navigate(`/library/training-plans/${response.data.id}/builder`, {
        state: {from: returnTo},
      });
    } catch (error) {
      const result = handleFormError(
        error,
        id ? 'Unable to update training plan. Please try again.' : 'Unable to create training plan. Please try again.',
      );

      if (result.fieldErrors) {
        const namedFieldMap: Record<string, FieldPath<TrainingPlanFormValues>> = {
          client_id: 'client_id',
          description: 'description',
          end_date: 'end_date',
          is_template: 'is_template',
          name: 'name',
          start_date: 'start_date',
          status: 'status',
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
    if (!id || !trainingPlanData?.data) {
      return;
    }

    try {
      await deleteTrainingPlan(id).unwrap();
      toast.success(`Training plan "${trainingPlanData.data.name}" deleted successfully.`);
      setIsDeleteOpen(false);
      navigate(returnTo);
    } catch (error) {
      const result = handleFormError(error, 'Unable to delete training plan. Please try again.');
      toast.danger(result.formError);
    }
  };

  if (isEditing && isTrainingPlanLoading) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-surface-secondary" />
          <div className="h-6 w-48 animate-pulse rounded-md bg-surface-secondary" />
        </div>
        <div className="h-40 animate-pulse rounded-xl bg-surface-secondary" />
        <div className="h-40 animate-pulse rounded-xl bg-surface-secondary" />
      </div>
    );
  }

  if (isEditing && isTrainingPlanError) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Card className="rounded-xl border border-separator bg-surface p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
              <Layers className="h-7 w-7 text-muted" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">Could not load training plan</p>
              <p className="mt-1 text-sm text-muted">Please retry. If this continues, check API connectivity.</p>
            </div>
            <div className="flex gap-2">
              <Button
                className="min-h-11"
                onPress={() => refetchTrainingPlan()}
                size="md"
                variant="primary"
              >
                Retry
              </Button>
              <Button
                className="min-h-11"
                onPress={() => attemptNavigate(returnTo)}
                size="md"
                variant="ghost"
              >
                Back to library
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {/* Breadcrumb navigation */}
      <Button
        className="min-h-9 w-fit gap-2 px-2 text-muted hover:text-foreground"
        onPress={() => attemptNavigate(returnTo)}
        size="sm"
        variant="ghost"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to library
      </Button>

      {/* Hero header */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted">Library</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{pageTitle}</h1>
        <p className="max-w-lg text-sm text-muted">
          Define plan metadata before building day blocks and workout elements.
        </p>
      </div>

      {/* Separator */}
      <div className="border-t border-separator" />

      <form
        className="flex flex-col gap-6"
        onSubmit={onSubmit}
      >
        {/* Basics section */}
        <section className="flex flex-col gap-4 rounded-xl border border-separator bg-surface p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted" />
            <p className="text-sm font-semibold text-foreground">Basics</p>
          </div>

          <TextField isInvalid={Boolean(errors.name?.message)}>
            <Label className="text-sm font-medium text-foreground">Name</Label>
            <Input
              placeholder="e.g. 12-Week Strength Base"
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

        {/* Plan setup section */}
        <section className="flex flex-col gap-4 rounded-xl border border-separator bg-surface p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted" />
            <p className="text-sm font-semibold text-foreground">Plan setup</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground">Type</Label>
              <div className="flex gap-2">
                <button
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                    isTemplate
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-separator bg-background text-muted hover:border-blue-200 hover:text-foreground'
                  }`}
                  onClick={() => setValue('is_template', true)}
                  type="button"
                >
                  Template
                </button>
                <button
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                    !isTemplate
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-separator bg-background text-muted hover:border-blue-200 hover:text-foreground'
                  }`}
                  onClick={() => setValue('is_template', false)}
                  type="button"
                >
                  Personal
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground">Status</Label>
              <div className="flex flex-wrap gap-2">
                {(['draft', 'active', 'archived'] as const).map((status) => {
                  const isSelected = selectedStatus === status;
                  const statusColors = {
                    active: isSelected
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-separator bg-background text-muted hover:border-green-200',
                    archived: isSelected
                      ? 'border-gray-300 bg-gray-100 text-gray-700'
                      : 'border-separator bg-background text-muted hover:border-gray-300',
                    draft: isSelected
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-separator bg-background text-muted hover:border-amber-200',
                  };

                  return (
                    <button
                      className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${statusColors[status]}`}
                      key={status}
                      onClick={() => setValue('status', status)}
                      type="button"
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Assignment metadata section */}
        {!isTemplate ? (
          <section className="flex flex-col gap-4 rounded-xl border border-separator bg-surface p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted" />
              <p className="text-sm font-semibold text-foreground">Assignment metadata</p>
            </div>

            <TextField isInvalid={Boolean(errors.client_id?.message)}>
              <Label className="text-sm font-medium text-foreground">Client</Label>
              <select
                className="min-h-11 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground transition-colors focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                {...register('client_id')}
              >
                <option value="">Select client</option>
                {clients.map((client) => {
                  const fullName = `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim();
                  const label = fullName || client.email;
                  return (
                    <option
                      key={client.id}
                      value={client.id}
                    >
                      {label}
                    </option>
                  );
                })}
              </select>
              {errors.client_id?.message ? <FieldError>{errors.client_id.message}</FieldError> : null}
            </TextField>

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField isInvalid={Boolean(errors.start_date?.message)}>
                <Label className="text-sm font-medium text-foreground">Start date</Label>
                <Input
                  type="date"
                  variant="secondary"
                  {...register('start_date')}
                />
                {errors.start_date?.message ? <FieldError>{errors.start_date.message}</FieldError> : null}
              </TextField>

              <TextField isInvalid={Boolean(errors.end_date?.message)}>
                <Label className="text-sm font-medium text-foreground">End date</Label>
                <Input
                  type="date"
                  variant="secondary"
                  {...register('end_date')}
                />
                {errors.end_date?.message ? <FieldError>{errors.end_date.message}</FieldError> : null}
              </TextField>
            </div>
          </section>
        ) : null}

        {/* Form error */}
        {formError ? (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <p className="text-sm font-medium text-red-700">{formError}</p>
          </div>
        ) : null}

        {/* Action footer */}
        <div className="flex flex-col-reverse gap-3 border-t border-separator pt-5 sm:flex-row sm:justify-end">
          {isEditing ? (
            <Button
              className="min-h-11 sm:mr-auto"
              onPress={() => setIsDeleteOpen(true)}
              size="md"
              type="button"
              variant="danger"
            >
              Delete training plan
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
        confirmLabel="Delete training plan"
        description={`Are you sure you want to delete ${trainingPlanData?.data?.name ?? 'this training plan'}? This cannot be undone.`}
        isLoading={isDeleting}
        isOpen={isDeleteOpen}
        onConfirm={handleDelete}
        onOpenChange={setIsDeleteOpen}
        title="Delete training plan"
      />
    </div>
  );
}
