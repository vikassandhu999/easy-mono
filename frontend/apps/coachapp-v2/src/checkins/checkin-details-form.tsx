/**
 * Form template details (name + type) — the FB counterpart of
 * `training-plan-form`. Used by the create screen and the edit-details screen;
 * questions are built on the builder screen, never here.
 */

import {isOneOf} from '@easy/utils/closed-vocabulary';
import {Description, ErrorMessage, Fieldset, Label, ToggleButton, ToggleButtonGroup} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Controller, useForm} from 'react-hook-form';
import {z} from 'zod';
import {FormActions} from '@/@components/form-fields/form-actions';
import {FormLayout} from '@/@components/form-fields/form-layout';
import {FormPanel} from '@/@components/form-fields/form-panel';
import {FormTextField} from '@/@components/form-fields/form-text-field';
import {PURPOSE_LABELS, PURPOSES} from '@/api/checkins';

export const checkinDetailsSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  purpose: z.enum(['check_in', 'intake']),
});

export type CheckinDetailsValues = z.infer<typeof checkinDetailsSchema>;

const CHECKIN_DETAILS_DEFAULTS: CheckinDetailsValues = {name: '', purpose: 'check_in'};

export function useCheckinDetailsForm(options?: {defaultValues?: CheckinDetailsValues}) {
  return useForm<CheckinDetailsValues>({
    defaultValues: options?.defaultValues ?? CHECKIN_DETAILS_DEFAULTS,
    resolver: zodResolver(checkinDetailsSchema),
  });
}

type CheckinDetailsFormProps = {
  form: ReturnType<typeof useCheckinDetailsForm>;
  isSubmitting: boolean;
  /** Type is chosen at creation only — the edit screen renders it locked. */
  isPurposeLocked?: boolean;
  onCancel: () => void;
  onSubmit: (data: CheckinDetailsValues) => void;
  submitLabel: string;
  submittingLabel: string;
};

export default function CheckinDetailsForm({
  form,
  isPurposeLocked,
  isSubmitting,
  onCancel,
  onSubmit,
  submitLabel,
  submittingLabel,
}: CheckinDetailsFormProps) {
  const {
    control,
    formState: {errors},
    handleSubmit,
  } = form;

  return (
    <FormLayout onSubmit={handleSubmit(onSubmit)}>
      <FormPanel>
        <Fieldset>
          <Fieldset.Legend>Form details</Fieldset.Legend>
          <Description>Name the form and choose how clients use it.</Description>

          <Fieldset.Group>
            <FormTextField
              control={control}
              fullWidth
              inputProps={{placeholder: 'e.g. Weekly Check-in'}}
              isRequired
              label="Name"
              name="name"
            />

            <Controller
              control={control}
              name="purpose"
              render={({field}) => (
                <div className="flex flex-col gap-2">
                  <Label>Type</Label>
                  <ToggleButtonGroup
                    aria-label="Form type"
                    className="segmented"
                    isDetached
                    {...(isPurposeLocked != null ? {isDisabled: isPurposeLocked} : {})}
                    onSelectionChange={(keys) => {
                      const next = [...keys][0];
                      if (isOneOf(PURPOSES, next)) {
                        field.onChange(next);
                      }
                    }}
                    selectedKeys={[field.value]}
                    selectionMode="single"
                  >
                    {PURPOSES.map((purpose) => (
                      <ToggleButton
                        id={purpose}
                        key={purpose}
                      >
                        {PURPOSE_LABELS[purpose]}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                  {isPurposeLocked ? <Description>Type is set when the form is created.</Description> : null}
                </div>
              )}
            />
          </Fieldset.Group>
        </Fieldset>
      </FormPanel>

      {errors.root && <ErrorMessage>{errors.root.message}</ErrorMessage>}

      <FormActions
        isSubmitting={isSubmitting}
        onCancel={onCancel}
        submitLabel={submitLabel}
        submittingLabel={submittingLabel}
      />
    </FormLayout>
  );
}
