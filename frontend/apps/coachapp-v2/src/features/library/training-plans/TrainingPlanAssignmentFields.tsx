import {DateField, DatePicker, FieldError, Label, ListBox, Select} from '@heroui/react';
import {parseDate} from '@internationalized/date';
import {type Control, Controller, type FieldErrors} from 'react-hook-form';

import type {Client} from '@/entities/clients/api/clients';
import type {TrainingPlanFormValues} from '@/features/library/training-plans/trainingPlanFormTypes';

import DatePickerCalendar from '@/features/library/shared/DatePickerCalendar';

const getClientLabel = (client: Client): string => {
  const fullName = `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim();
  return fullName || client.email;
};

type TrainingPlanAssignmentFieldsProps = {
  clients: Client[];
  control: Control<TrainingPlanFormValues>;
  errors: FieldErrors<TrainingPlanFormValues>;
};

export default function TrainingPlanAssignmentFields({clients, control, errors}: TrainingPlanAssignmentFieldsProps) {
  return (
    <>
      <div className="border-t border-separator" />

      <p className="text-sm font-semibold text-foreground">Assignment</p>

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
        <Controller
          control={control}
          name="start_date"
          render={({field}) => (
            <div className="flex flex-col gap-1">
              <DatePicker
                isInvalid={Boolean(errors.start_date?.message)}
                onChange={(date) => field.onChange(date?.toString() ?? '')}
                value={field.value ? parseDate(field.value) : null}
              >
                <Label className="text-sm font-medium text-foreground">Start date</Label>
                <DateField.Group
                  fullWidth
                  variant={'secondary'}
                >
                  <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
                  <DateField.Suffix>
                    <DatePicker.Trigger>
                      <DatePicker.TriggerIndicator />
                    </DatePicker.Trigger>
                  </DateField.Suffix>
                </DateField.Group>
                <DatePicker.Popover>{DatePickerCalendar}</DatePicker.Popover>
              </DatePicker>
              {errors.start_date?.message ? <FieldError>{errors.start_date.message}</FieldError> : null}
            </div>
          )}
        />

        <Controller
          control={control}
          name="end_date"
          render={({field}) => (
            <div className="flex flex-col gap-1">
              <DatePicker
                isInvalid={Boolean(errors.end_date?.message)}
                onChange={(date) => field.onChange(date?.toString() ?? '')}
                value={field.value ? parseDate(field.value) : null}
              >
                <Label className="text-sm font-medium text-foreground">End date</Label>
                <DateField.Group
                  fullWidth
                  variant={'secondary'}
                >
                  <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
                  <DateField.Suffix>
                    <DatePicker.Trigger>
                      <DatePicker.TriggerIndicator />
                    </DatePicker.Trigger>
                  </DateField.Suffix>
                </DateField.Group>
                <DatePicker.Popover>{DatePickerCalendar}</DatePicker.Popover>
              </DatePicker>
              {errors.end_date?.message ? <FieldError>{errors.end_date.message}</FieldError> : null}
            </div>
          )}
        />
      </div>
    </>
  );
}
