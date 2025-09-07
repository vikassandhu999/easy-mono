import dayjs from 'dayjs';
import React, {useContext} from 'react';
import {Message} from '../../types';
import {ChatContext} from '../ChatProvider';
import {Badge} from '@mantine/core';
import {useDateList} from '../DateList';
import {formatDate, formatTime} from './utils';

export const isMessageNewDay = (
    current: Message,
    previous: Message | undefined,
): boolean =>
    !previous || !dayjs(current.sent_at).isSame(previous.sent_at, 'day');

const isSequential = (
    current: Message,
    previous: Message | undefined,
): boolean => {
    if (!previous) return false;
    if (current.sender !== previous.sender) return false;
    const d1 = dayjs(current.sent_at);
    const d2 = dayjs(previous.sent_at);
    // Consider making the time diff configurable or based on a constant
    const MAX_SEQUENTIAL_DIFF_SECONDS = 60; // Example: 1 minute for sequential
    return (
        d1.diff(d2, 'seconds') <= MAX_SEQUENTIAL_DIFF_SECONDS &&
        d1.minute() === d2.minute()
    );
};

// Using React.FC for functional components with forwardRef is a bit more standard
// However, React.forwardRef by itself is also correct.
const MessageListRow = React.forwardRef<
    HTMLDivElement,
    {message: Message; previous?: Message}
>(({message, previous}, ref) => {
    const {useDateRef} = useDateList();
    const dateRef = useDateRef();

    const context = useContext(ChatContext);
    if (!context) return null;
    const {chatApi, chat} = context;

    const isMe = chatApi.getMe(chat).kind === message.sender;

    const newDay = isMessageNewDay(message, previous);
    const sequential = isSequential(message, previous);
    const showTimestamp = !sequential || newDay;

    return (
        <>
            {newDay && (
                <div
                    data-id={new Date(message.sent_at).toISOString()}
                    data-time={new Date(message.sent_at).toLocaleDateString()}
                    ref={dateRef}
                    style={{
                        display: 'flex',
                        width: '100%',
                        justifyContent: 'center',
                        margin: '16px 0',
                    }}
                >
                    <Badge
                        variant="light"
                        color="gray"
                        aria-label={`Messages from ${formatDate(message.sent_at)}`}
                    >
                        {formatDate(message.sent_at)}
                    </Badge>
                </div>
            )}
            <div
                ref={ref}
                style={{
                    display: 'flex',
                    width: '100%',
                    padding: '0 8px',
                    marginBottom: '6px',
                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                }}
            >
                <div
                    style={{
                        maxWidth: '85%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMe ? 'flex-end' : 'flex-start',
                    }}
                >
                    {/* Message Bubble */}
                    <div
                        style={{
                            padding: '8px 12px',
                            borderRadius: '16px',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                            backgroundColor: isMe
                                ? 'var(--mantine-color-blue-6)'
                                : 'var(--mantine-color-gray-1)',
                            color: isMe
                                ? 'var(--mantine-color-white)'
                                : 'var(--mantine-color-dark-7)',
                            wordWrap: 'break-word',
                            maxWidth: '100%',
                        }}
                    >
                        <p
                            style={{
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontSize: '14px',
                                lineHeight: '1.4',
                            }}
                        >
                            {message.content}
                        </p>
                    </div>
                    {/* Timestamp - shown below bubble for clarity */}
                    {showTimestamp && (
                        <p
                            style={{
                                fontSize: '11px',
                                color: 'var(--mantine-color-dimmed)',
                                margin: '3px 0 0 0',
                                padding: '0 4px',
                                textAlign: isMe ? 'right' : 'left',
                            }}
                        >
                            {formatTime(message.sent_at)}
                        </p>
                    )}
                </div>
            </div>
        </>
    );
});

MessageListRow.displayName = 'MessageListRow'; // Good practice for forwardRef components

export default MessageListRow;
