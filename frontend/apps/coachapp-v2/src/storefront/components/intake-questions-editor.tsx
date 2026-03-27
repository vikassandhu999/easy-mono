import {Button, Description, Input, Label, ListBox, Select, Switch} from '@heroui/react';
import {Plus, X} from 'lucide-react';
import {useState} from 'react';
import {Controller, useFieldArray, type UseFormReturn} from 'react-hook-form';

import type {EditorFormValues} from '@/storefront/components/editor-schema';

const QUESTION_TYPES = [
  {label: 'Text', value: 'text'},
  {label: 'Number', value: 'number'},
  {label: 'Select (dropdown)', value: 'select'},
] as const;

export default function IntakeQuestionsEditor({form}: {form: UseFormReturn<EditorFormValues>}) {
  const {
    control,
    formState: {errors},
    register,
    watch,
  } = form;
  const {append, fields, remove} = useFieldArray({control, name: 'intake_questions'});

  return (
    <div className="flex flex-col gap-3">
      <Description>
        Default fields (Name, Email, Phone, Instagram) are always shown. Add custom questions below.
      </Description>

      {fields.map((field, index) => (
        <IntakeQuestionRow
          control={control}
          errors={errors}
          index={index}
          key={field.id}
          onRemove={() => remove(index)}
          register={register}
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
    </div>
  );
}

// ── Intake Question Row ──────────────────────────────────────

function IntakeQuestionRow({
  control,
  errors,
  index,
  onRemove,
  register,
  watch,
}: {
  control: UseFormReturn<EditorFormValues>['control'];
  errors: UseFormReturn<EditorFormValues>['formState']['errors'];
  index: number;
  onRemove: () => void;
  register: UseFormReturn<EditorFormValues>['register'];
  watch: UseFormReturn<EditorFormValues>['watch'];
}) {
  const questionType = watch(`intake_questions.${index}.type`);
  const questionErrors = errors.intake_questions?.[index];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-divider p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Input
              placeholder="Question text"
              {...register(`intake_questions.${index}.label`)}
            />
            {questionErrors?.label ? <p className="text-xs text-danger">{questionErrors.label.message}</p> : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Controller
              control={control}
              name={`intake_questions.${index}.type`}
              render={({field}) => (
                <Select
                  className="w-full sm:w-48"
                  onSelectionChange={(key) => field.onChange(key)}
                  placeholder="Type"
                  selectedKey={field.value || null}
                >
                  <Label>Type</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {QUESTION_TYPES.map((qt) => (
                        <ListBox.Item
                          id={qt.value}
                          key={qt.value}
                          textValue={qt.label}
                        >
                          {qt.label}
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
                  onChange={field.onChange}
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <Switch.Content>
                    <span className="text-xs">Required</span>
                  </Switch.Content>
                </Switch>
              )}
            />
          </div>
        </div>

        <Button
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
    </div>
  );
}

// ── Select Options Editor ────────────────────────────────────

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
    <div className="flex flex-col gap-2 pl-2">
      <Label className="text-xs text-foreground-500">Options</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option, optionIndex) => (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-default-100 px-3 py-1 text-xs"
            key={option || optionIndex}
          >
            {option || `Option ${optionIndex + 1}`}
            <button
              className="ml-1 flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-default-200 active:bg-default-300"
              onClick={() => remove(optionIndex)}
              type="button"
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      {/* @ts-expect-error — useFieldArray append types don't support nested string arrays well */}
      <OptionAdder onAdd={(value) => append(value)} />
    </div>
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
      <Input
        className="flex-1"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
          }
        }}
        placeholder="Add option..."
        value={value}
      />
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
