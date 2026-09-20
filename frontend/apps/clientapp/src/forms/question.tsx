import {useId} from 'react';
import {type Control, Controller} from 'react-hook-form';
import type {FormTemplateQuestion, FormWeightUnit} from '../api/forms';
import {Checkbox} from '../ui/checkbox';
import {Input} from '../ui/input';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {Textarea} from '../ui/textarea';
import {type FormValues, hasAnswer, questionShape} from './answers';
import {Photos} from './photos';

export function Question({
  question,
  index,
  control,
  disabled,
  assignmentId,
  onPhotoWork,
  weightUnit,
}: {
  question: FormTemplateQuestion;
  index: number;
  control: Control<FormValues>;
  disabled: boolean;
  assignmentId: string;
  onPhotoWork: (resource: string, pending: boolean) => void;
  weightUnit: FormWeightUnit;
}) {
  const id = useId();
  const required = question.required || question.type === 'service_type';
  const options = 'options' in question ? (question.options ?? []) : [];
  return (
    <Controller
      control={control}
      name={`answers.${index}`}
      rules={{validate: (value) => !required || hasAnswer(value) || 'Please answer this question.'}}
      render={({field, fieldState}) => {
        const error = fieldState.error?.message;
        const grouped = ['photo', 'rating', 'boolean', 'multi_select', 'service_type'].includes(question.type);
        const label = (
          <span>
            {question.label}
            {question.type === 'weight' && ` (${weightUnit})`}
            {required && <span className="ml-1 text-sm text-muted-foreground"> (required)</span>}
          </span>
        );
        const common = {
          id,
          'aria-labelledby': `${id}-label`,
          'aria-describedby': error ? `${id}-error` : undefined,
          'aria-invalid': Boolean(error),
          disabled,
          onBlur: field.onBlur,
          ref: field.ref,
        };
        let input;
        if (question.type === 'photo') {
          input = (
            <Photos
              resource={`form.${assignmentId}.${question.id}`}
              shape={questionShape(question)}
              value={Array.isArray(field.value) ? field.value : []}
              onChange={field.onChange}
              disabled={disabled}
              label={question.label}
              onWork={onPhotoWork}
            />
          );
        } else if (question.type === 'select') {
          input = (
            <SelectField
              id={id}
              aria-label={question.label}
              value={typeof field.value === 'string' ? field.value : ''}
              onChange={field.onChange}
              isDisabled={disabled}
              triggerRef={field.ref}
              isInvalid={Boolean(error)}
            >
              <SelectItem id="">Choose an answer</SelectItem>
              {options.map((option) => (
                <SelectItem
                  key={option}
                  id={option}
                >
                  {option}
                </SelectItem>
              ))}
            </SelectField>
          );
        } else if (question.type === 'multi_select' || question.type === 'service_type') {
          const selected = Array.isArray(field.value)
            ? field.value
            : typeof field.value === 'object' && 'services' in field.value
              ? field.value.services
              : [];
          const choices = question.type === 'service_type' ? ['training', 'nutrition'] : options;
          input = (
            <div className="space-y-2">
              {choices.map((option) => (
                <Checkbox
                  key={option}
                  className="min-h-12 rounded-2xl bg-white px-4 py-3 text-base data-selected:bg-[var(--training)] data-selected:text-primary"
                  isDisabled={disabled}
                  isSelected={selected.includes(option)}
                  onChange={(checked) => {
                    const next = choices.filter((value) => (value === option ? checked : selected.includes(value)));
                    field.onChange(question.type === 'service_type' ? {services: next} : next);
                  }}
                >
                  {question.type === 'service_type' ? (option === 'training' ? 'Training' : 'Nutrition') : option}
                </Checkbox>
              ))}
            </div>
          );
        } else if (question.type === 'boolean' || question.type === 'rating') {
          const choices = question.type === 'boolean' ? ['Yes', 'No'] : ['1', '2', '3', '4', '5'];
          input = (
            <div className="flex flex-wrap gap-2">
              {choices.map((choice) => {
                const value = question.type === 'boolean' ? choice === 'Yes' : Number(choice);
                return (
                  <label
                    key={choice}
                    className="relative flex min-h-12 min-w-12 flex-1 cursor-pointer items-center justify-center rounded-2xl bg-white px-3 font-semibold has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary has-disabled:opacity-50"
                  >
                    <input
                      type="radio"
                      className="absolute inset-0 size-full cursor-pointer opacity-0"
                      name={field.name}
                      value={choice}
                      checked={field.value === value}
                      disabled={disabled}
                      onChange={() => field.onChange(value)}
                      ref={field.ref}
                    />
                    {choice}
                  </label>
                );
              })}
            </div>
          );
        } else if (question.type === 'text') {
          input = (
            <Textarea
              {...common}
              value={typeof field.value === 'string' ? field.value : ''}
              onChange={(event) => field.onChange(event.target.value)}
            />
          );
        } else {
          input = (
            <Input
              {...common}
              type={question.type === 'date' ? 'date' : 'number'}
              inputMode={question.type === 'date' ? undefined : 'decimal'}
              step="any"
              value={typeof field.value === 'string' || typeof field.value === 'number' ? field.value : ''}
              onChange={(event) => field.onChange(event.target.value)}
            />
          );
        }
        return (
          <div
            className="space-y-3 rounded-xl focus:outline-2 focus:outline-offset-4 focus:outline-primary"
            ref={grouped ? field.ref : undefined}
            tabIndex={grouped ? -1 : undefined}
            {...(grouped
              ? {
                  role: question.type === 'boolean' || question.type === 'rating' ? 'radiogroup' : 'group',
                  'aria-labelledby': `${id}-label`,
                  'aria-describedby': error ? `${id}-error` : undefined,
                  'aria-invalid': Boolean(error),
                }
              : {})}
          >
            <label
              id={`${id}-label`}
              htmlFor={id}
              className="block font-semibold leading-relaxed"
            >
              <span
                aria-hidden="true"
                className="mb-2 grid size-7 place-items-center rounded-full bg-[var(--training)] text-xs font-bold text-primary"
              >
                {index + 1}
              </span>
              {label}
            </label>
            {input}
            {error && (
              <p
                id={`${id}-error`}
                role="alert"
                className="text-sm text-destructive"
              >
                {error}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}
