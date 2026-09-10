import {useState} from 'react';
import {useAttachmentDownloads} from '../api/attachments';
import {errorMessage} from '../api/client';
import type {FormAssignmentAnswer, FormSubmission} from '../api/forms';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {Surface} from '../ui/page';

function Answer({value}: {value: FormAssignmentAnswer | undefined}) {
  if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
    return <span className="text-muted-foreground">Not answered</span>;
  }
  if (typeof value === 'boolean') {
    return <>{value ? 'Yes' : 'No'}</>;
  }
  if (typeof value === 'number' || typeof value === 'string') {
    return <>{value}</>;
  }
  const values = Array.isArray(value)
    ? value
    : value.services.map((service) =>
        service === 'training' ? 'Training' : service === 'nutrition' ? 'Nutrition' : service,
      );
  return (
    <ul className="list-inside list-disc space-y-1">
      {values.map((item, index) => (
        <li key={`${index}:${item}`}>{item}</li>
      ))}
    </ul>
  );
}

function IntakePhotos({ids, label}: {ids: string[]; label: string}) {
  const [opened, setOpened] = useState(false);
  const downloads = useAttachmentDownloads(ids, opened);
  if (!opened) {
    return (
      <Button
        variant="outline"
        onPress={() => setOpened(true)}
      >
        Load {ids.length === 1 ? 'photo' : `${ids.length} photos`}
      </Button>
    );
  }
  return (
    <div className="space-y-3">
      {downloads.isPending ? (
        <p role="status">Loading photos…</p>
      ) : downloads.isError ? (
        <FormError message={errorMessage(downloads.error, "We couldn't load these photos. Please try again.")} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {downloads.data.data.map((photo, index) => (
            <a
              key={photo.id}
              href={photo.download_url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl border border-border p-2"
            >
              <img
                src={photo.download_url}
                alt={`${label}, ${index + 1}`}
                loading="lazy"
                className="max-h-72 w-full rounded-lg object-contain"
              />
              <span className="mt-2 block px-1 text-sm underline">Open photo {index + 1}</span>
            </a>
          ))}
        </div>
      )}
      <Button
        variant="outline"
        isPending={downloads.isFetching}
        onPress={() => {
          downloads.refetch();
        }}
      >
        Reload photos
      </Button>
    </div>
  );
}

export function IntakeAnswers({submission}: {submission: FormSubmission}) {
  return (
    <div
      role="region"
      className="space-y-5"
      aria-label="Submitted answers"
    >
      {submission.question_snapshot.length === 0 && (
        <Surface>
          <p className="text-sm text-muted-foreground">No questions were saved with this submission.</p>
        </Surface>
      )}
      {submission.question_snapshot.map((section, index) => (
        <Surface key={`${index}:${section.title || section.section || ''}`}>
          <h3 className="section-title">{section.title || section.section || `Section ${index + 1}`}</h3>
          <dl className="mt-5 divide-y divide-border">
            {section.questions.map((question) => {
              const value = submission.answers[question.id];
              return (
                <div
                  key={question.id}
                  className="py-5 first:pt-0 last:pb-0"
                >
                  <dt className="break-words text-sm text-muted-foreground">{question.label}</dt>
                  <dd className="mt-2 whitespace-pre-wrap break-words text-base leading-relaxed">
                    {question.type === 'photo' && Array.isArray(value) && value.length > 0 ? (
                      <IntakePhotos
                        ids={value}
                        label={question.label}
                      />
                    ) : (
                      <Answer value={value} />
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </Surface>
      ))}
    </div>
  );
}
