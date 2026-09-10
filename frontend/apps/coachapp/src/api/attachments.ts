import {useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {attachmentKeys} from './keys';

export function useAttachmentDownloads(ids: string[], enabled: boolean) {
  return useQuery({
    queryKey: attachmentKeys.downloads(ids),
    queryFn: ({signal}) =>
      call(client.POST('/v1/coach/attachments/download-urls', {body: {attachment_ids: ids}, signal})),
    enabled: enabled && ids.length > 0,
    staleTime: 0,
    gcTime: 0,
  });
}
