import {ConversationInboxList} from '@/@components/conversation-inbox-list';
import {PickerModal} from '@/builder-kit/picker-modal';

/**
 * The inbox as a modal (decision 2026-08-08: Messages left the app nav — the
 * actionable slice is the workbench Replies queue; this is the awareness
 * surface, opened from the utility row above Today). Opening a thread
 * navigates to the full conversation screen — composing stays full-page.
 */
export function MessagesModal({onClose, open}: {onClose: () => void; open: boolean}) {
  return (
    <PickerModal
      onClose={onClose}
      open={open}
      title="Messages"
    >
      <ConversationInboxList
        className="gap-0 p-0"
        onNavigate={onClose}
        searchable
      />
    </PickerModal>
  );
}
