import {Button, Description, ErrorMessage, Fieldset} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import type {BaseSyntheticEvent} from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';

import DateInput from '@/@components/date-input';
import {FieldRow} from '@/@components/form-fields/field-row';
import {FormLayout} from '@/@components/form-fields/form-layout';
import {type BillingSummary, getSeatLimitError} from '@/api/billing';
import type {Client} from '@/api/clients';
import {useUpdateClientMutation} from '@/api/clients';
import {applyFormErrors} from '@/api/shared';
import {PickerModal} from '@/builder-kit/picker-modal';
import {coachingPeriodUpdate, renewalEndDateIsValid, subscriptionDatesAreOrdered} from '@/clients/lib/client';

const coachingPeriodSchema = z
  .object({
    subscription_ends_on: z.string(),
    subscription_started_on: z.string(),
  })
  .superRefine((values, ctx) => {
    if (!subscriptionDatesAreOrdered(values.subscription_started_on, values.subscription_ends_on)) {
      ctx.addIssue({
        code: 'custom',
        message: 'End date must be on or after the start date',
        path: ['subscription_ends_on'],
      });
    }
  });

type CoachingPeriodValues = z.infer<typeof coachingPeriodSchema>;
type PeriodIntent = 'edit' | 'reactivate' | 'renew';

const PERIOD_DIALOG_COPY: Record<PeriodIntent, {description: string; submit: string; title: string}> = {
  edit: {
    description: 'These dates describe the coaching engagement, not business billing.',
    submit: 'Save period',
    title: 'Edit coaching period',
  },
  reactivate: {
    description: 'Set a new end date, or leave Ends blank for ongoing access. Reactivation restores access.',
    submit: 'Reactivate',
    title: 'Reactivate coaching access',
  },
  renew: {
    description: 'Set a new end date, or leave Ends blank for ongoing access. Renewal restores access.',
    submit: 'Renew access',
    title: 'Renew coaching access',
  },
};

export function CoachingPeriodDialog({
  client,
  intent,
  onClose,
  onSeatLimit,
}: {
  client: Client;
  intent: PeriodIntent;
  onClose: () => void;
  onSeatLimit: (summary: BillingSummary) => void;
}) {
  const updateClient = useUpdateClientMutation();
  const restoresAccess = intent !== 'edit';
  const copy = PERIOD_DIALOG_COPY[intent];
  const form = useForm<CoachingPeriodValues>({
    resolver: zodResolver(coachingPeriodSchema),
    defaultValues: {
      subscription_ends_on: restoresAccess ? '' : (client.subscription_ends_on ?? ''),
      subscription_started_on: client.subscription_started_on ?? '',
    },
  });

  const save = async (values: CoachingPeriodValues) => {
    if (restoresAccess && !renewalEndDateIsValid(values.subscription_ends_on, new Date().toISOString().slice(0, 10))) {
      form.setError('subscription_ends_on', {message: 'End date must be today or later'});
      return;
    }
    try {
      await updateClient.mutateAsync({
        body: coachingPeriodUpdate(values.subscription_started_on, values.subscription_ends_on, restoresAccess),
        id: client.id,
      });
      onClose();
    } catch (err) {
      const limit = getSeatLimitError(err);
      if (limit) {
        onSeatLimit(limit.seatSummary);
        return;
      }
      applyFormErrors(err, "The coaching period wasn't saved. Check the dates and try again", form.setError, [
        'subscription_ends_on',
        'subscription_started_on',
      ]);
    }
  };

  const submit = (event?: BaseSyntheticEvent) => {
    form.clearErrors();
    return form.handleSubmit(save)(event);
  };

  return (
    <PickerModal
      bodyClassName="px-4 py-3"
      footer={
        <div className="flex justify-end gap-2">
          <Button
            isDisabled={updateClient.isPending}
            onPress={onClose}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            isPending={updateClient.isPending}
            onPress={() => submit()}
          >
            {copy.submit}
          </Button>
        </div>
      }
      isDismissable={!updateClient.isPending}
      onClose={onClose}
      open
      title={copy.title}
    >
      <FormLayout onSubmit={submit}>
        <Fieldset>
          <Description>{copy.description}</Description>
          <Fieldset.Group>
            <FieldRow>
              <DateInput
                errorMessage={form.formState.errors.subscription_started_on?.message}
                label="Starts"
                onChange={(value) => {
                  form.clearErrors('subscription_started_on');
                  form.setValue('subscription_started_on', value ?? '', {shouldDirty: true});
                }}
                value={form.watch('subscription_started_on') || null}
              />
              <DateInput
                errorMessage={form.formState.errors.subscription_ends_on?.message}
                label="Ends"
                onChange={(value) => {
                  form.clearErrors('subscription_ends_on');
                  form.setValue('subscription_ends_on', value ?? '', {shouldDirty: true});
                }}
                value={form.watch('subscription_ends_on') || null}
              />
            </FieldRow>
          </Fieldset.Group>
        </Fieldset>
        {form.formState.errors.root ? <ErrorMessage>{form.formState.errors.root.message}</ErrorMessage> : null}
      </FormLayout>
    </PickerModal>
  );
}
