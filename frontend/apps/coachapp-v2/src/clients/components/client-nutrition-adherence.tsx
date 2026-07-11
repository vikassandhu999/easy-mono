import {Fieldset, Skeleton, Typography, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Pencil, Utensils} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useForm} from 'react-hook-form';
import {Link} from 'react-router-dom';
import {z} from 'zod';

import {FieldRow, FormActions, FormLayout, FormNumberField} from '@/@components/form-fields';
import {ROUTES} from '@/@config/routes';
import type {NutritionPlan, NutritionPlanRequest} from '@/api/generated';
import {useListCoachClientNutritionPlansQuery, useUpdateNutritionPlanMutation} from '@/api/nutrition-plans-list';
import {applyFormErrors, omitUndefined} from '@/api/shared';
import PlanAssignControl from '@/clients/components/plan-assign-control';
import {PLAN_STATUS_MAP, UNKNOWN_PLAN_STATUS} from '@/clients/lib/client';
import {
  formatAssignedDate,
  formatNumber,
  getProgramProgress,
  softStatusClass,
} from '@/clients/lib/client-detail-metrics';

const macroSchema = z.object({
  target_calories: z.number().min(0, 'Use 0 or higher').optional(),
  target_carbs_g: z.number().min(0, 'Use 0 or higher').optional(),
  target_fat_g: z.number().min(0, 'Use 0 or higher').optional(),
  target_protein_g: z.number().min(0, 'Use 0 or higher').optional(),
});

type MacroFormValues = z.infer<typeof macroSchema>;

const MACRO_FIELDS = [
  {label: 'Calories', name: 'target_calories', unit: 'kcal'},
  {label: 'Protein (g)', name: 'target_protein_g', unit: 'g'},
  {label: 'Carbs (g)', name: 'target_carbs_g', unit: 'g'},
  {label: 'Fat (g)', name: 'target_fat_g', unit: 'g'},
] as const;

function selectCurrentPlan(plans: NutritionPlan[]): NutritionPlan | null {
  return (
    [...plans].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'active' ? -1 : 1;
      }
      return (b.start_date ?? b.inserted_at).localeCompare(a.start_date ?? a.inserted_at);
    })[0] ?? null
  );
}

function defaultsFor(plan: NutritionPlan): MacroFormValues {
  return {
    target_calories: plan.target_calories ?? undefined,
    target_carbs_g: plan.target_carbs_g ?? undefined,
    target_fat_g: plan.target_fat_g ?? undefined,
    target_protein_g: plan.target_protein_g ?? undefined,
  };
}

function updateRequest(plan: NutritionPlan, values: MacroFormValues): NutritionPlanRequest {
  return omitUndefined({
    description: plan.description ?? null,
    end_date: plan.end_date,
    name: plan.name,
    start_date: plan.start_date,
    status: plan.status,
    tags: plan.tags,
    target_calories: values.target_calories,
    target_carbs_g: values.target_carbs_g,
    target_fat_g: values.target_fat_g,
    target_fiber_g: plan.target_fiber_g,
    target_protein_g: values.target_protein_g,
  });
}

function ProgramSegments({percent, totalWeeks}: {percent: null | number; totalWeeks: null | number}) {
  const count = Math.min(12, Math.max(4, totalWeeks ?? 8));
  const filled = percent == null ? 0 : Math.round((percent / 100) * count);
  return (
    <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-12">
      {Array.from({length: count}, (_, index) => (
        <span
          aria-hidden
          className={`h-2 rounded-full ${index < filled ? 'bg-accent' : 'bg-surface-secondary'}`}
          key={`nutrition-progress-${index + 1}`}
        />
      ))}
    </div>
  );
}

function MacroEditor({onClose, plan}: {onClose: () => void; plan: NutritionPlan}) {
  const [updatePlan, {isLoading}] = useUpdateNutritionPlanMutation();
  const form = useForm<MacroFormValues>({
    defaultValues: defaultsFor(plan),
    resolver: zodResolver(macroSchema),
  });

  const handleSubmit = async (values: MacroFormValues) => {
    try {
      await updatePlan({id: plan.id, nutritionPlanRequest: updateRequest(plan, values)}).unwrap();
      toast.success('Macro targets saved');
      onClose();
    } catch (error) {
      applyFormErrors(
        error,
        "Macro targets weren't saved. Check the values and try again.",
        form.setError,
        MACRO_FIELDS.map((field) => field.name),
      );
    }
  };

  return (
    <div className="mt-4 rounded-[16px] border-[1.5px] border-separator bg-surface-secondary p-4 lg:rounded-[18px]">
      <FormLayout
        className="max-w-none gap-5"
        onSubmit={form.handleSubmit(handleSubmit)}
        validationBehavior="aria"
      >
        <Fieldset>
          <Fieldset.Legend>Macro targets</Fieldset.Legend>
          <Fieldset.Group>
            <FieldRow>
              {MACRO_FIELDS.map((field) => (
                <FormNumberField
                  control={form.control}
                  fullWidth
                  key={field.name}
                  label={field.label}
                  minValue={0}
                  name={field.name}
                />
              ))}
            </FieldRow>
          </Fieldset.Group>
        </Fieldset>

        {form.formState.errors.root ? (
          <Typography
            className="text-danger-soft-foreground"
            type="body-sm"
          >
            {form.formState.errors.root.message}
          </Typography>
        ) : null}

        <FormActions
          isSubmitting={isLoading}
          onCancel={onClose}
          submitLabel="Save targets"
          submittingLabel="Saving targets"
        />
      </FormLayout>
    </div>
  );
}

export default function ClientNutritionAdherence({clientId, clientName}: {clientId: string; clientName: string}) {
  const [editing, setEditing] = useState(false);
  const {data, isError, isLoading} = useListCoachClientNutritionPlansQuery({clientId});
  const plan = useMemo(() => selectCurrentPlan(data?.data ?? []), [data]);
  const progress = plan ? getProgramProgress(plan) : null;
  const status = plan ? (PLAN_STATUS_MAP[plan.status] ?? UNKNOWN_PLAN_STATUS) : null;

  return (
    <section>
      <div className="mb-5 hidden flex-col gap-3 lg:flex lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-grotesk text-xl font-bold">Nutrition plan</h2>
          <Typography
            className="mt-1"
            color="muted"
            type="body-sm"
          >
            {plan ? `${formatAssignedDate(plan.start_date)} · ${plan.status}` : 'No assigned plan'}
          </Typography>
        </div>
        {plan ? (
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-separator bg-surface px-4 text-[12.5px] font-bold transition-colors hover:bg-surface-hover"
            onClick={() => setEditing((value) => !value)}
            type="button"
          >
            <Pencil size={15} />
            Edit plan
          </button>
        ) : (
          <PlanAssignControl
            clientId={clientId}
            clientName={clientName}
            kind="nutrition"
            label="Assign nutrition plan"
          />
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-[18px]" />
          <Skeleton className="h-28 rounded-[18px]" />
        </div>
      ) : isError ? (
        <Typography
          color="muted"
          type="body-sm"
        >
          Couldn&apos;t load nutrition plan.
        </Typography>
      ) : plan ? (
        <>
          <div className="rounded-[16px] border-[1.5px] border-separator bg-surface p-4 lg:rounded-[18px] lg:p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-accent-soft text-accent lg:size-[42px] lg:rounded-[12px]">
                <Utensils size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <Typography
                  truncate
                  type="body-sm"
                  weight="bold"
                >
                  {plan.name}
                </Typography>
                <Typography
                  className="mt-0.5"
                  color="muted"
                  truncate
                  type="body-xs"
                >
                  {formatNumber(plan.target_calories)} kcal daily
                </Typography>
              </div>
              {status ? (
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${softStatusClass(plan.status)}`}>
                  {status.label}
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {MACRO_FIELDS.map((field) => {
                const value = plan[field.name];
                return (
                  <div
                    className="rounded-[12px] border-[1.5px] border-separator px-3 py-3 text-center"
                    key={field.name}
                  >
                    <div className="font-grotesk text-[17px] font-bold lg:text-[19px]">{formatNumber(value)}</div>
                    <Typography
                      className="mt-0.5"
                      color="muted"
                      type="body-xs"
                    >
                      {field.unit}
                    </Typography>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 rounded-[16px] border-[1.5px] border-separator bg-surface p-4 lg:rounded-[18px] lg:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Typography
                type="body-sm"
                weight="semibold"
              >
                Program completion
              </Typography>
              <Typography
                className="text-accent"
                type="body-xs"
                weight="bold"
              >
                {progress?.weekLabel}
              </Typography>
            </div>
            <ProgramSegments
              percent={progress?.percent ?? null}
              totalWeeks={progress?.totalWeeks ?? null}
            />
            <div className="mt-3 flex flex-col gap-1 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
              <span>{progress?.percent == null ? 'Completion unavailable' : `${progress.percent}% complete`}</span>
              <span>{progress?.endsLabel}</span>
            </div>
          </div>

          {editing ? (
            <MacroEditor
              onClose={() => setEditing(false)}
              plan={plan}
            />
          ) : null}

          <Link
            className="mt-4 inline-flex min-h-11 items-center rounded-[12px] px-3 text-sm font-semibold text-muted transition-colors hover:bg-surface-hover"
            to={ROUTES.NUTRITION_PLAN_DETAIL.replace(':id', plan.id)}
          >
            Open in builder
          </Link>
        </>
      ) : (
        <Typography
          color="muted"
          type="body-sm"
        >
          No nutrition plan assigned yet.
        </Typography>
      )}
    </section>
  );
}
