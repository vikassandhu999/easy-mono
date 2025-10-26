import {Box, Button, Center, Group, Stack, Text, TextInput, useMantineTheme} from '@mantine/core';
import {useDebouncedCallback} from '@mantine/hooks';
import {BookOpenIcon, MagnifyingGlassIcon} from '@phosphor-icons/react';
import {IconPlus} from '@tabler/icons-react';
import {useMutation} from '@tanstack/react-query';
import {useEffect, useState} from 'react';

import {FixedBottom} from '@/shared/containers/FixedBottom';
import {Session, useListSessionsQuery} from '@/store/services/session';

import RecordsList from '../layouts/RecordsList';
import SessionListItem from './SessionListItem';

interface SessionSelectProps {
    multiple?: boolean;
    onCreateNew?: () => void;
    onSelect: (selected: string | string[]) => void;
    selectedIds?: string[];
    sessionType?: Session['session_type'];
}

const SessionSelect = ({multiple, onCreateNew, onSelect, selectedIds, sessionType}: SessionSelectProps) => {
    const theme = useMantineTheme();
    const [searchTerm, setSearchTerm] = useState('');
    const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>(selectedIds ?? []);
    const onSearchChangeDebounced = useDebouncedCallback(setSearchTerm, 300);

    // TODO: Convert back to infinite query when RTK Query infinite query is working
    const {data, isLoading} = useListSessionsQuery({
        search: searchTerm,
        session_type: sessionType ?? undefined,
    });
    const fetchNextPage = () => {};
    const isFetchingNextPage = false;

    const save = useMutation({
        mutationFn: async () => onSelect(internalSelectedIds),
    });

    const sessions = data?.records || [];

    useEffect(() => {
        if (!selectedIds) return;
        setInternalSelectedIds(selectedIds);
    }, [selectedIds]);

    const currentSelectedIds = selectedIds?.length ? selectedIds : internalSelectedIds;

    const handleSelect = (id: string) => {
        // For single-select mode, immediately call onSelect and return
        if (!multiple) {
            onSelect(id);
            return;
        }

        // For multi-select mode, toggle the selection in internal state
        if (currentSelectedIds.includes(id)) {
            const newSelectedIds = currentSelectedIds.filter((selectedId) => selectedId !== id);
            setInternalSelectedIds(newSelectedIds);
        } else {
            const newSelectedIds = [...currentSelectedIds, id];
            setInternalSelectedIds(newSelectedIds);
        }
    };

    return (
        <Stack gap="lg">
            {onCreateNew && (
                <Button
                    fullWidth
                    leftSection={<IconPlus size={18} />}
                    onClick={() => onCreateNew()}
                    radius="lg"
                    size="lg"
                    variant="light"
                >
                    Create {sessionType}
                </Button>
            )}

            <Box>
                <Group
                    align="center"
                    justify="space-between"
                    mb="md"
                >
                    <Text
                        c="dimmed"
                        fw={600}
                        size="sm"
                    >
                        {onCreateNew ? 'Or choose existing' : 'Choose session'}
                    </Text>
                    {multiple && currentSelectedIds.length > 0 && (
                        <Text
                            c="blue"
                            fw={600}
                            size="sm"
                        >
                            {currentSelectedIds.length} selected
                        </Text>
                    )}
                </Group>

                <Stack gap="md">
                    <TextInput
                        leftSection={<MagnifyingGlassIcon size={18} />}
                        onChange={(e) => onSearchChangeDebounced(e.currentTarget.value)}
                        placeholder="Search sessions..."
                        size="md"
                    />

                    <RecordsList
                        emptyState={
                            <Center py="xl">
                                <Stack
                                    align="center"
                                    gap="md"
                                    maw={300}
                                    ta="center"
                                >
                                    <Box
                                        h={48}
                                        style={{
                                            alignItems: 'center',
                                            backgroundColor: theme.colors.gray[1],
                                            borderRadius: '50%',
                                            display: 'flex',
                                            justifyContent: 'center',
                                        }}
                                        w={48}
                                    >
                                        <BookOpenIcon
                                            size={24}
                                            style={{opacity: 0.25}}
                                            weight="duotone"
                                        />
                                    </Box>
                                    <Text
                                        fw={600}
                                        size="md"
                                    >
                                        No sessions
                                    </Text>
                                    <Text
                                        c="dimmed"
                                        size="sm"
                                    >
                                        {searchTerm ? `No results for "${searchTerm}"` : 'Create your first session'}
                                    </Text>
                                </Stack>
                            </Center>
                        }
                        fetchNextPage={fetchNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                        isLoading={isLoading}
                        records={sessions}
                        renderItem={(session) => (
                            <SessionListItem
                                isSelected={currentSelectedIds.includes((session as Session).id)}
                                key={(session as Session).id}
                                onToggle={handleSelect}
                                session={session as Session}
                            />
                        )}
                    />
                </Stack>
            </Box>
            {multiple && currentSelectedIds.length ? (
                <FixedBottom
                    isSubmitting={save.isPending}
                    label={`${currentSelectedIds.length} selected`}
                    onSubmit={() => save.mutate()}
                />
            ) : null}
        </Stack>
    );
};

export default SessionSelect;
