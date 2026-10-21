import {type DurableDraftOptions, useDurableDraft as useSharedDraft} from '@easy/utils/use-durable-draft';
import {readDraft, removeDraft, writeDraft} from '../api/drafts';
import {getSession} from '../api/session';

const storage = {getOwner: () => getSession()?.id, read: readDraft, write: writeDraft, remove: removeDraft};
export function useDurableDraft<T>(options: DurableDraftOptions<T>) {
  return useSharedDraft({...options, storage});
}
