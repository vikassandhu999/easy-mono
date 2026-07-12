import {mediaKind} from '@easy/utils';
import {useState} from 'react';

import type {ChatAttachment} from '@/api/attachments';

function MessageAttachment({
  attachment,
  refresh,
  url,
}: {
  attachment: ChatAttachment;
  refresh: (ids: string[]) => Promise<void>;
  url?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const [retried, setRetried] = useState(false);

  if (!url || refreshing || failedUrl === url) {
    return (
      <div className="grid min-h-11 place-items-center rounded-xl border border-border bg-surface-secondary px-3 py-2 text-center text-muted text-xs">
        {failedUrl === url ? 'Media unavailable' : 'Loading media…'}
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
        href={url}
        rel="noreferrer"
        target="_blank"
      >
        {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: media load errors refresh an expired signed URL */}
        <img
          alt="Message attachment"
          className="max-h-80 w-full rounded-xl object-cover"
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
        className="max-h-80 w-full rounded-xl bg-black"
        controls
        onError={onError}
        src={url}
      />
    );
  }
  return (
    // biome-ignore lint/a11y/useMediaCaption: user-provided voice notes have no caption track
    <audio
      className="min-h-11 w-full"
      controls
      onError={onError}
      src={url}
    />
  );
}

export default function MessageAttachments({
  attachments,
  refresh,
  urls,
}: {
  attachments: ChatAttachment[];
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
          key={attachment.id}
          refresh={refresh}
          url={urls[attachment.id]}
        />
      ))}
    </div>
  );
}
