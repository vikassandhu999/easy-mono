import {formatIsoDateOnly} from '@easy/utils';
import {Button, toast} from '@heroui/react';
import {Check, MessageCircle} from 'lucide-react';
import {useNavigate, useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useListCheckInReviewQueueQuery, useReviewFormSubmissionMutation} from '@/api/checkins';
import ReviewAnswers from '@/checkins/review-answers';

function clientName(item: {client: {first_name: null | string; last_name: null | string}}): string {
  return [item.client.first_name, item.client.last_name].filter(Boolean).join(' ') || 'Client';
}

export default function ReviewCheckin() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.CHECKINS_TO_REVIEW);
  const {data, isError, isLoading} = useListCheckInReviewQueueQuery();
  const [review, {isLoading: isReviewing}] = useReviewFormSubmissionMutation();
  const item = data?.data.find((submission) => submission.id === id);

  if (isLoading) {
    return (
      <Page>
        <Page.Header>
          <Page.TitleGroup>
            <Page.Title>Review check-in</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="py-4">
          <PageSkeleton />
        </Page.Content>
      </Page>
    );
  }

  if (isError || !item) {
    return (
      <Page>
        <Page.Header>
          <Page.TitleGroup>
            <div className="flex items-center gap-1">
              <BackButton onPress={goBack} />
              <Page.Title>Review check-in</Page.Title>
            </div>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="py-4">
          <ErrorState message="This check-in is no longer waiting for review." />
        </Page.Content>
      </Page>
    );
  }

  const name = clientName(item);
  const messagePath = ROUTES.CLIENT_MESSAGES.replace(':id', item.client.id);

  const markReviewed = async () => {
    try {
      await review({id: item.id}).unwrap();
      toast.success('Check-in reviewed');
      navigate(ROUTES.CHECKINS_TO_REVIEW, {replace: true});
    } catch {
      toast.danger("Check-in wasn't marked reviewed. Try again.");
    }
  };

  return (
    <Page>
      <Page.Header>
        <Page.TitleGroup>
          <div className="flex items-center gap-1">
            <BackButton onPress={goBack} />
            <Page.Title>{item.form_assignment.form_template.name}</Page.Title>
          </div>
          <Page.Description>
            {name} · submitted {formatIsoDateOnly(item.submitted_at)}
          </Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
        <div className="max-w-3xl rounded-3xl border border-border bg-surface p-5 sm:p-6">
          <ReviewAnswers item={item} />
          <div className="mt-6 flex flex-col gap-3 border-border border-t pt-5 sm:flex-row">
            <Button
              isPending={isReviewing}
              onPress={markReviewed}
            >
              <Check size={17} />
              {isReviewing ? 'Marking reviewed' : 'Mark reviewed'}
            </Button>
            <Button
              onPress={() =>
                navigate(`${messagePath}?${new URLSearchParams({embed_type: 'form_submission', embed_id: item.id})}`)
              }
              variant="secondary"
            >
              <MessageCircle size={17} />
              Reply in chat
            </Button>
          </div>
        </div>
      </Page.Content>
    </Page>
  );
}
