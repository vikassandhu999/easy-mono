/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import {Chat} from '@easy/chat';
import {Avatar, Badge, Box, Group, Stack, Text, UnstyledButton} from '@mantine/core';
import dayjs from 'dayjs';
import {useMemo} from 'react';
import {useNavigate} from 'react-router';

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
            p="md"
            style={(theme) => ({
                '&:active': {
                    backgroundColor: theme.colors.gray[1],
                },
                '&:hover': {
                    backgroundColor: theme.colors.gray[0],
                },
                borderRadius: theme.radius.md,
            })}
            w="100%"
        >
            <Group
                align="flex-start"
                gap="md"
                wrap="nowrap"
            >
                {/* Avatar */}
                <Box style={{position: 'relative'}}>
                    <Avatar
                        alt={chat.client.name}
                        radius="xl"
                        size="lg"
                        src={`https://i.pravatar.cc/150?u=${chat.client.id}`}
                    />

                    {/* Online status indicator */}
                    {chat.client && (
                        <Box
                            style={{
                                backgroundColor: 'var(--mantine-color-green-5)',
                                border: '2px solid white',
                                borderRadius: '50%',
                                bottom: 2,
                                height: 12,
                                position: 'absolute',
                                right: 2,
                                width: 12,
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
                        gap="xs"
                        justify="space-between"
                        wrap="nowrap"
                    >
                        <Text
                            fw={isUnread ? 600 : 500}
                            size="sm"
                            style={{flex: 1}}
                            truncate
                        >
                            {chat.client.name}
                        </Text>

                        <Group
                            align="center"
                            gap="xs"
                        >
                            {isUnread && (
                                <Badge
                                    circle
                                    color="blue"
                                    size="sm"
                                    variant="filled"
                                >
                                    99+
                                </Badge>
                            )}

                            <Text
                                c="dimmed"
                                size="xs"
                                style={{whiteSpace: 'nowrap'}}
                            >
                                {formatTouchedAt(chat.latest_message_at)}
                            </Text>
                        </Group>
                    </Group>

                    {/* Message preview */}
                    <Text
                        c={isTyping ? 'blue' : isUnread ? 'dark' : 'dimmed'}
                        fs={isTyping ? 'italic' : 'normal'}
                        fw={isUnread ? 500 : 400}
                        lineClamp={2}
                        size="sm"
                        truncate
                    >
                        {isTyping ? `${chat.client.name} is typing...` : recentMessageText}
                    </Text>
                </Stack>
            </Group>
        </UnstyledButton>
    );
}
