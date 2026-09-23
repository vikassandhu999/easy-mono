import type {ChatMessage} from './schema.ts';

export type {ChatMessage} from './schema.ts';

const CHAT_SENDER_TYPES = ['coach', 'client'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Parse an inbound socket payload before writing it into the React Query cache. */
export function parseChatMessage(payload: unknown): ChatMessage | null {
  if (!isRecord(payload)) {
    return null;
  }

  const {attachments, body, conversation_id, embed, id, inserted_at, request_id, sender_id, sender_name, sender_type} =
    payload;
  if (typeof id !== 'string' || typeof conversation_id !== 'string' || typeof sender_id !== 'string') {
    return null;
  }
  if (typeof sender_type !== 'string' || !CHAT_SENDER_TYPES.includes(sender_type as ChatMessage['sender_type'])) {
    return null;
  }
  if (body !== null && typeof body !== 'string') {
    return null;
  }
  if (
    (sender_name !== null && typeof sender_name !== 'string') ||
    (request_id !== null && typeof request_id !== 'string')
  ) {
    return null;
  }
  if (typeof inserted_at !== 'string') {
    return null;
  }
  if (!Array.isArray(attachments)) {
    return null;
  }
  if (embed !== null && !isRecord(embed)) {
    return null;
  }

  return {
    attachments: attachments as ChatMessage['attachments'],
    body,
    conversation_id,
    embed: embed as ChatMessage['embed'],
    id,
    inserted_at,
    request_id,
    sender_id,
    sender_name,
    sender_type: sender_type as ChatMessage['sender_type'],
  };
}
