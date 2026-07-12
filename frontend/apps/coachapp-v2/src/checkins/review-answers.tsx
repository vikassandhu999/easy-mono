import {Typography} from '@heroui/react';

import type {ClientProfileReviewQueueItem} from '@/api/checkins';
import useAttachmentDownloadUrls from '@/messages/use-attachment-download-urls';

type SnapshotQuestion = {id?: string; label?: string; type?: string};
type SnapshotSection = {questions?: SnapshotQuestion[]; title?: string};

function formatAnswer(value: unknown): string {
  if (value == null || value === '') {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(String).join(', ') : '—';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

export default function ReviewAnswers({item}: {item: ClientProfileReviewQueueItem}) {
  const sections = item.question_snapshot as SnapshotSection[];
  const attachments = new Map(item.attachments.map((attachment) => [attachment.id, attachment]));
  const {urls} = useAttachmentDownloadUrls(item.attachments.map((attachment) => attachment.id));

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
            {(section.questions ?? []).map((question, questionIndex) => (
              <div
                className="rounded-2xl border border-border bg-surface-secondary p-4"
                key={question.id ?? `${sectionIndex}-${questionIndex}`}
              >
                <Typography
                  color="muted"
                  type="body-xs"
                  weight="semibold"
                >
                  {question.label ?? question.id ?? 'Question'}
                </Typography>
                {question.type === 'photo' ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(question.id && Array.isArray(item.answers[question.id]) ? item.answers[question.id] : []).map(
                      (attachmentId: unknown, photoIndex: number) => {
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
                              className="aspect-[3/4] w-full rounded-xl border border-border object-cover"
                              src={url}
                            />
                          </a>
                        ) : (
                          <div
                            className="grid aspect-[3/4] place-items-center rounded-xl border border-border bg-surface text-center text-muted text-xs"
                            key={String(attachmentId)}
                          >
                            Photo unavailable
                          </div>
                        );
                      },
                    )}
                  </div>
                ) : (
                  <Typography
                    className="mt-1 break-words"
                    type="body-sm"
                    weight="semibold"
                  >
                    {formatAnswer(question.id ? item.answers[question.id] : undefined)}
                  </Typography>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
