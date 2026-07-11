import {Typography} from '@heroui/react';

import type {ClientProfileReviewQueueItem} from '@/api/checkins';

type SnapshotQuestion = {id?: string; label?: string};
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
                <Typography
                  className="mt-1 break-words"
                  type="body-sm"
                  weight="semibold"
                >
                  {formatAnswer(question.id ? item.answers[question.id] : undefined)}
                </Typography>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
