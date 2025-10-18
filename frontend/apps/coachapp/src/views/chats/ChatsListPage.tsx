import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Center,
    Container,
    Divider,
    Group,
    Loader,
    ScrollArea,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
    Title,
} from '@mantine/core';
import {IconArrowLeft, IconClock, IconMessageCircle, IconSearch, IconUsers} from '@tabler/icons-react';
import React, {useMemo, useState} from 'react';
import {useNavigate} from 'react-router';

import {useDebouncedValue} from '@/hooks/useDebouncedValue';
import {useListChatsInfiniteQuery} from '@/store/services/chatsApi';

import ChatListRow from './ChatListRow';
import ChatSearchDialog from './ChatSearchDialog';

export default function ChatsListPage() {
    const navigate = useNavigate();
    const [searchOpen, setSearchOpen] = useState(false);
    const [quickSearch, setQuickSearch] = useState('');
    const [debouncedQuickSearch] = useDebouncedValue(quickSearch, 300);

    const {data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListChatsInfiniteQuery({
        search_text: debouncedQuickSearch || undefined,
    });

    const chats = useMemo(() => {
        return data?.pages.flatMap((p) => p.chats) ?? [];
    }, [data]);

    const totalUnreadCount = useMemo(() => {
        return 0; // TODO: Implement unread count logic when available
    }, []);

    const handleLoadMore = () => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    if (isLoading) {
        return (
            <Container
                h="100vh"
                p="md"
                size="sm"
            >
                <Center h="100%">
                    <Stack
                        align="center"
                        gap="md"
                    >
                        <Loader size="lg" />
                        <Text c="dimmed">Loading chats...</Text>
                    </Stack>
                </Center>
            </Container>
        );
    }

    if (error) {
        return (
            <Container
                h="100vh"
                p="md"
                size="sm"
            >
                <Center h="100%">
                    <Stack
                        align="center"
                        gap="md"
                    >
                        <ThemeIcon
                            color="red"
                            size="xl"
                            variant="light"
                        >
                            <IconMessageCircle size={32} />
                        </ThemeIcon>
                        <Text
                            fw={500}
                            size="lg"
                        >
                            Failed to load chats
                        </Text>
                        <Text
                            c="dimmed"
                            ta="center"
                        >
                            Please check your connection and try again
                        </Text>
                        <Button onClick={() => window.location.reload()}>Retry</Button>
                    </Stack>
                </Center>
            </Container>
        );
    }

    return (
        <Container
            h="100vh"
            p={0}
            size="sm"
            style={{display: 'flex', flexDirection: 'column'}}
        >
            {/* Header */}
            <Box
                p="md"
                style={(theme) => ({
                    backgroundColor: 'white',
                    borderBottom: `1px solid ${theme.colors.gray[2]}`,
                })}
            >
                <Stack gap="md">
                    {/* Top row */}
                    <Group
                        align="center"
                        justify="space-between"
                    >
                        <Group gap="sm">
                            <ActionIcon
                                aria-label="Go back"
                                color="gray"
                                onClick={() => navigate('/dashboard')}
                                size="lg"
                                style={{
                                    minHeight: 44,
                                    minWidth: 44,
                                }}
                                variant="subtle"
                            >
                                <IconArrowLeft size={20} />
                            </ActionIcon>
                            <Title
                                order={2}
                                size="h3"
                            >
                                Chats
                            </Title>
                            {totalUnreadCount > 0 && (
                                <Badge
                                    color="blue"
                                    size="sm"
                                    variant="filled"
                                >
                                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                                </Badge>
                            )}
                        </Group>

                        <ActionIcon
                            aria-label="Search chats"
                            onClick={() => setSearchOpen(true)}
                            size="lg"
                            variant="light"
                        >
                            <IconSearch size={20} />
                        </ActionIcon>
                    </Group>

                    {/* Quick search */}
                    <TextInput
                        leftSection={<IconSearch size={16} />}
                        onChange={(e) => setQuickSearch(e.currentTarget.value)}
                        placeholder="Quick search by name..."
                        radius="xl"
                        value={quickSearch}
                        variant="filled"
                    />

                    {/* Stats */}
                    <Group
                        gap="lg"
                        justify="center"
                    >
                        <Group gap="xs">
                            <ThemeIcon
                                color="blue"
                                size="sm"
                                variant="light"
                            >
                                <IconMessageCircle size={12} />
                            </ThemeIcon>
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                {chats.length} chats
                            </Text>
                        </Group>

                        <Group gap="xs">
                            <ThemeIcon
                                color="green"
                                size="sm"
                                variant="light"
                            >
                                <IconUsers size={12} />
                            </ThemeIcon>
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                {chats.filter((chat) => (chat as any).client).length} online
                            </Text>
                        </Group>

                        {totalUnreadCount > 0 && (
                            <Group gap="xs">
                                <ThemeIcon
                                    color="orange"
                                    size="sm"
                                    variant="light"
                                >
                                    <IconClock size={12} />
                                </ThemeIcon>
                                <Text
                                    c="dimmed"
                                    size="sm"
                                >
                                    {totalUnreadCount} unread
                                </Text>
                            </Group>
                        )}
                    </Group>
                </Stack>
            </Box>

            {/* Chat List */}
            <ScrollArea
                offsetScrollbars
                scrollbarSize={6}
                style={{flex: 1}}
                type="scroll"
            >
                {chats.length === 0 ? (
                    <Center
                        h="100%"
                        p="xl"
                    >
                        <Stack
                            align="center"
                            gap="md"
                        >
                            <ThemeIcon
                                color="gray"
                                size="xl"
                                variant="light"
                            >
                                <IconMessageCircle size={32} />
                            </ThemeIcon>
                            <Text
                                c="dimmed"
                                fw={500}
                                size="lg"
                            >
                                {quickSearch || debouncedQuickSearch ? 'No chats found' : 'No chats yet'}
                            </Text>
                            <Text
                                c="dimmed"
                                size="sm"
                                ta="center"
                            >
                                {quickSearch || debouncedQuickSearch
                                    ? 'Try adjusting your search terms'
                                    : 'Your conversations with clients will appear here'}
                            </Text>
                        </Stack>
                    </Center>
                ) : (
                    <Stack gap={0}>
                        {chats.map((chat, index) => (
                            <React.Fragment key={chat.id}>
                                <ChatListRow chat={chat as any} />
                                {index < chats.length - 1 && <Divider mx="md" />}
                            </React.Fragment>
                        ))}

                        {/* Load more */}
                        {hasNextPage && (
                            <Box p="md">
                                <Button
                                    fullWidth
                                    leftSection={<IconClock size={16} />}
                                    loading={isFetchingNextPage}
                                    onClick={handleLoadMore}
                                    variant="light"
                                >
                                    {isFetchingNextPage ? 'Loading...' : 'Load More chats'}
                                </Button>
                            </Box>
                        )}

                        {/* End of list indicator */}
                        {!hasNextPage && chats.length > 10 && (
                            <Center p="md">
                                <Text
                                    c="dimmed"
                                    size="sm"
                                >
                                    You've reached the end of your chats
                                </Text>
                            </Center>
                        )}
                    </Stack>
                )}
            </ScrollArea>

            {/* Search Dialog */}
            <ChatSearchDialog
                onClose={() => setSearchOpen(false)}
                opened={searchOpen}
            />
        </Container>
    );
}
