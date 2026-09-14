import {useState} from 'react';
import {Button} from './button';

export function MediaPreview({url, kind, label}: {url: string | null; kind: 'image' | 'video'; label: string}) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  if (!url || failed) {
    return (
      <div className="space-y-2 rounded-xl bg-muted p-4 text-sm">
        <p role="status">{label} is unavailable.</p>
        {url && (
          <Button
            variant="outline"
            size="sm"
            onPress={() => {
              setFailed(false);
              setAttempt(attempt + 1);
            }}
          >
            Retry media
          </Button>
        )}
      </div>
    );
  }
  return kind === 'video' ? (
    <video
      key={attempt}
      src={url}
      aria-label={label}
      controls
      muted
      playsInline
      preload="metadata"
      onError={() => setFailed(true)}
      className="max-h-64 w-full rounded-xl bg-muted object-contain"
    />
  ) : (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: onError reports image loading failure, not a user interaction.
    <img
      key={attempt}
      src={url}
      alt={label}
      loading="lazy"
      onError={() => setFailed(true)}
      className="max-h-64 w-full rounded-xl bg-muted object-contain"
    />
  );
}
