import React, {useMemo, useState} from 'react';
import {useNavigate} from 'react-router';
import {
    Group,
    ActionIcon,
    Stack,
    Text,
    TextInput,
    Center,
    Loader,
    Button,
    Box,
    ScrollArea,
    Divider,
    Badge,
    ThemeIcon,
    Container,
    Title,
} from '@mantine/core';
import {IconSearch, IconMessageCircle, IconUsers, IconClock, IconArrowLeft} from '@tabler/icons-react';
import {useChats} from '@/hooks/useChatsQueries';
import ChatListRow from './ChatListRow';
import ChatSearchDialog from './ChatSearchDialog';
import {useDebouncedValue} from '@/hooks/useDebouncedValue';

export default function ChatsListPage() {
    const navigate = useNavigate();
    const [searchOpen, setSearchOpen] = useState(false);
    const [quickSearch, setQuickSearch] = useState('');
    const [debouncedQuickSearch] = useDebouncedValue(quickSearch, 300);

    const {data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error} = useChats(debouncedQuickSearch);

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
                size="sm"
                p="md"
                h="100vh"
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
                size="sm"
                p="md"
                h="100vh"
            >
                <Center h="100%">
                    <Stack
                        align="center"
                        gap="md"
                    >
                        <ThemeIcon
                            size="xl"
                            variant="light"
                            color="red"
                        >
                            <IconMessageCircle size={32} />
                        </ThemeIcon>
                        <Text
                            size="lg"
                            fw={500}
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
            size="sm"
            p={0}
            h="100vh"
            style={{display: 'flex', flexDirection: 'column'}}
        >
            {/* Header */}
            <Box
                p="md"
                style={(theme) => ({
                    borderBottom: `1px solid ${theme.colors.gray[2]}`,
                    backgroundColor: 'white',
                })}
            >
                <Stack gap="md">
                    {/* Top row */}
                    <Group
                        justify="space-between"
                        align="center"
                    >
                        <Group gap="sm">
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="lg"
                                onClick={() => navigate('/dashboard')}
                                aria-label="Go back"
                                style={{
                                    minWidth: 44,
                                    minHeight: 44,
                                }}
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
                                    variant="filled"
                                    color="blue"
                                    size="sm"
                                >
                                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                                </Badge>
                            )}
                        </Group>

                        <ActionIcon
                            variant="light"
                            size="lg"
                            onClick={() => setSearchOpen(true)}
                            aria-label="Search chats"
                        >
                            <IconSearch size={20} />
                        </ActionIcon>
                    </Group>

                    {/* Quick search */}
                    <TextInput
                        placeholder="Quick search by name..."
                        leftSection={<IconSearch size={16} />}
                        value={quickSearch}
                        onChange={(e) => setQuickSearch(e.currentTarget.value)}
                        variant="filled"
                        radius="md"
                    />

                    {/* Stats */}
                    <Group
                        gap="lg"
                        justify="center"
                    >
                        <Group gap="xs">
                            <ThemeIcon
                                size="sm"
                                variant="light"
                                color="blue"
                            >
                                <IconMessageCircle size={12} />
                            </ThemeIcon>
                            <Text
                                size="sm"
                                c="dimmed"
                            >
                                {chats.length} chats
                            </Text>
                        </Group>

                        <Group gap="xs">
                            <ThemeIcon
                                size="sm"
                                variant="light"
                                color="green"
                            >
                                <IconUsers size={12} />
                            </ThemeIcon>
                            <Text
                                size="sm"
                                c="dimmed"
                            >
                                {chats.filter((chat) => chat.client).length} online
                            </Text>
                        </Group>

                        {totalUnreadCount > 0 && (
                            <Group gap="xs">
                                <ThemeIcon
                                    size="sm"
                                    variant="light"
                                    color="orange"
                                >
                                    <IconClock size={12} />
                                </ThemeIcon>
                                <Text
                                    size="sm"
                                    c="dimmed"
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
                style={{flex: 1}}
                type="scroll"
                scrollbarSize={6}
                offsetScrollbars
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
                                size="xl"
                                variant="light"
                                color="gray"
                            >
                                <IconMessageCircle size={32} />
                            </ThemeIcon>
                            <Text
                                size="lg"
                                fw={500}
                                c="dimmed"
                            >
                                {quickSearch || debouncedQuickSearch ? 'No chats found' : 'No chats yet'}
                            </Text>
                            <Text
                                c="dimmed"
                                ta="center"
                                size="sm"
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
                                <ChatListRow chat={chat} />
                                {index < chats.length - 1 && <Divider mx="md" />}
                            </React.Fragment>
                        ))}

                        {/* Load more */}
                        {hasNextPage && (
                            <Box p="md">
                                <Button
                                    variant="light"
                                    fullWidth
                                    onClick={handleLoadMore}
                                    loading={isFetchingNextPage}
                                    leftSection={<IconClock size={16} />}
                                >
                                    {isFetchingNextPage ? 'Loading...' : 'Load More Chats'}
                                </Button>
                            </Box>
                        )}

                        {/* End of list indicator */}
                        {!hasNextPage && chats.length > 10 && (
                            <Center p="md">
                                <Text
                                    size="sm"
                                    c="dimmed"
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
                opened={searchOpen}
                onClose={() => setSearchOpen(false)}
            />
        </Container>
    );
}
