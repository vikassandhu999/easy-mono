import {useState} from 'react';
import {errorMessage} from '../api/client';
import {type ReviewSettingsWrite, useReviewSettings, useUpdateReviewSettings} from '../api/reviews';
import {Button} from '../ui/button';
import {Checkbox} from '../ui/checkbox';
import {FormError} from '../ui/form-error';
import {Surface} from '../ui/page';
import {ReviewFrequency} from '../ui/review-frequency';
export function ReviewDefault() {
  const query = useReviewSettings();
  return (
    <Surface className="space-y-4">
      <h2 className="section-title">Default Review frequency</h2>
      <p className="text-sm text-muted-foreground">
        The default applies to new clients. Choose whether to update existing clients too.
      </p>
      {query.data ? (
        <DefaultForm initial={query.data.data.default_review_frequency_days} />
      ) : query.isPending ? (
        <p role="status">Loading Review default…</p>
      ) : null}
      {query.isError && (
        <>
          <FormError message="Could not load Review default." />
          <Button
            variant="outline"
            onPress={() => {
              query.refetch();
            }}
          >
            Retry Review default
          </Button>
        </>
      )}
    </Surface>
  );
}
function DefaultForm({initial}: {initial: number}) {
  const [days, setDays] = useState<ReviewSettingsWrite['default_review_frequency_days']>(initial);
  const [apply, setApply] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const update = useUpdateReviewSettings();
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError('');
        setNotice('');
        try {
          await update.mutateAsync({default_review_frequency_days: days, apply_to_existing: apply});
          setApply(false);
          setNotice('Review default saved.');
        } catch (cause) {
          setError(errorMessage(cause, 'Could not save Review default. Your choice is still here.'));
        }
      }}
    >
      <ReviewFrequency
        value={days}
        onChange={setDays}
        isDisabled={update.isPending}
      />
      <Checkbox
        isSelected={apply}
        onChange={setApply}
      >
        Apply to existing clients too
      </Checkbox>
      <FormError message={error} />
      {notice && <p role="status">{notice}</p>}
      <Button
        type="submit"
        isPending={update.isPending}
      >
        Save Review default
      </Button>
    </form>
  );
}
