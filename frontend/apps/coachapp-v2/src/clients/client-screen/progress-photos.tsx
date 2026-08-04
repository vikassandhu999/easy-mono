import {Button} from '@heroui/react';
import {ImageIcon} from 'lucide-react';
import {useState} from 'react';
import {useParams} from 'react-router-dom';
import {BackButton} from '@/@components/back-button';
import {EmptyState} from '@/@components/empty-state';
import {ErrorState} from '@/@components/error-state';

import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import useAttachmentDownloadUrls from '@/@hooks/use-attachment-download-urls';
import {useGoBack} from '@/@hooks/use-go-back';
import {useListClientFormAssignmentsForCoachQuery} from '@/api/checkins';
import {submissionPhotoIds} from '@/checkins/lib/form-answers';
import {PhotoThumb} from '@/clients/components/photo-thumb';
import {SectionCard} from '@/clients/components/section-card';
import {formatDayMonth} from '@/clients/lib/client-detail-data';

/**
 * CD-PH — every progress photo the client has submitted, newest group first, with
 * a compare mode that takes exactly two.
 *
 * Photos are check-in attachments: they arrive on form submissions rather than
 * from a photos endpoint, so the grouping is by submission date. Attachment
 * records carry no URL — `useAttachmentDownloadUrls` resolves ids to signed URLs
 * and is the same resolver the message thread uses.
 */
export default function ProgressPhotos() {
  const {id = ''} = useParams<{id: string}>();
  const goBack = useGoBack(ROUTES.CLIENT_DETAIL.replace(':id', id));
  const {data, isError, isLoading, refetch} = useListClientFormAssignmentsForCoachQuery(id);
  const [selected, setSelected] = useState<string[]>([]);
  // The design's compare is a MODE, not a card at the top of the grid: pick two,
  // then open them side by side. Selecting two and being shown them immediately
  // means the design's "Compare 2 photos" button has nothing left to do.
  const [comparing, setComparing] = useState(false);

  const groups = (data?.data ?? [])
    .map((assignment) => ({
      date: assignment.latest_submission?.submitted_at?.slice(0, 10) ?? null,
      photos: assignment.latest_submission ? submissionPhotoIds(assignment.latest_submission) : [],
    }))
    .filter((group) => group.date && group.photos.length > 0)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  const {urls} = useAttachmentDownloadUrls(groups.flatMap((g) => g.photos));

  const toggle = (photoId: string) =>
    setSelected((current) =>
      current.includes(photoId) ? current.filter((x) => x !== photoId) : [...current, photoId].slice(-2),
    );

  const header = (
    <Page.Header size="content">
      <Page.TitleGroup className="flex items-center">
        <BackButton onPress={goBack} />
        <Page.Title>Progress photos</Page.Title>
      </Page.TitleGroup>
    </Page.Header>
  );

  if (isLoading) {
    return (
      <Page>
        {header}
        <Page.Content bare>
          <Page.Frame
            className="pt-4 pb-6"
            size="content"
          >
            <PageSkeleton />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }
  if (isError || !data) {
    return (
      <Page>
        {header}
        <Page.Content bare>
          <Page.Frame
            className="pt-4 pb-6"
            size="content"
          >
            <ErrorState
              message="Couldn't load progress photos."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const dateOf = (photoId: string) => groups.find((g) => g.photos.includes(photoId))?.date ?? null;
  const canCompare = selected.length === 2;

  if (comparing && canCompare) {
    return (
      <Page>
        <Page.Header size="content">
          <Page.TitleGroup className="flex items-center">
            <BackButton onPress={() => setComparing(false)} />
            <Page.Title>Compare</Page.Title>
          </Page.TitleGroup>
          <Page.Actions>
            <Button
              onPress={() => {
                setComparing(false);
                setSelected([]);
              }}
              variant="outline"
            >
              Done
            </Button>
          </Page.Actions>
        </Page.Header>
        <Page.Content bare>
          <Page.Frame
            className="pt-4 pb-6"
            size="content"
          >
            {/* Two photos, one hairline between them — the design's compare pane. */}
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card bg-border">
              {selected.map((photoId) => (
                <div
                  className="flex flex-col items-center gap-2 bg-surface-tertiary p-3"
                  key={photoId}
                >
                  <PhotoThumb
                    alt={`Progress photo${dateOf(photoId) ? ` from ${formatDayMonth(dateOf(photoId)!)}` : ''}`}
                    fill
                    src={urls[photoId]}
                  />
                  {dateOf(photoId) && (
                    <span className="type-eyebrow font-semibold text-muted">{formatDayMonth(dateOf(photoId)!)}</span>
                  )}
                </div>
              ))}
            </div>
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  return (
    <Page>
      {header}
      <Page.Content bare>
        <Page.Frame
          className="flex min-h-full flex-col gap-3 pt-4 pb-6"
          size="content"
        >
          {/* The design's hint is an accent-soft banner above the groups, not a page
              description — it is an instruction for the mode, not what the page is. */}
          {groups.length > 0 && (
            <div className="rounded-control bg-accent-soft px-4 py-3 type-eyebrow font-semibold">
              Select two photos to compare.
            </div>
          )}

          {/* No card per group: the design labels a date and lays its photos out on
              the page, so a month of check-ins reads as one column of photos rather
              than a stack of boxes. */}
          {groups.map((group) => (
            <div key={group.date}>
              <div className="mb-2 type-eyebrow font-bold text-muted">{formatDayMonth(group.date!)}</div>
              <div className="grid grid-cols-3 gap-3">
                {group.photos.map((photoId) => (
                  <div
                    className={
                      selected.includes(photoId) ? 'rounded-panel ring-3 ring-accent ring-offset-2' : undefined
                    }
                    key={photoId}
                  >
                    <PhotoThumb
                      alt={`Progress photo from ${formatDayMonth(group.date!)}`}
                      fill
                      onPress={() => toggle(photoId)}
                      src={urls[photoId]}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {groups.length === 0 && (
            <SectionCard>
              <EmptyState
                body="Photos submitted with a check-in appear here."
                icon={ImageIcon}
                title="No photos yet"
              />
            </SectionCard>
          )}

          {canCompare && (
            <div className="sticky bottom-0 mt-auto flex justify-center pt-3 pb-1">
              <Button
                onPress={() => setComparing(true)}
                variant="primary"
              >
                Compare 2 photos
              </Button>
            </div>
          )}
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
