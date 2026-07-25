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
import {useListClientFormAssignmentsForCoachQuery} from '@/api/generated';
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
  const {data, isError, isLoading, refetch} = useListClientFormAssignmentsForCoachQuery({clientId: id});
  const [selected, setSelected] = useState<string[]>([]);

  const groups = (data?.data ?? [])
    .map((assignment) => ({
      date: assignment.latest_submission?.submitted_at?.slice(0, 10) ?? null,
      photos: (assignment.latest_submission?.attachments ?? []).filter((a) => a.content_type.startsWith('image/')),
    }))
    .filter((group) => group.date && group.photos.length > 0)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  const {urls} = useAttachmentDownloadUrls(groups.flatMap((g) => g.photos.map((p) => p.id)));

  const toggle = (photoId: string) =>
    setSelected((current) =>
      current.includes(photoId) ? current.filter((x) => x !== photoId) : [...current, photoId].slice(-2),
    );

  const header = (
    <Page.Header size="content">
      <Page.TitleGroup className="flex items-center gap-1">
        <BackButton onPress={goBack} />
        <div className="min-w-0">
          <Page.Title>Progress photos</Page.Title>
          <Page.Description>Select two photos to compare.</Page.Description>
        </div>
      </Page.TitleGroup>
    </Page.Header>
  );

  if (isLoading) {
    return (
      <Page>
        {header}
        <Page.Content bare>
          <Page.Frame className="pt-4 pb-6">
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
          <Page.Frame className="pt-4 pb-6">
            <ErrorState
              message="Couldn't load progress photos."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const comparing = selected.length === 2;

  return (
    <Page>
      {header}
      <Page.Content bare>
        <Page.Frame className="flex flex-col gap-4 pt-4 pb-6">
          {comparing && (
            <SectionCard title="Comparing">
              <div className="grid grid-cols-2 gap-3 px-4 pb-4">
                {selected.map((photoId) => (
                  <PhotoThumb
                    alt="Progress photo"
                    fill
                    key={photoId}
                    src={urls[photoId]}
                  />
                ))}
              </div>
              <div className="flex justify-end px-4 pb-4">
                <Button
                  onPress={() => setSelected([])}
                  size="sm"
                  variant="outline"
                >
                  Clear selection
                </Button>
              </div>
            </SectionCard>
          )}

          {groups.map((group) => (
            <SectionCard
              key={group.date}
              title={formatDayMonth(group.date!)}
            >
              <div className="grid grid-cols-3 gap-3 px-4 pb-4 sm:grid-cols-4">
                {group.photos.map((photo) => (
                  <div
                    className={
                      selected.includes(photo.id) ? 'rounded-panel ring-2 ring-accent ring-offset-2' : undefined
                    }
                    key={photo.id}
                  >
                    <PhotoThumb
                      alt={`Progress photo from ${formatDayMonth(group.date!)}`}
                      fill
                      onPress={() => toggle(photo.id)}
                      src={urls[photo.id]}
                    />
                  </div>
                ))}
              </div>
            </SectionCard>
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
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
