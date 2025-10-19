import {
    ActionIcon,
    Box,
    Button,
    Center,
    Divider,
    Group,
    Loader,
    Modal,
    ScrollArea,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
} from '@mantine/core';
import {IconClock, IconMessageCircle, IconSearch, IconX} from '@tabler/icons-react';
import React, {useEffect, useMemo, useState} from 'react';

import {useDebouncedValue} from '@/hooks/useDebouncedValue';
import {useListChatsInfiniteQuery} from '@/store/services/chats';

import ChatListRow from './ChatListRow';

interface ChatSearchDialogProps {
    onClose: () => void;
    opened: boolean;
}

export default function ChatSearchDialog({onClose, opened}: ChatSearchDialogProps) {
    const [searchText, setSearchText] = useState('');
    const [debouncedSearchText] = useDebouncedValue(searchText, 300);

    const {data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListChatsInfiniteQuery(
        {
            search_text: debouncedSearchText || undefined,
        },
        {
            skip: !opened,
        },
    );

    const chats = useMemo(() => {
        return data?.pages.flatMap((p) => p.chats) ?? [];
    }, [data]);

    // Reset search when modal closes
    useEffect(() => {
        if (!opened) {
            setSearchText('');
        }
    }, [opened]);

    const handleChatClick = () => {
        onClose();
    };

    const handleLoadMore = () => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    return (
        <Modal
            fullScreen
            onClose={onClose}
            opened={opened}
            radius={0}
            size="sm"
            styles={{
                body: {
                    display: 'flex',
                    flex: 1,
                    flexDirection: 'column',
                    padding: 0,
                },
                content: {
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100vh',
                },
            }}
            title={null}
            withCloseButton={false}
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
                    <Group
                        align="center"
                        justify="space-between"
                    >
                        <Text
                            fw={600}
                            size="lg"
                        >
                            Search Chats
                        </Text>
                        <ActionIcon
                            aria-label="Close search"
                            onClick={onClose}
                            size="lg"
                            variant="subtle"
                        >
                            <IconX size={20} />
                        </ActionIcon>
                    </Group>

                    <TextInput
                        leftSection={<IconSearch size={16} />}
                        onChange={(e) => setSearchText(e.currentTarget.value)}
                        placeholder="Search by client name..."
                        radius="xl"
                        rightSection={
                            searchText && (
                                <ActionIcon
                                    onClick={() => setSearchText('')}
                                    size="sm"
                                    variant="subtle"
                                >
                                    <IconX size={12} />
                                </ActionIcon>
                            )
                        }
                        size="md"
                        value={searchText}
                        variant="filled"
                    />

                    {/* Search stats */}
                    {debouncedSearchText && (
                        <Group
                            gap="xs"
                            justify="center"
                        >
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                {isLoading
                                    ? 'Searching...'
                                    : `${chats.length} result${chats.length === 1 ? '' : 's'} found`}
                            </Text>
                        </Group>
                    )}
                </Stack>
            </Box>

            {/* Content */}
            <ScrollArea
                offsetScrollbars
                scrollbarSize={6}
                style={{flex: 1}}
                type="scroll"
            >
                {isLoading && !chats.length ? (
                    <Center h="200px">
                        <Stack
                            align="center"
                            gap="md"
                        >
                            <Loader size="md" />
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                Searching chats...
                            </Text>
                        </Stack>
                    </Center>
                ) : error ? (
                    <Center h="200px">
                        <Stack
                            align="center"
                            gap="md"
                        >
                            <ThemeIcon
                                color="red"
                                size="xl"
                                variant="light"
                            >
                                <IconMessageCircle size={24} />
                            </ThemeIcon>
                            <Text
                                c="dimmed"
                                ta="center"
                            >
                                Failed to search chats
                            </Text>
                            <Button
                                onClick={() => window.location.reload()}
                                size="sm"
                                variant="light"
                            >
                                Try again
                            </Button>
                        </Stack>
                    </Center>
                ) : !debouncedSearchText ? (
                    <Center h="300px">
                        <Stack
                            align="center"
                            gap="md"
                        >
                            <ThemeIcon
                                color="blue"
                                size="xl"
                                variant="light"
                            >
                                <IconSearch size={32} />
                            </ThemeIcon>
                            <Text
                                c="dimmed"
                                fw={500}
                                size="lg"
                            >
                                Search your chats
                            </Text>
                            <Text
                                c="dimmed"
                                size="sm"
                                ta="center"
                            >
                                Enter a client name to find your conversations
                            </Text>
                        </Stack>
                    </Center>
                ) : chats.length === 0 ? (
                    <Center h="300px">
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
                                No chats found
                            </Text>
                            <Text
                                c="dimmed"
                                size="sm"
                                ta="center"
                            >
                                Try searching with a different client name
                            </Text>
                        </Stack>
                    </Center>
                ) : (
                    <Stack gap={0}>
                        {chats.map((chat, index) => (
                            <React.Fragment key={chat.id}>
                                <ChatListRow
                                    chat={chat as any}
                                    onClick={handleChatClick}
                                />
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
                                    {isFetchingNextPage ? 'Loading...' : 'Load More Results'}
                                </Button>
                            </Box>
                        )}

                        {/* End of results */}
                        {!hasNextPage && chats.length > 10 && (
                            <Center p="md">
                                <Text
                                    c="dimmed"
                                    size="sm"
                                >
                                    End of search results
                                </Text>
                            </Center>
                        )}
                    </Stack>
                )}
            </ScrollArea>
        </Modal>
    );
}
