import {
  Button,
  Description,
  FieldError,
  Fieldset,
  Input,
  Label,
  ListBox,
  Select,
  Switch,
  TextField,
  Typography,
} from '@heroui/react';
import {Plus, X} from 'lucide-react';
import {useState} from 'react';
import {Controller, type UseFormReturn, useFieldArray} from 'react-hook-form';

import type {EditorFormValues} from '@/storefront/components/editor-schema';

const QUESTION_TYPES = [
  {label: 'Text', value: 'text'},
  {label: 'Number', value: 'number'},
  {label: 'Select', value: 'select'},
] as const;

export default function IntakeQuestionsEditor({form}: {form: UseFormReturn<EditorFormValues>}) {
  const {
    control,
    formState: {errors},
    watch,
  } = form;
  const {append, fields, remove} = useFieldArray({control, name: 'intake_questions'});

  return (
    <Fieldset>
      <Fieldset.Legend>Intake questions</Fieldset.Legend>
      <Description>Default fields for name, email, phone, and Instagram are always shown</Description>

      <Fieldset.Group>
        {fields.map((field, index) => (
          <IntakeQuestionRow
            control={control}
            errors={errors}
            index={index}
            key={field.id}
            onRemove={() => remove(index)}
            watch={watch}
          />
        ))}

        <Button
          className="self-start"
          onPress={() => append({label: '', options: [], required: false, type: 'text'})}
          size="sm"
          variant="ghost"
        >
          <Plus size={16} />
          Add question
        </Button>
      </Fieldset.Group>
    </Fieldset>
  );
}

function IntakeQuestionRow({
  control,
  errors,
  index,
  onRemove,
  watch,
}: {
  control: UseFormReturn<EditorFormValues>['control'];
  errors: UseFormReturn<EditorFormValues>['formState']['errors'];
  index: number;
  onRemove: () => void;
  watch: UseFormReturn<EditorFormValues>['watch'];
}) {
  const questionType = watch(`intake_questions.${index}.type`);
  const questionErrors = errors.intake_questions?.[index];

  return (
    <Fieldset>
      <Fieldset.Group>
        <div className="flex items-start gap-2">
          <div className="flex flex-1 flex-col gap-3">
            <Controller
              control={control}
              name={`intake_questions.${index}.label`}
              render={({field}) => (
                <TextField
                  fullWidth
                  isInvalid={!!questionErrors?.label}
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  value={field.value}
                >
                  <Label>Question text</Label>
                  {questionErrors?.label && <FieldError>{questionErrors.label.message}</FieldError>}
                  <Input />
                </TextField>
              )}
            />

            <Fieldset.Actions>
              <Controller
                control={control}
                name={`intake_questions.${index}.type`}
                render={({field}) => (
                  <Select
                    className="w-full sm:w-48"
                    onSelectionChange={(key) => field.onChange(key)}
                    selectedKey={field.value || null}
                  >
                    <Label>Type</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {QUESTION_TYPES.map((questionType) => (
                          <ListBox.Item
                            id={questionType.value}
                            key={questionType.value}
                            textValue={questionType.label}
                          >
                            {questionType.label}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                )}
              />
              <Controller
                control={control}
                name={`intake_questions.${index}.required`}
                render={({field}) => (
                  <Switch
                    isSelected={field.value ?? false}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  >
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    <Switch.Content>
                      <Typography type="body-xs">Required</Typography>
                    </Switch.Content>
                  </Switch>
                )}
              />
            </Fieldset.Actions>
          </div>

          <Button
            aria-label={`Remove question ${index + 1}`}
            isIconOnly
            onPress={onRemove}
            size="sm"
            variant="ghost"
          >
            <X size={14} />
          </Button>
        </div>

        {questionType === 'select' ? (
          <SelectOptionsEditor
            control={control}
            index={index}
            watch={watch}
          />
        ) : null}
      </Fieldset.Group>
    </Fieldset>
  );
}

function SelectOptionsEditor({
  control,
  index,
  watch,
}: {
  control: UseFormReturn<EditorFormValues>['control'];
  index: number;
  watch: UseFormReturn<EditorFormValues>['watch'];
}) {
  const options = watch(`intake_questions.${index}.options`) ?? [];
  const {append, remove} = useFieldArray({
    control,
    // @ts-expect-error — nested field array path typing limitation with string arrays
    name: `intake_questions.${index}.options`,
  });

  return (
    <Fieldset>
      <Fieldset.Legend>Options</Fieldset.Legend>
      <Fieldset.Group>
        <div className="flex flex-wrap gap-2">
          {options.map((option, optionIndex) => (
            <span
              className="inline-flex min-h-11 items-center gap-1 rounded-full bg-default-100 px-3 text-xs"
              key={option || optionIndex}
            >
              {option || `Option ${optionIndex + 1}`}
              <Button
                aria-label={`Remove option ${optionIndex + 1}`}
                className="ml-1 flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-default-200 active:bg-default-300"
                isIconOnly
                onPress={() => remove(optionIndex)}
                size="sm"
                variant="ghost"
              >
                <X size={12} />
              </Button>
            </span>
          ))}
        </div>
        {/* @ts-expect-error — useFieldArray append types don't support nested string arrays well */}
        <OptionAdder onAdd={(value) => append(value)} />
      </Fieldset.Group>
    </Fieldset>
  );
}

function OptionAdder({onAdd}: {onAdd: (value: string) => void}) {
  const [value, setValue] = useState('');

  const handleAdd = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onAdd(trimmed);
      setValue('');
    }
  };

  return (
    <div className="flex gap-2">
      <TextField
        className="flex-1"
        onChange={setValue}
        value={value}
      >
        <Label>Add option</Label>
        <Input
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleAdd();
            }
          }}
        />
      </TextField>
      <Button
        isDisabled={!value.trim()}
        onPress={handleAdd}
        size="sm"
        variant="ghost"
      >
        <Plus size={14} />
      </Button>
    </div>
  );
}
