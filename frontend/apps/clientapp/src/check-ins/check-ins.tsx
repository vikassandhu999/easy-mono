import {Link, useSearchParams} from 'react-router-dom';
import {useConversation} from '../api/conversation';
import {useConversationUpdates} from '../api/conversation-updates';
import {useReviewReplies} from '../api/reviews';
import {routes} from '../routes';
import {CachedRead} from '../ui/cached-read';
import {Focus} from '../ui/focus';
import {InfiniteList} from '../ui/infinite-list';
import {Page} from '../ui/page';

export function CheckIns() {
  const [params] = useSearchParams();
  const reviewId = params.get('review');
  const query = useReviewReplies(reviewId);
  const conversation = useConversation();
  useConversationUpdates(conversation.data?.data.id);
  return (
    <Page
      title="Check-ins"
      description="Replies from your coach."
      back={reviewId ? routes.messages : routes.home}
    >
      <Focus showEmpty />
      {reviewId && (
        <Link
          to={routes.checkIns}
          className="inline-flex min-h-11 items-center font-semibold text-primary underline"
        >
          All Review replies
        </Link>
      )}
      {query.data && (
        <CachedRead
          updatedAt={query.dataUpdatedAt}
          failed={query.isError && !query.isFetchNextPageError}
          refreshing={query.isFetching}
          refresh={() => query.refetch()}
        />
      )}
      <InfiniteList
        query={query}
        label="Review replies"
        singular="Review reply"
        empty={
          <p className="py-6 text-muted-foreground">
            {reviewId ? 'This Review reply is no longer available.' : 'Your coach has not shared a Review reply yet.'}
          </p>
        }
      >
        {(message) => (
          <article
            className="space-y-3 py-5"
            aria-label="Review reply"
          >
            <h2 className="font-bold">{message.sender_name || 'Coach'}</h2>
            <p className="text-sm text-muted-foreground">
              <time dateTime={message.embed?.snapshot.recorded_at || message.inserted_at}>
                {new Date(message.embed?.snapshot.recorded_at || message.inserted_at).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </time>
              {message.edited_at && ' · edited'}
            </p>
            <p className="whitespace-pre-wrap wrap-break-word">{message.body}</p>
            <Link
              to={routes.messages}
              className="inline-flex min-h-11 items-center font-semibold text-primary underline"
            >
              Open conversation
            </Link>
          </article>
        )}
      </InfiniteList>
    </Page>
  );
}
