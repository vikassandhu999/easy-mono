import type {ChatMessage} from './parse-chat-message.ts';
import {parseChatMessage} from './parse-chat-message.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const message = {
  attachments: [],
  body: 'Hello',
  conversation_id: '00000000-0000-4000-8000-000000000001',
  embed: null,
  id: '00000000-0000-4000-8000-000000000002',
  inserted_at: '2026-08-02T10:00:00Z',
  sender_id: '00000000-0000-4000-8000-000000000003',
  sender_type: 'coach',
} satisfies ChatMessage;

assert(parseChatMessage(message)?.id === message.id, 'valid socket payloads must parse');
assert(parseChatMessage({...message, sender_type: 'admin'}) === null, 'unknown sender types must be rejected');
assert(parseChatMessage(null) === null, 'non-objects must be rejected');
