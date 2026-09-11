import {ArrowDown, ArrowUp, Plus, Trash2} from 'lucide-react';
import {Controller, useFieldArray, useFormContext, useWatch} from 'react-hook-form';
import type {FormTemplateCreate, FormTemplateQuestion} from '../api/forms';
import {Button} from '../ui/button';
import {Checkbox} from '../ui/checkbox';
import {FormField} from '../ui/form-field';
import {Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {Textarea} from '../ui/textarea';

export const answerTypes = [
  {type: 'text', label: 'Written answer'},
  {type: 'number', label: 'Number'},
  {type: 'boolean', label: 'Yes or no'},
  {type: 'date', label: 'Date'},
  {type: 'select', label: 'Single choice'},
  {type: 'multi_select', label: 'Multiple choice'},
  {type: 'rating', label: 'Rating (1–5)'},
  {type: 'weight', label: 'Weight'},
  {type: 'photo', label: 'Photo'},
  {type: 'service_type', label: 'Service type'},
] satisfies {type: FormTemplateQuestion['type']; label: string}[];

export function newQuestion(): FormTemplateQuestion {
  return {id: crypto.randomUUID(), type: 'text', label: '', required: false};
}

export function FormSection({
  index,
  count,
  onMove,
  onRemove,
  pending,
}: {
  index: number;
  count: number;
  onMove: (target: number) => void;
  onRemove: () => void;
  pending: boolean;
}) {
  const {control, getValues, setValue} = useFormContext<FormTemplateCreate>();
  const questions = useFieldArray({control, name: `sections.${index}.questions`, keyName: '_key'});
  const values = useWatch({control});
  const hasService = values.sections?.some((section) =>
    section?.questions?.some((question) => question?.type === 'service_type'),
  );
  return (
    <Surface className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title">Section {index + 1}</h2>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Move section ${index + 1} up`}
            isDisabled={pending || index === 0}
            onPress={() => onMove(index - 1)}
          >
            <ArrowUp aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Move section ${index + 1} down`}
            isDisabled={pending || index === count - 1}
            onPress={() => onMove(index + 1)}
          >
            <ArrowDown aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove section ${index + 1}`}
            isDisabled={pending || count === 1}
            onPress={onRemove}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>
      <FormField
        control={control}
        name={`sections.${index}.title`}
        label="Section title"
        isDisabled={pending}
        description="Optional. Group related questions under a heading."
      />
      <div className="space-y-5">
        {questions.fields.map((question, questionIndex) => {
          const name = `sections.${index}.questions.${questionIndex}` as const;
          const current = values.sections?.[index]?.questions?.[questionIndex];
          const type = current?.type ?? question.type;
          const inputId = `type-${question._key}`;
          return (
            <div
              key={question._key}
              className="question-card space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Question {questionIndex + 1}</p>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move question ${questionIndex + 1} up`}
                    isDisabled={pending || questionIndex === 0}
                    onPress={() => questions.move(questionIndex, questionIndex - 1)}
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move question ${questionIndex + 1} down`}
                    isDisabled={pending || questionIndex === questions.fields.length - 1}
                    onPress={() => questions.move(questionIndex, questionIndex + 1)}
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove question ${questionIndex + 1}`}
                    isDisabled={pending}
                    onPress={() => questions.remove(questionIndex)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <FormField
                control={control}
                name={`${name}.label`}
                label="Question"
                isRequired
                isDisabled={pending || type === 'service_type'}
                rules={{
                  validate: (value) => (typeof value === 'string' && Boolean(value.trim())) || 'Enter the question.',
                }}
              />
              <div className="grid gap-2">
                <label
                  id={`${inputId}-label`}
                  htmlFor={inputId}
                  className="text-sm font-medium"
                >
                  Answer type
                </label>
                <SelectField
                  id={inputId}
                  value={type}
                  isDisabled={pending || type === 'service_type'}
                  onChange={(value) => {
                    const selected = answerTypes.find((answer) => answer.type === value);
                    if (!selected) {
                      return;
                    }
                    const previous = getValues(name);
                    const next = {
                      id: previous.id,
                      label: selected.type === 'service_type' ? 'Service type' : previous.label,
                      required: selected.type === 'service_type' || (previous.required ?? false),
                      type: selected.type,
                    };
                    setValue(
                      name,
                      selected.type === 'select' || selected.type === 'multi_select'
                        ? {
                            ...next,
                            type: selected.type,
                            options:
                              'options' in previous && previous.options?.length
                                ? previous.options
                                : ['Option 1', 'Option 2'],
                          }
                        : next,
                      {shouldDirty: true, shouldValidate: true},
                    );
                  }}
                >
                  {answerTypes
                    .filter(
                      (answer) =>
                        answer.type !== 'service_type' || values.purpose === 'intake' || type === 'service_type',
                    )
                    .map((answer) => (
                      <SelectItem
                        key={answer.type}
                        id={answer.type}
                        isDisabled={answer.type === 'service_type' && Boolean(hasService) && type !== 'service_type'}
                      >
                        {answer.label}
                      </SelectItem>
                    ))}
                </SelectField>
              </div>
              {(type === 'select' || type === 'multi_select') && (
                <Controller
                  control={control}
                  name={`${name}.options`}
                  rules={{
                    validate: (options) =>
                      Boolean(options?.length && options.every((option) => option.trim())) ||
                      'Enter a choice on each line.',
                  }}
                  render={({field, fieldState}) => (
                    <div className="grid gap-2">
                      <label
                        htmlFor={`choices-${question._key}`}
                        className="text-sm font-medium"
                      >
                        Choices
                      </label>
                      <Textarea
                        id={`choices-${question._key}`}
                        ref={field.ref}
                        value={(field.value ?? []).join('\n')}
                        onChange={(event) => field.onChange(event.target.value.split('\n'))}
                        onBlur={field.onBlur}
                        disabled={pending}
                        aria-invalid={Boolean(fieldState.error)}
                        aria-describedby={`choices-help-${question._key}${fieldState.error ? ` choices-error-${question._key}` : ''}`}
                      />
                      <p
                        id={`choices-help-${question._key}`}
                        className="text-sm text-muted-foreground"
                      >
                        One choice per line.
                      </p>
                      {fieldState.error && (
                        <p
                          id={`choices-error-${question._key}`}
                          className="text-sm text-destructive"
                        >
                          {fieldState.error.message}
                        </p>
                      )}
                    </div>
                  )}
                />
              )}
              {type === 'service_type' && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The client chooses Training, Nutrition, or both. Their answer sets the services they need.
                </p>
              )}
              <Controller
                control={control}
                name={`${name}.required`}
                render={({field}) => (
                  <Checkbox
                    isSelected={field.value ?? false}
                    onChange={field.onChange}
                    isDisabled={pending || type === 'service_type'}
                  >
                    Required answer
                  </Checkbox>
                )}
              />
            </div>
          );
        })}
      </div>
      {questions.fields.length === 0 && (
        <p className="text-sm text-muted-foreground">Add a question to this section.</p>
      )}
      <Button
        variant="outline"
        isDisabled={pending}
        onPress={() =>
          questions.append(newQuestion(), {focusName: `sections.${index}.questions.${questions.fields.length}.label`})
        }
      >
        <Plus aria-hidden="true" />
        Add question
      </Button>
    </Surface>
  );
}
