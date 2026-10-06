import {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {ApiError, errorMessage} from '../api/client';
import type {Review} from '../api/reviews';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {assessmentLabels} from './review';
export type ReviewFields = {assessment: Review['assessment']; private_note: string; reply: string};
export function ReviewForm({
  initial,
  save,
  label = 'Save Review',
  isDisabled = false,
}: {
  initial?: Pick<Review, 'assessment' | 'private_note' | 'reply'> | null;
  save: (values: ReviewFields) => Promise<unknown>;
  label?: string;
  isDisabled?: boolean;
}) {
  const form = useForm<ReviewFields>({
    defaultValues: {
      assessment: initial?.assessment ?? 'on_track',
      private_note: initial?.private_note ?? '',
      reply: initial?.reply?.body ?? '',
    },
  });
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState<ReviewFields | null>(null);
  const disabled = isDisabled || form.formState.isSubmitting || attempt !== null;
  const submit = form.handleSubmit(async (values) => {
    form.clearErrors();
    setNotice('');
    try {
      await save(attempt ?? values);
      setAttempt(null);
      form.reset(values);
      setNotice('Review saved.');
    } catch (cause) {
      if (label === 'Save Review' && (!(cause instanceof ApiError) || cause.status >= 500)) {
        setAttempt(attempt ?? values);
      }
      form.setError('root', {
        message: errorMessage(cause, 'Could not save the Review. Your text is still here. Retry with the same values.'),
      });
    }
  });
  return (
    <form
      onSubmit={submit}
      className="space-y-5"
    >
      <Controller
        control={form.control}
        name="assessment"
        render={({field}) => (
          <div className="space-y-2">
            <p className="text-sm font-medium">Assessment</p>
            <SelectField
              aria-label="Assessment"
              value={field.value}
              onChange={field.onChange}
              isDisabled={disabled}
            >
              {Object.entries(assessmentLabels).map(([key, label]) => (
                <SelectItem
                  key={key}
                  id={key}
                >
                  {label}
                </SelectItem>
              ))}
            </SelectField>
          </div>
        )}
      />
      <FormField
        control={form.control}
        name="private_note"
        label="Private note"
        description="Only coaches can read this note and the assessment."
        multiline
        maxLength={10000}
        isDisabled={disabled}
      />
      <FormField
        control={form.control}
        name="reply"
        label="Reply to client"
        description="Optional. The reply appears in the client's chat."
        multiline
        maxLength={4000}
        isDisabled={disabled}
      />
      <FormError message={form.formState.errors.root?.message} />
      {notice && <p role="status">{notice}</p>}
      <Button
        type="submit"
        isPending={form.formState.isSubmitting}
        isDisabled={isDisabled}
      >
        {attempt ? 'Check Review save' : label}
      </Button>
    </form>
  );
}
