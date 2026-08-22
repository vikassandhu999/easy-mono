import {mediaKind} from '@easy/utils';
import {Button} from '@heroui/react';
import {useState} from 'react';

import type {Attachment} from '@/api/uploads';

function MessageAttachment({
  attachment,
  failed,
  refresh,
  url,
}: {
  attachment: Attachment;
  failed: boolean;
  refresh: (ids: string[]) => Promise<void>;
  url?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const [retried, setRetried] = useState(false);
  const mediaFailed = Boolean(url && failedUrl === url);

  const retryManually = () => {
    setRefreshing(true);
    refresh([attachment.id])
      .then(() => {
        setFailedUrl(undefined);
        setRefreshing(false);
      })
      .catch(() => setRefreshing(false));
  };

  if (!url || refreshing || mediaFailed) {
    return (
      <div className="grid place-items-center gap-2 rounded-xl border border-border bg-surface-secondary px-4 py-6 text-center text-muted text-xs">
        {failed || mediaFailed ? (
          <>
            <span>Media unavailable</span>
            <Button
              className="min-h-11"
              onPress={retryManually}
              size="sm"
              variant="secondary"
            >
              Retry
            </Button>
          </>
        ) : (
          'Loading media…'
        )}
      </div>
    );
  }

  const onError = () => {
    if (retried) {
      setFailedUrl(url);
      return;
    }
    setRetried(true);
    setRefreshing(true);
    refresh([attachment.id])
      .then(() => setRefreshing(false))
      .catch(() => setFailedUrl(url));
  };

  const kind = mediaKind(attachment.content_type);
  if (kind === 'image') {
    return (
      <a
        className="inline-block max-w-full overflow-hidden rounded-xl bg-surface-secondary align-bottom"
        href={url}
        rel="noreferrer"
        target="_blank"
      >
        {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: media load errors refresh an expired signed URL */}
        <img
          alt="Message attachment"
          // Auto width + capped height keeps every aspect ratio intact; the old
          // `w-full object-cover` cropped portrait photos to a letterbox.
          className="block max-h-80 w-auto max-w-full"
          onError={onError}
          src={url}
        />
      </a>
    );
  }
  if (kind === 'video') {
    return (
      // biome-ignore lint/a11y/useMediaCaption: user-provided chat video has no caption track
      <video
        // No `w-full`: the bubble is shrink-to-fit, so a percentage width has
        // nothing to resolve against and collapses the player. `preload` gives
        // the element its real intrinsic size instead.
        className="block max-h-80 max-w-full rounded-xl bg-black"
        controls
        onError={onError}
        preload="metadata"
        src={url}
      />
    );
  }
  return (
    // A definite width is required — `<audio>` has no useful intrinsic size, so
    // inside a shrink-to-fit bubble it renders as a ~51px stub. No background:
    // the native control draws its own, and a wrapper fill reads as a box in a box.
    <div className="w-64 max-w-full">
      {/* biome-ignore lint/a11y/useMediaCaption: user-provided voice notes have no caption track */}
      <audio
        className="block w-full"
        controls
        onError={onError}
        preload="metadata"
        src={url}
      />
    </div>
  );
}

export default function MessageAttachments({
  attachments,
  failedIds,
  refresh,
  urls,
}: {
  attachments: Attachment[];
  failedIds: Set<string>;
  refresh: (ids: string[]) => Promise<void>;
  urls: Record<string, string>;
}) {
  if (attachments.length === 0) {
    return null;
  }
  return (
    <div className="grid gap-2">
      {attachments.map((attachment) => (
        <MessageAttachment
          attachment={attachment}
          failed={failedIds.has(attachment.id)}
          key={attachment.id}
          refresh={refresh}
          {...(urls[attachment.id] !== undefined ? {url: urls[attachment.id]} : {})}
        />
      ))}
    </div>
  );
}
