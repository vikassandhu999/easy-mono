import {Button, FieldError, Input, Label, ListBox, Select, TextArea, TextField} from '@heroui/react';
import {
  type Control,
  Controller,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  useWatch,
} from 'react-hook-form';

import type {Client} from '@/api/clients';
import type {TrainingPlanFormValues} from '@/pages/library/trainingPlanFormTypes';

type TrainingPlanFormFieldsProps = {
  clients: Client[];
  control: Control<TrainingPlanFormValues>;
  errors: FieldErrors<TrainingPlanFormValues>;
  register: UseFormRegister<TrainingPlanFormValues>;
  setValue: UseFormSetValue<TrainingPlanFormValues>;
};

const SECTION = 'flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5';

const getClientLabel = (client: Client): string => {
  const fullName = `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim();
  return fullName || client.email;
};

export default function TrainingPlanFormFields({
  clients,
  control,
  errors,
  register,
  setValue,
}: TrainingPlanFormFieldsProps) {
  const isTemplate = useWatch({control, name: 'is_template'});
  const selectedStatus = useWatch({control, name: 'status'});

  return (
    <>
      <section className={SECTION}>
        <p className="text-sm font-semibold text-foreground">Basics</p>

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

      <section className={SECTION}>
        <p className="text-sm font-semibold text-foreground">Plan setup</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">Type</Label>
            <div className="flex gap-2">
              <Button
                className="min-h-11 flex-1"
                onPress={() => setValue('is_template', true)}
                type="button"
                variant={isTemplate ? 'secondary' : 'outline'}
              >
                Template
              </Button>
              <Button
                className="min-h-11 flex-1"
                onPress={() => setValue('is_template', false)}
                type="button"
                variant={!isTemplate ? 'secondary' : 'outline'}
              >
                Personal
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">Status</Label>
            <div className="flex flex-wrap gap-2">
              {(['draft', 'active', 'archived'] as const).map((status) => (
                <Button
                  className="min-h-11 flex-1"
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

      {!isTemplate ? (
        <section className={SECTION}>
          <p className="text-sm font-semibold text-foreground">Assignment metadata</p>

          <Controller
            control={control}
            name="client_id"
            render={({field}) => (
              <div className="flex flex-col gap-1">
                <Select
                  aria-label="Client"
                  onSelectionChange={(key) => field.onChange(key?.toString() ?? '')}
                  placeholder="Select client"
                  selectedKey={field.value || null}
                  variant="secondary"
                >
                  <Label className="text-sm font-medium text-foreground">Client</Label>
                  <Select.Trigger className="min-h-11">
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {clients.map((client) => (
                        <ListBox.Item
                          id={client.id}
                          key={client.id}
                          textValue={getClientLabel(client)}
                        >
                          {getClientLabel(client)}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
                {errors.client_id?.message ? <FieldError>{errors.client_id.message}</FieldError> : null}
              </div>
            )}
          />

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
    </>
  );
}
