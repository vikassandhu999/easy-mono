import React, {useEffect, useMemo, useState} from 'react';
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
import {useDebouncedValue} from '@/hooks/useDebouncedValue';
import {useChats} from '@/hooks/useChatsQueries';
import ChatListRow from './ChatListRow';

interface ChatSearchDialogProps {
    opened: boolean;
    onClose: () => void;
}

export default function ChatSearchDialog({opened, onClose}: ChatSearchDialogProps) {
    const [searchText, setSearchText] = useState('');
    const [debouncedSearchText] = useDebouncedValue(searchText, 300);

    const {data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error} = useChats(
        debouncedSearchText,
        opened,
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
            opened={opened}
            onClose={onClose}
            title={null}
            size="sm"
            fullScreen
            radius={0}
            withCloseButton={false}
            styles={{
                content: {
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100vh',
                },
                body: {
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 0,
                },
            }}
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
                    <Group
                        justify="space-between"
                        align="center"
                    >
                        <Text
                            fw={600}
                            size="lg"
                        >
                            Search Chats
                        </Text>
                        <ActionIcon
                            variant="subtle"
                            size="lg"
                            onClick={onClose}
                            aria-label="Close search"
                        >
                            <IconX size={20} />
                        </ActionIcon>
                    </Group>

                    <TextInput
                        placeholder="Search by client name..."
                        leftSection={<IconSearch size={16} />}
                        rightSection={
                            searchText && (
                                <ActionIcon
                                    variant="subtle"
                                    onClick={() => setSearchText('')}
                                    size="sm"
                                >
                                    <IconX size={12} />
                                </ActionIcon>
                            )
                        }
                        value={searchText}
                        onChange={(e) => setSearchText(e.currentTarget.value)}
                        variant="filled"
                        radius="md"
                        size="md"
                    />

                    {/* Search stats */}
                    {debouncedSearchText && (
                        <Group
                            gap="xs"
                            justify="center"
                        >
                            <Text
                                size="sm"
                                c="dimmed"
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
                style={{flex: 1}}
                type="scroll"
                scrollbarSize={6}
                offsetScrollbars
            >
                {isLoading && !chats.length ? (
                    <Center h="200px">
                        <Stack
                            align="center"
                            gap="md"
                        >
                            <Loader size="md" />
                            <Text
                                size="sm"
                                c="dimmed"
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
                                size="xl"
                                variant="light"
                                color="red"
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
                                variant="light"
                                size="sm"
                                onClick={() => window.location.reload()}
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
                                size="xl"
                                variant="light"
                                color="blue"
                            >
                                <IconSearch size={32} />
                            </ThemeIcon>
                            <Text
                                size="lg"
                                fw={500}
                                c="dimmed"
                            >
                                Search your chats
                            </Text>
                            <Text
                                c="dimmed"
                                ta="center"
                                size="sm"
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
                                No chats found
                            </Text>
                            <Text
                                c="dimmed"
                                ta="center"
                                size="sm"
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
                                    chat={chat}
                                    onClick={handleChatClick}
                                />
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
                                    {isFetchingNextPage ? 'Loading...' : 'Load More Results'}
                                </Button>
                            </Box>
                        )}

                        {/* End of results */}
                        {!hasNextPage && chats.length > 10 && (
                            <Center p="md">
                                <Text
                                    size="sm"
                                    c="dimmed"
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
