import {Chip, Typography} from '@heroui/react';
import {type AnswerType, formatAnswer} from '@/checkins/lib/form-answers';
import {PhotoThumb} from '@/clients/components/photo-thumb';

/**
 * One form answer, in the register its TYPE calls for: a rating reads `4/5` beside five
 * dots, a weight carries where it went, a photo answer shows the photos rather
 * than the words "3 photos attached", and everything else is text.
 */
export function FormAnswer({
  label,
  photoUrls,
  type,
  value,
  weightUnit,
}: {
  label: string;
  photoUrls?: (string | undefined)[];
  type: AnswerType;
  value: unknown;
  weightUnit: string;
}) {
  return (
    <div>
      <div className="mb-2 type-eyebrow font-semibold text-muted">{label}</div>
      {type === 'photo' ? (
        photoUrls && photoUrls.length > 0 ? (
          <div className="grid max-w-lg grid-cols-3 gap-3">
            {photoUrls.map((url, index) => (
              <PhotoThumb
                alt="Progress photo"
                fill
                key={url ?? `photo-${index}`}
                src={url}
              />
            ))}
          </div>
        ) : (
          <Typography
            color="muted"
            type="body-sm"
          >
            No photos attached
          </Typography>
        )
      ) : type === 'rating' && typeof value === 'number' ? (
        <div className="flex items-center gap-3">
          <span className="font-grotesk type-title font-bold">{value}/5</span>
          <span
            aria-hidden
            className="flex gap-1"
          >
            {[1, 2, 3, 4, 5].map((step) => (
              <span
                className={`size-2.25 rounded-pill ${step <= value ? 'bg-accent' : 'bg-surface-tertiary'}`}
                key={step}
              />
            ))}
          </span>
        </div>
      ) : type === 'weight' ? (
        <div className="flex items-baseline gap-2">
          <span className="font-grotesk type-title font-bold">
            {formatAnswer(value, type)} {weightUnit}
          </span>
          <Typography
            color="muted"
            type="body-xs"
          >
            Saved to weight log
          </Typography>
        </div>
      ) : type === 'multi_select' && Array.isArray(value) && value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((option) => (
            <Chip
              className="chip--outline"
              key={String(option)}
              size="sm"
            >
              {String(option)}
            </Chip>
          ))}
        </div>
      ) : type ? (
        <Typography type="body-sm">{formatAnswer(value, type)}</Typography>
      ) : (
        <Typography type="body-sm">—</Typography>
      )}
    </div>
  );
}
