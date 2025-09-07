/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import {useMemo} from 'react';
import {useNavigate} from 'react-router';
import {Group, Avatar, Text, Stack, Badge, UnstyledButton, Box} from '@mantine/core';
import dayjs from 'dayjs';
import {Chat} from '@easy/chat';

const formatTouchedAt = (touchedAt: Date) => {
    const date = dayjs(touchedAt);
    if (date.isSame(dayjs(), 'day')) {
        return date.format('HH:mm');
    } else if (date.isSame(dayjs().subtract(1, 'day'), 'day')) {
        return 'Yesterday';
    } else {
        return date.format('DD/MM/YYYY');
    }
};

interface ChatListRowProps {
    chat: Chat;
    onClick?: () => void;
}

export default function ChatListRow({chat, onClick}: ChatListRowProps) {
    const navigate = useNavigate();

    const recentMessageText = useMemo(() => {
        if (!chat.latest_message) return 'No messages yet';
        return chat.latest_message.content;
    }, [chat.latest_message]);

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else {
            navigate(`/chats/${chat.id}`);
        }
    };

    const isUnread = true;
    // chat.unread_count > 0;
    const isTyping = Boolean(chat.typing_text);

    return (
        <UnstyledButton
            onClick={handleClick}
            w="100%"
            p="md"
            style={(theme) => ({
                borderRadius: theme.radius.md,
                '&:hover': {
                    backgroundColor: theme.colors.gray[0],
                },
                '&:active': {
                    backgroundColor: theme.colors.gray[1],
                },
            })}
        >
            <Group
                gap="md"
                align="flex-start"
                wrap="nowrap"
            >
                {/* Avatar */}
                <Box style={{position: 'relative'}}>
                    <Avatar
                        src={`https://i.pravatar.cc/150?u=${chat.client.id}`}
                        alt={chat.client.name}
                        size="lg"
                        radius="xl"
                    />

                    {/* Online status indicator */}
                    {chat.client && (
                        <Box
                            style={{
                                position: 'absolute',
                                bottom: 2,
                                right: 2,
                                width: 12,
                                height: 12,
                                backgroundColor: 'var(--mantine-color-green-5)',
                                border: '2px solid white',
                                borderRadius: '50%',
                            }}
                        />
                    )}
                </Box>

                {/* Content */}
                <Stack
                    gap="xs"
                    style={{flex: 1, minWidth: 0}}
                >
                    {/* Header row */}
                    <Group
                        justify="space-between"
                        gap="xs"
                        wrap="nowrap"
                    >
                        <Text
                            fw={isUnread ? 600 : 500}
                            size="sm"
                            truncate
                            style={{flex: 1}}
                        >
                            {chat.client.name}
                        </Text>

                        <Group
                            gap="xs"
                            align="center"
                        >
                            {isUnread && (
                                <Badge
                                    size="sm"
                                    variant="filled"
                                    color="blue"
                                    circle
                                >
                                    99+
                                </Badge>
                            )}

                            <Text
                                size="xs"
                                c="dimmed"
                                style={{whiteSpace: 'nowrap'}}
                            >
                                {formatTouchedAt(chat.latest_message_at)}
                            </Text>
                        </Group>
                    </Group>

                    {/* Message preview */}
                    <Text
                        size="sm"
                        c={isTyping ? 'blue' : isUnread ? 'dark' : 'dimmed'}
                        fw={isUnread ? 500 : 400}
                        fs={isTyping ? 'italic' : 'normal'}
                        truncate
                        lineClamp={2}
                    >
                        {isTyping ? `${chat.client.name} is typing...` : recentMessageText}
                    </Text>
                </Stack>
            </Group>
        </UnstyledButton>
    );
}
