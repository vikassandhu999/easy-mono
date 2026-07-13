import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {type AttachmentDownload, useGetCoachAttachmentDownloadUrlsMutation} from '@/api/generated';

const BATCH_SIZE = 50;
const REFRESH_BEFORE_MS = 60_000;

export default function useAttachmentDownloadUrls(ids: string[]) {
  const idsKey = [...new Set(ids)].join(',');
  const uniqueIds = useMemo(() => (idsKey ? idsKey.split(',') : []), [idsKey]);
  const activeIdsRef = useRef(new Set(uniqueIds));
  const [downloads, setDownloads] = useState<Record<string, AttachmentDownload>>({});
  const [failedIds, setFailedIds] = useState<Set<string>>(() => new Set());
  const [getDownloadUrls] = useGetCoachAttachmentDownloadUrlsMutation();

  activeIdsRef.current = new Set(uniqueIds);

  const refresh = useCallback(
    async (refreshIds: string[]) => {
      const requested = [...new Set(refreshIds)].filter((id) => activeIdsRef.current.has(id));
      let failed = false;
      let firstError: unknown;
      for (let index = 0; index < requested.length; index += BATCH_SIZE) {
        const batch = requested.slice(index, index + BATCH_SIZE);
        setFailedIds((current) => {
          const next = new Set(current);
          for (const id of batch) {
            next.delete(id);
          }
          return next;
        });
        let response;
        try {
          response = await getDownloadUrls({attachmentDownloadRequest: {attachment_ids: batch}}).unwrap();
        } catch (error) {
          setDownloads((current) => {
            const next = {...current};
            for (const id of batch) {
              delete next[id];
            }
            return next;
          });
          setFailedIds((current) => new Set([...current, ...batch]));
          failed = true;
          firstError ??= error;
          continue;
        }
        setDownloads((current) => {
          const next = {...current};
          for (const download of response.data) {
            if (activeIdsRef.current.has(download.id)) {
              next[download.id] = download;
            }
          }
          return next;
        });
      }
      if (failed) {
        throw firstError;
      }
    },
    [getDownloadUrls],
  );

  useEffect(() => {
    const activeIds = new Set(uniqueIds);
    setDownloads((current) => {
      const retained = Object.entries(current).filter(([id]) => activeIds.has(id));
      return retained.length === Object.keys(current).length ? current : Object.fromEntries(retained);
    });
    setFailedIds((current) => {
      const retained = [...current].filter((id) => activeIds.has(id));
      return retained.length === current.size ? current : new Set(retained);
    });

    const now = Date.now();
    const staleIds = uniqueIds.filter((id) => {
      const expiry = downloads[id]?.download_url_expires_at;
      return !expiry || new Date(expiry).getTime() - now <= REFRESH_BEFORE_MS;
    });
    if (staleIds.length > 0) {
      refresh(staleIds).catch(() => undefined);
    }
  }, [downloads, refresh, uniqueIds]);

  useEffect(() => {
    const nextRefreshAt = uniqueIds.reduce((earliest, id) => {
      const expiry = downloads[id]?.download_url_expires_at;
      return expiry ? Math.min(earliest, new Date(expiry).getTime() - REFRESH_BEFORE_MS) : earliest;
    }, Number.POSITIVE_INFINITY);
    if (!Number.isFinite(nextRefreshAt)) {
      return;
    }
    const timer = window.setTimeout(
      () => {
        const now = Date.now();
        const expiringIds = uniqueIds.filter((id) => {
          const expiry = downloads[id]?.download_url_expires_at;
          return expiry && new Date(expiry).getTime() - now <= REFRESH_BEFORE_MS;
        });
        refresh(expiringIds).catch(() => undefined);
      },
      Math.max(0, nextRefreshAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [downloads, refresh, uniqueIds]);

  return {
    failedIds,
    refresh,
    urls: Object.fromEntries(Object.entries(downloads).map(([id, download]) => [id, download.download_url])),
  };
}
