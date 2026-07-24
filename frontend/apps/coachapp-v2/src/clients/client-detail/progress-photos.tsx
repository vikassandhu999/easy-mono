/**
 * PH — progress photos (spec §6.6; design data-ref CD-PH-*). Every photo answer
 * across the client's check-ins, grouped by submission date, plus a compare
 * mode that puts two side by side. Style fidelity: manifests/CD-PH.json.
 */
import {AlertDialog, Button} from '@heroui/react';
import {Check} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useParams} from 'react-router-dom';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import useAttachmentDownloadUrls from '@/@hooks/use-attachment-download-urls';
import {useGoBack} from '@/@hooks/use-go-back';
import {useListClientFormAssignmentsForCoachQuery} from '@/api/checkins';
import {formatShortDate, snapshotQuestions} from '@/clients/client-detail/data';
import {ACCENT_BUTTON, OUTLINE_BUTTON, PhotoThumb, SubHeader} from '@/clients/client-detail/ui';

type PhotoGroup = {date: string; ids: string[]};

export default function ProgressPhotos() {
  const {id} = useParams<{id: string}>();
  const goBack = useGoBack(`${ROUTES.CLIENT_DETAIL.replace(':id', id!)}?tab=check-ins`);
  const {data, isError, isLoading, refetch} = useListClientFormAssignmentsForCoachQuery({clientId: id!});
  const [isComparing, setComparing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [isCompareOpen, setCompareOpen] = useState(false);

  const groups: PhotoGroup[] = useMemo(() => {
    const out: PhotoGroup[] = [];
    for (const assignment of data?.data ?? []) {
      const submission = assignment.latest_submission;
      if (!submission) {
        continue;
      }
      const ids = snapshotQuestions(submission.question_snapshot)
        .filter((question) => question.type === 'photo' && question.id)
        .flatMap((question) =>
          Array.isArray(submission.answers[question.id!]) ? (submission.answers[question.id!] as string[]) : [],
        );
      if (ids.length > 0) {
        out.push({date: submission.submitted_at, ids});
      }
    }
    return out.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [data]);

  const allIds = useMemo(() => groups.flatMap((group) => group.ids), [groups]);
  const {urls} = useAttachmentDownloadUrls(allIds);
  const dateOf = (photoId: string) => groups.find((group) => group.ids.includes(photoId))?.date;

  const toggle = (photoId: string) => {
    if (!isComparing) {
      return;
    }
    setSelected((current) => {
      if (current.includes(photoId)) {
        return current.filter((existing) => existing !== photoId);
      }
      // a third pick swaps out the older selection (spec §6.6)
      return [...current, photoId].slice(-2);
    });
  };

  if (isLoading) {
    return (
      <Page className="bg-background">
        <Page.Content bare>
          <Page.Frame className="pt-4 pb-6">
            <PageSkeleton />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }
  if (isError || allIds.length === 0) {
    return (
      <Page className="bg-background">
        <Page.Content bare>
          <Page.Frame className="pt-4 pb-6">
            <ErrorState
              message={isError ? "Couldn't load photos." : 'No progress photos yet. They arrive with check-ins.'}
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  return (
    <Page className="bg-background text-foreground [line-height:normal]">
      <Page.Content
        bare
        className="flex flex-col p-0"
      >
        <SubHeader
          onBack={goBack}
          right={
            <Button
              className={`${OUTLINE_BUTTON} h-8 px-3.75 sm:h-9`}
              data-testid="ph-compare-btn"
              onPress={() => {
                setComparing((current) => !current);
                setSelected([]);
              }}
            >
              {isComparing ? 'Done' : 'Compare'}
            </Button>
          }
          subtitle={`${allIds.length} ${allIds.length === 1 ? 'photo' : 'photos'}`}
          title="Progress photos"
        />

        <div className="p-3.5 sm:px-7.5 sm:pt-6 sm:pb-7.5">
          <div
            className="flex flex-col gap-2.75 sm:max-w-195 sm:gap-3"
            data-testid="ph-root"
          >
            {isComparing ? (
              <div
                className="rounded-control bg-accent-soft px-3.25 py-2.5 text-eyebrow font-semibold sm:px-3.5 sm:py-2.75"
                data-testid="ph-banner"
              >
                Select two photos to compare.
              </div>
            ) : null}

            {groups.map((group, groupIndex) => (
              <div
                className="contents"
                key={group.date}
              >
                <div
                  className={`text-eyebrow font-bold text-muted ${groupIndex > 0 ? 'mt-1' : ''}`}
                  data-testid={groupIndex === 0 ? 'ph-group' : undefined}
                >
                  {formatShortDate(group.date)}
                </div>
                <div
                  className="grid grid-cols-3 gap-1.75 sm:gap-2.5"
                  data-testid={groupIndex === 0 ? 'ph-grid' : undefined}
                >
                  {group.ids.map((photoId) => {
                    const isSelected = selected.includes(photoId);
                    return (
                      <Button
                        aria-label="Progress photo"
                        className="relative aspect-square h-auto min-h-0 w-full rounded-panel bg-transparent p-0 text-title font-normal leading-[normal] [box-shadow:none]"
                        key={photoId}
                        onPress={() => toggle(photoId)}
                        variant="ghost"
                      >
                        <PhotoThumb
                          className="flex size-full items-center justify-center overflow-hidden rounded-panel bg-surface-tertiary text-muted/60"
                          iconClassName="size-5 sm:size-6"
                          src={urls[photoId]}
                          testId="ph-tile"
                        />
                        {isSelected ? (
                          <>
                            <span className="absolute inset-0 rounded-panel border-accent [border-width:3px]" />
                            <span className="absolute top-1.25 right-1.25 flex size-4.5 items-center justify-center rounded-pill bg-accent [color:white] sm:top-1.75 sm:right-1.75 sm:size-5.25">
                              <Check className="size-3 sm:size-3.25" />
                            </span>
                          </>
                        ) : null}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}

            {isComparing && selected.length === 2 ? (
              <div className="sticky bottom-0 flex justify-center pt-2.5">
                <Button
                  className={`${ACCENT_BUTTON} h-11 rounded-panel px-6 text-body`}
                  onPress={() => setCompareOpen(true)}
                >
                  Compare 2 photos
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </Page.Content>

      <AlertDialog.Backdrop
        isOpen={isCompareOpen}
        onOpenChange={setCompareOpen}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-200">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Heading>Compare</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <div className="grid grid-cols-2 gap-0.5">
                {selected.map((photoId) => (
                  <div key={photoId}>
                    <PhotoThumb
                      className="flex aspect-square items-center justify-center overflow-hidden bg-surface-tertiary text-muted/60"
                      iconClassName="size-7"
                      src={urls[photoId]}
                    />
                    <div className="mt-2 text-center text-eyebrow font-semibold text-muted">
                      {dateOf(photoId) ? formatShortDate(dateOf(photoId)!) : ''}
                    </div>
                  </div>
                ))}
              </div>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                onPress={() => setCompareOpen(false)}
                variant="outline"
              >
                Done
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </Page>
  );
}
