import {useState} from 'react';
import {generatePath, Link, useParams} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {type Review, useReviews, useUpdateReview} from '../api/reviews';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {FormError} from '../ui/form-error';
import {InfiniteList} from '../ui/infinite-list';
import {Page, PageHeader, Surface} from '../ui/page';
import {assessmentLabels} from './review';
import {ReviewForm} from './review-form';
export function ReviewHistory() {
  const {clientId = ''} = useParams();
  const query = useReviews(clientId);
  return (
    <Page className="client-page">
      <PageHeader
        title="Review history"
        back={{to: generatePath(routes.client, {id: clientId}), label: 'Back to client'}}
        actions={
          <Link
            to={generatePath(routes.newReview, {clientId})}
            className={buttonVariants()}
          >
            Review client
          </Link>
        }
      />
      <InfiniteList
        query={query}
        label="Reviews"
        singular="Review"
        empty={<Surface>No Reviews saved yet.</Surface>}
      >
        {(review) => <HistoryItem review={review} />}
      </InfiniteList>
    </Page>
  );
}
function HistoryItem({review}: {review: Review}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const update = useUpdateReview(review.client_id, review.id);
  return (
    <article
      id={review.id}
      className="space-y-4 p-5"
    >
      <div>
        <h2 className="editor-item-title">
          {new Date(review.reviewed_at).toLocaleString()} · {review.coach_name}
        </h2>
        <p>{assessmentLabels[review.assessment]}</p>
      </div>
      <aside className="rounded-xl bg-muted p-4">
        <h3 className="font-medium">Private note</h3>
        <p className="mt-2 whitespace-pre-wrap">{review.private_note || 'No private note.'}</p>
      </aside>
      {review.reply && (
        <div>
          <h3 className="font-medium">Reply to client {review.reply.edited_at ? '· edited' : ''}</h3>
          <p className="whitespace-pre-wrap">{review.reply.body}</p>
        </div>
      )}
      {editing ? (
        <>
          <ReviewForm
            initial={review}
            label="Save changes"
            save={async (values) => {
              await update.mutateAsync(values);
              setEditing(false);
            }}
          />
          <Button
            variant="ghost"
            onPress={() => setEditing(false)}
          >
            Cancel editing
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          onPress={() => setEditing(true)}
        >
          Edit Review
        </Button>
      )}
      {review.reply && (
        <Button
          variant="ghost"
          isPending={update.isPending}
          onPress={async () => {
            setError('');
            try {
              await update.mutateAsync({reply: null});
            } catch (cause) {
              setError(errorMessage(cause, 'Could not delete reply. Try again.'));
            }
          }}
        >
          Delete reply
        </Button>
      )}
      <FormError message={error} />
    </article>
  );
}
