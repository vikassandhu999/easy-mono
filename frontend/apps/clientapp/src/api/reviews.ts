import {useInfiniteQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {conversationKeys} from './keys';
import {cursorPagination} from './pagination';

export function useReviewReplies(reviewId: string | null) {
  return useInfiniteQuery({
    queryKey: conversationKeys.reviewReplies(reviewId),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/client/review-replies', {
          params: {query: {cursor: pageParam, limit: 20, ...(reviewId ? {review_id: reviewId} : {})}},
          signal,
        }),
      ),
    ...cursorPagination,
    staleTime: 0,
  });
}
