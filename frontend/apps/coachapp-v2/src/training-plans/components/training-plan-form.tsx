import {
  Button,
  Calendar,
  DateField,
  DatePicker,
  Input,
  Label,
  ListBox,
  Select,
  Spinner,
  Switch,
  TextArea,
} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {type CalendarDate, parseDate} from '@internationalized/date';
import {Controller, useForm} from 'react-hook-form';
import {z} from 'zod';

export const PLAN_STATUS_OPTIONS = [
  {label: 'Draft', value: 'draft'},
  {label: 'Active', value: 'active'},
  {label: 'Archived', value: 'archived'},
] as const;

export const trainingPlanFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  is_template: z.boolean().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export type TrainingPlanFormValues = z.infer<typeof trainingPlanFormSchema>;

export const TRAINING_PLAN_FORM_DEFAULTS: TrainingPlanFormValues = {
  name: '',
  description: '',
  status: 'draft',
  is_template: true,
  start_date: '',
  end_date: '',
};

/** Convert ISO date string (e.g. "2026-04-01") to CalendarDate, or null if empty/invalid */
function toCalendarDate(dateStr: string | undefined): CalendarDate | null {
  if (!dateStr) return null;
  try {
    return parseDate(dateStr);
  } catch {
    return null;
  }
}

/** Hook wrapper so screens don't need to import zod/resolver separately */
export function useTrainingPlanForm(options?: {values?: TrainingPlanFormValues}) {
  return useForm<TrainingPlanFormValues>({
    defaultValues: options?.values ? undefined : TRAINING_PLAN_FORM_DEFAULTS,
    resolver: zodResolver(trainingPlanFormSchema),
    values: options?.values,
  });
}

type TrainingPlanFormProps = {
  form: ReturnType<typeof useTrainingPlanForm>;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (data: TrainingPlanFormValues) => void;
  submitLabel: string;
  submittingLabel: string;
};

export default function TrainingPlanForm({
  form,
  isSubmitting,
  onCancel,
  onSubmit,
  submitLabel,
  submittingLabel,
}: TrainingPlanFormProps) {
  const {
    control,
    formState: {errors},
    handleSubmit,
    register,
  } = form;

  return (
    <form
      className="flex max-w-lg flex-col gap-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">
          Name <span className="text-danger">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g. Push Pull Legs"
          {...register('name')}
        />
        {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <TextArea
          id="description"
          placeholder="Brief description of this training plan..."
          rows={2}
          {...register('description')}
        />
        {errors.description && <p className="text-xs text-danger">{errors.description.message}</p>}
      </div>

      {/* Status + Template side by side on md */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Controller
            control={control}
            name="status"
            render={({field}) => (
              <Select
                onSelectionChange={(key) => field.onChange(key)}
                placeholder="Select status"
                selectedKey={field.value || null}
              >
                <Label>Status</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {PLAN_STATUS_OPTIONS.map((opt) => (
                      <ListBox.Item
                        id={opt.value}
                        key={opt.value}
                        textValue={opt.label}
                      >
                        {opt.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
          />
          {errors.status && <p className="text-xs text-danger">{errors.status.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Template</Label>
          <Controller
            control={control}
            name="is_template"
            render={({field}) => (
              <Switch
                isSelected={field.value ?? true}
                onChange={field.onChange}
              >
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <Switch.Content>
                  <span className="text-sm">Save as template</span>
                </Switch.Content>
              </Switch>
            )}
          />
        </div>
      </div>

      {/* Start date + End date */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Controller
          control={control}
          name="start_date"
          render={({field}) => (
            <DatePicker
              onChange={(val: CalendarDate | null) => field.onChange(val ? val.toString() : '')}
              value={toCalendarDate(field.value) as never}
            >
              <Label>Start date</Label>
              <DateField.Group fullWidth>
                <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
                <DateField.Suffix>
                  <DatePicker.Trigger>
                    <DatePicker.TriggerIndicator />
                  </DatePicker.Trigger>
                </DateField.Suffix>
              </DateField.Group>
              <DatePicker.Popover>
                <Calendar aria-label="Start date">
                  <Calendar.Header>
                    <Calendar.YearPickerTrigger>
                      <Calendar.YearPickerTriggerHeading />
                      <Calendar.YearPickerTriggerIndicator />
                    </Calendar.YearPickerTrigger>
                    <Calendar.NavButton slot="previous" />
                    <Calendar.NavButton slot="next" />
                  </Calendar.Header>
                  <Calendar.Grid>
                    <Calendar.GridHeader>
                      {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                    </Calendar.GridHeader>
                    <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
                  </Calendar.Grid>
                  <Calendar.YearPickerGrid>
                    <Calendar.YearPickerGridBody>
                      {({year}) => <Calendar.YearPickerCell year={year} />}
                    </Calendar.YearPickerGridBody>
                  </Calendar.YearPickerGrid>
                </Calendar>
              </DatePicker.Popover>
            </DatePicker>
          )}
        />
        {errors.start_date && <p className="text-xs text-danger">{errors.start_date.message}</p>}

        <Controller
          control={control}
          name="end_date"
          render={({field}) => (
            <DatePicker
              onChange={(val: CalendarDate | null) => field.onChange(val ? val.toString() : '')}
              value={toCalendarDate(field.value) as never}
            >
              <Label>End date</Label>
              <DateField.Group fullWidth>
                <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
                <DateField.Suffix>
                  <DatePicker.Trigger>
                    <DatePicker.TriggerIndicator />
                  </DatePicker.Trigger>
                </DateField.Suffix>
              </DateField.Group>
              <DatePicker.Popover>
                <Calendar aria-label="End date">
                  <Calendar.Header>
                    <Calendar.YearPickerTrigger>
                      <Calendar.YearPickerTriggerHeading />
                      <Calendar.YearPickerTriggerIndicator />
                    </Calendar.YearPickerTrigger>
                    <Calendar.NavButton slot="previous" />
                    <Calendar.NavButton slot="next" />
                  </Calendar.Header>
                  <Calendar.Grid>
                    <Calendar.GridHeader>
                      {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                    </Calendar.GridHeader>
                    <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
                  </Calendar.Grid>
                  <Calendar.YearPickerGrid>
                    <Calendar.YearPickerGridBody>
                      {({year}) => <Calendar.YearPickerCell year={year} />}
                    </Calendar.YearPickerGridBody>
                  </Calendar.YearPickerGrid>
                </Calendar>
              </DatePicker.Popover>
            </DatePicker>
          )}
        />
        {errors.end_date && <p className="text-xs text-danger">{errors.end_date.message}</p>}
      </div>

      {/* Root error */}
      {errors.root && <p className="text-sm text-danger">{errors.root.message}</p>}

      {/* Actions */}
      <div className="flex flex-row gap-2 pt-2">
        <Button
          isPending={isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <>
              <Spinner
                color="current"
                size="sm"
              />
              {submittingLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
        <Button
          onPress={onCancel}
          variant="ghost"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
