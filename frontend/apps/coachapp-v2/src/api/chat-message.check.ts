import {parseChatMessage} from './chat-message.ts';

const frame = {
  attachments: [{id: 'att-1', content_type: 'image/png'}],
  body: 'hello',
  conversation_id: 'conv-1',
  embed: null,
  id: 'msg-1',
  inserted_at: '2026-08-22T10:00:00Z',
  sender_id: 'user-1',
  sender_type: 'client',
};

function check(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const parsed = parseChatMessage(frame);
check(parsed?.id === 'msg-1', 'a well-formed frame parses');
check(parsed?.attachments.length === 1, 'its attachments survive');

// The frames the thread would crash on: `attachments` absent, or entries with no
// id for the download resolver.
check(parseChatMessage({...frame, attachments: undefined})?.attachments.length === 0, 'a missing array becomes empty');
check(parseChatMessage({...frame, attachments: ['x', null, {}]})?.attachments.length === 0, 'idless entries are cut');

check(parseChatMessage({...frame, id: 42}) === null, 'a non-string id is not a message');
check(parseChatMessage({...frame, sender_type: 'robot'}) === null, 'sender_type is a closed vocabulary');
check(parseChatMessage(null) === null, 'null is not a message');
check(parseChatMessage('message') === null, 'a string is not a message');
check(parseChatMessage({...frame, body: undefined})?.body === null, 'a bodyless frame is an empty body');

console.log('chat-message checks passed');
