import type {components} from './schema.ts';

type ChatMessage = components['schemas']['ChatMessage'];
type ChatMessageEmbed = components['schemas']['ChatMessageEmbed'];

/**
 * A `message_new` socket frame, parsed into the domain type.
 *
 * The channel is a SECOND door into the message cache and phoenix hands its
 * payloads over as `unknown` — nothing about it is covered by the generated
 * types the REST path is checked against. An unparsed frame lands in the list
 * and renders, so a missing `attachments` array is a crash in the thread rather
 * than a dropped message. Returns null for anything that isn't a message.
 */
export function parseChatMessage(payload: unknown): ChatMessage | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const {attachments, body, conversation_id, embed, id, inserted_at, sender_id, sender_type} = payload as Record<
    string,
    unknown
  >;
  if (
    typeof id !== 'string' ||
    typeof conversation_id !== 'string' ||
    typeof sender_id !== 'string' ||
    typeof inserted_at !== 'string' ||
    (sender_type !== 'coach' && sender_type !== 'client')
  ) {
    return null;
  }
  return {
    // Attachments are what the thread iterates; keep only the entries that carry
    // the id the download resolver needs.
    attachments: (Array.isArray(attachments) ? attachments : []).filter(
      (attachment): attachment is ChatMessage['attachments'][number] =>
        !!attachment && typeof attachment === 'object' && typeof attachment.id === 'string',
    ),
    body: typeof body === 'string' ? body : null,
    conversation_id,
    // The embed renders through its own optional chain; validated to an object.
    embed: embed && typeof embed === 'object' ? (embed as ChatMessageEmbed) : null,
    id,
    inserted_at,
    sender_id,
    sender_type,
  };
}
