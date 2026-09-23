# Conversations

Messages provides the coach inbox with search, read/unread state and server pagination. A client profile can open its conversation. Reading updates read state across connected sessions.

History opens at the latest message and loads older pages without moving the reading position. Incoming messages offer Jump to latest when the coach is reading earlier history. The multiline composer keeps drafts on failed requests and protects navigation. An uncertain send checks recent messages before retrying.

Chat supports text, photo/audio/video attachments, voice recording and links to workout and meal records. Links retain the record date and snapshot; missing records show an explicit unavailable state. Upload failure retains the attachment for retry. Account changes cannot restore another account's draft, messages or media.

Browser verification covers cursor history, live updates, reconnect, send recovery, storage failures and account isolation. Current reset results are recorded in `../core-reset/verification.md`; physical-device media compatibility remains separate.
