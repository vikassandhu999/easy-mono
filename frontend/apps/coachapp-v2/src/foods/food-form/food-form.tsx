import {
  Button,
  Description,
  ErrorMessage,
  FieldError,
  Fieldset,
  Form,
  Input,
  Label,
  NumberField,
  Spinner,
  TextArea,
  TextField,
  Typography,
} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Plus, X} from 'lucide-react';
import {useCallback, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {z} from 'zod';

import type {ServingSize} from '@/api/shared';

export const foodFormSchema = z.object({
  name: z.string().min(1, 'Enter food name'),
  category: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  calories_per_100g: z.number().min(0, 'Use 0 or higher').optional(),
  protein_g: z.number().min(0, 'Use 0 or higher').optional(),
  carbs_g: z.number().min(0, 'Use 0 or higher').optional(),
  fats_g: z.number().min(0, 'Use 0 or higher').optional(),
  fiber_g: z.number().min(0, 'Use 0 or higher').optional(),
  sugar_g: z.number().min(0, 'Use 0 or higher').optional(),
});

export type FoodFormValues = z.infer<typeof foodFormSchema>;

export const FOOD_FORM_DEFAULTS: FoodFormValues = {
  name: '',
  category: '',
  source: '',
  notes: '',
  calories_per_100g: undefined,
  protein_g: undefined,
  carbs_g: undefined,
  fats_g: undefined,
  fiber_g: undefined,
  sugar_g: undefined,
};

export function useFoodForm(options?: {defaultValues?: FoodFormValues; values?: FoodFormValues}) {
  return useForm<FoodFormValues>({
    defaultValues: options?.values ? undefined : (options?.defaultValues ?? FOOD_FORM_DEFAULTS),
    resolver: zodResolver(foodFormSchema),
    values: options?.values,
  });
}

type FoodFormProps = {
  form: ReturnType<typeof useFoodForm>;
  isSubmitting: boolean;
  onCancel: () => void;
  onServingSizesChange: (sizes: ServingSize[]) => void;
  onSubmit: (data: FoodFormValues) => void;
  servingSizes: ServingSize[];
  submitLabel: string;
  submittingLabel: string;
};

type MacroFieldName = 'calories_per_100g' | 'carbs_g' | 'fats_g' | 'fiber_g' | 'protein_g' | 'sugar_g';

type MacroFieldConfig = {
  label: string;
  name: MacroFieldName;
  step?: number;
};

const MACRO_FIELDS: MacroFieldConfig[] = [
  {label: 'Calories (optional)', name: 'calories_per_100g'},
  {label: 'Protein, grams (optional)', name: 'protein_g', step: 0.1},
  {label: 'Carbs, grams (optional)', name: 'carbs_g', step: 0.1},
  {label: 'Fat, grams (optional)', name: 'fats_g', step: 0.1},
  {label: 'Fiber, grams (optional)', name: 'fiber_g', step: 0.1},
  {label: 'Sugar, grams (optional)', name: 'sugar_g', step: 0.1},
];

function MacroNumberField({fieldConfig, form}: {fieldConfig: MacroFieldConfig; form: ReturnType<typeof useFoodForm>}) {
  const error = form.formState.errors[fieldConfig.name]?.message;

  return (
    <Controller
      control={form.control}
      name={fieldConfig.name}
      render={({field}) => (
        <NumberField
          fullWidth
          isInvalid={!!error}
          minValue={0}
          name={field.name}
          onBlur={field.onBlur}
          onChange={(value) => field.onChange(Number.isNaN(value) ? undefined : value)}
          step={fieldConfig.step}
          value={field.value}
        >
          <Label>{fieldConfig.label}</Label>
          {error && <FieldError>{error}</FieldError>}
          <NumberField.Group>
            <NumberField.Input />
          </NumberField.Group>
        </NumberField>
      )}
    />
  );
}

export default function FoodForm({
  form,
  isSubmitting,
  onCancel,
  onServingSizesChange,
  onSubmit,
  servingSizes,
  submitLabel,
  submittingLabel,
}: FoodFormProps) {
  const {
    control,
    formState: {errors},
    handleSubmit,
  } = form;

  const [isAddingServing, setIsAddingServing] = useState(false);
  const [newUnit, setNewUnit] = useState('');
  const [newAmount, setNewAmount] = useState<number | undefined>();
  const [newWeightG, setNewWeightG] = useState<number | undefined>();
  const [servingError, setServingError] = useState('');

  const resetServingForm = useCallback(() => {
    setNewUnit('');
    setNewAmount(undefined);
    setNewWeightG(undefined);
    setServingError('');
  }, []);

  const handleAddServing = useCallback(() => {
    const unit = newUnit.trim();
    if (!unit) {
      setServingError('Enter serving unit');
      return;
    }
    const amount = newAmount ?? null;
    const weightG = newWeightG ?? null;
    const serving: ServingSize = {unit, amount, weight_g: weightG};
    onServingSizesChange([...servingSizes, serving]);
    resetServingForm();
    setIsAddingServing(false);
  }, [newUnit, newAmount, newWeightG, servingSizes, onServingSizesChange, resetServingForm]);

  const handleRemoveServing = useCallback(
    (index: number) => {
      onServingSizesChange(servingSizes.filter((_, i) => i !== index));
    },
    [servingSizes, onServingSizesChange],
  );

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <Fieldset>
        <Fieldset.Legend>Food details</Fieldset.Legend>
        <Description>Name the food and choose where it belongs</Description>
        <Fieldset.Group>
          <Controller
            control={control}
            name="name"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.name}
                isRequired
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={field.value}
              >
                <Label>Name (required)</Label>
                <Description>Use the name clients will recognize</Description>
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
                <Input />
              </TextField>
            )}
          />

          <Fieldset.Group>
            <Controller
              control={control}
              name="category"
              render={({field}) => (
                <TextField
                  fullWidth
                  isInvalid={!!errors.category}
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  value={field.value ?? ''}
                >
                  <Label>Category (optional)</Label>
                  <Description>Group similar foods, like protein or grains</Description>
                  {errors.category && <FieldError>{errors.category.message}</FieldError>}
                  <Input />
                </TextField>
              )}
            />
            <Controller
              control={control}
              name="source"
              render={({field}) => (
                <TextField
                  fullWidth
                  isInvalid={!!errors.source}
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  value={field.value ?? ''}
                >
                  <Label>Source (optional)</Label>
                  <Description>Add the brand, database, or source</Description>
                  {errors.source && <FieldError>{errors.source.message}</FieldError>}
                  <Input />
                </TextField>
              )}
            />
          </Fieldset.Group>

          <Controller
            control={control}
            name="notes"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.notes}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={field.value ?? ''}
              >
                <Label>Notes (optional)</Label>
                <Description>Add prep, shopping, or coaching notes</Description>
                {errors.notes && <FieldError>{errors.notes.message}</FieldError>}
                <TextArea rows={2} />
              </TextField>
            )}
          />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend>Nutrition for 100 g</Fieldset.Legend>
        <Description>Enter values for 100 g so plans calculate macros correctly</Description>
        <Fieldset.Group>
          {MACRO_FIELDS.map((fieldConfig) => (
            <MacroNumberField
              fieldConfig={fieldConfig}
              form={form}
              key={fieldConfig.name}
            />
          ))}
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend>Serving sizes</Fieldset.Legend>
        <Description>Add common portions like 1 scoop or 1 cup</Description>

        <Fieldset.Group>
          {servingSizes.length > 0 && (
            <Fieldset.Group>
              {servingSizes.map((serving, i) => (
                <Fieldset.Group key={i}>
                  <Typography>
                    {serving.amount ?? 1} {serving.unit}
                  </Typography>
                  <Fieldset.Actions>
                    {serving.weight_g != null && serving.weight_g > 0 && (
                      <Typography
                        color="muted"
                        type="body-sm"
                      >
                        {serving.weight_g}g
                      </Typography>
                    )}
                    <Button
                      aria-label={`Remove ${serving.unit}`}
                      onPress={() => handleRemoveServing(i)}
                      size="sm"
                      variant="ghost"
                    >
                      <X size={14} />
                    </Button>
                  </Fieldset.Actions>
                </Fieldset.Group>
              ))}
            </Fieldset.Group>
          )}

          {isAddingServing ? (
            <Fieldset>
              <Fieldset.Group>
                <TextField
                  fullWidth
                  isInvalid={!!servingError}
                  isRequired
                >
                  <Label>Unit (required)</Label>
                  <Description>Use a common portion, like scoop or cup</Description>
                  {servingError && <FieldError>{servingError}</FieldError>}
                  <Input
                    onChange={(e) => {
                      setNewUnit(e.target.value);
                      setServingError('');
                    }}
                    value={newUnit}
                  />
                </TextField>
                <NumberField
                  fullWidth
                  minValue={0}
                  onChange={(value) => setNewAmount(Number.isNaN(value) ? undefined : value)}
                  value={newAmount}
                >
                  <Label>Amount (optional)</Label>
                  <Description>Use 1 if it is a single portion</Description>
                  <NumberField.Group>
                    <NumberField.Input />
                  </NumberField.Group>
                </NumberField>
                <NumberField
                  fullWidth
                  minValue={0}
                  onChange={(value) => setNewWeightG(Number.isNaN(value) ? undefined : value)}
                  value={newWeightG}
                >
                  <Label>Weight, grams (optional)</Label>
                  <Description>Add this when the portion has a known weight</Description>
                  <NumberField.Group>
                    <NumberField.Input />
                  </NumberField.Group>
                </NumberField>
              </Fieldset.Group>
              <Fieldset.Actions>
                <Button
                  onPress={handleAddServing}
                  size="sm"
                >
                  <Plus size={14} />
                  Add
                </Button>
                <Button
                  onPress={() => {
                    setIsAddingServing(false);
                    resetServingForm();
                  }}
                  size="sm"
                  variant="ghost"
                >
                  Cancel
                </Button>
              </Fieldset.Actions>
            </Fieldset>
          ) : (
            <Button
              onPress={() => setIsAddingServing(true)}
              size="sm"
              variant="ghost"
            >
              <Plus size={14} />
              Add serving size
            </Button>
          )}
        </Fieldset.Group>
      </Fieldset>

      {errors.root && <ErrorMessage>{errors.root.message}</ErrorMessage>}

      <Fieldset.Actions>
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
      </Fieldset.Actions>
    </Form>
  );
}
