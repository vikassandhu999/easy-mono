import {Button, Typography} from '@heroui/react';
import type {ClientProfileReviewQueueItem} from '@/api/checkins';
import {formatAnswer} from '@/library/checkins/form-answers';
import useAttachmentDownloadUrls from '@/ui/use-attachment-download-urls';

export default function ReviewAnswers({item}: {item: ClientProfileReviewQueueItem}) {
  const sections = item.question_snapshot;
  const attachments = new Map(item.attachments.map((attachment) => [attachment.id, attachment]));
  const {failedIds, refresh, urls} = useAttachmentDownloadUrls(item.attachments.map((attachment) => attachment.id));

  return (
    <div className="space-y-5">
      {sections.map((section, sectionIndex) => (
        <section key={section.title ?? `section-${sectionIndex}`}>
          {section.title ? (
            <Typography
              className="mb-2 uppercase tracking-wider"
              color="muted"
              type="body-xs"
              weight="bold"
            >
              {section.title}
            </Typography>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {section.questions.map((question) => {
              const answer = item.answers[question.id];
              const photoIds = Array.isArray(answer) ? answer : [];
              return (
                <div
                  className="rounded-card border border-border bg-surface-secondary p-4"
                  key={question.id}
                >
                  <Typography
                    color="muted"
                    type="body-xs"
                    weight="semibold"
                  >
                    {question.label}
                  </Typography>
                  {question.type === 'photo' ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {photoIds.map((attachmentId: unknown, photoIndex: number) => {
                        const attachment = typeof attachmentId === 'string' ? attachments.get(attachmentId) : undefined;
                        const url = attachment && urls[attachment.id];
                        return url ? (
                          <a
                            href={url}
                            key={attachment.id}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <img
                              alt={`${question.label ?? 'Progress photo'} ${photoIndex + 1}`}
                              className="aspect-[3/4] w-full rounded-panel border border-border object-cover"
                              src={url}
                            />
                          </a>
                        ) : (
                          <div
                            className="grid aspect-[3/4] place-items-center rounded-panel border border-border bg-surface text-center text-muted type-eyebrow"
                            key={String(attachmentId)}
                          >
                            {!attachment ? (
                              'Photo unavailable'
                            ) : failedIds.has(attachment.id) ? (
                              <div className="grid gap-2">
                                Photo unavailable
                                <Button
                                  onPress={() => refresh([attachment.id]).catch(() => undefined)}
                                  size="sm"
                                  variant="secondary"
                                >
                                  Retry
                                </Button>
                              </div>
                            ) : (
                              'Loading photo…'
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <Typography
                      className="mt-1 break-words"
                      type="body-sm"
                      weight="semibold"
                    >
                      {formatAnswer(answer, question.type)}
                    </Typography>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
