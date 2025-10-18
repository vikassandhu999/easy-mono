import {Box, Card, Center, Group, Stack, Text, TextInput} from '@mantine/core';
import {useDebouncedCallback} from '@mantine/hooks';
import {BookOpenIcon, MagnifyingGlassIcon} from '@phosphor-icons/react';
import {IconPlus} from '@tabler/icons-react';
import {useMutation} from '@tanstack/react-query';
import {useEffect, useState} from 'react';

import {Session} from '@/api/sessions';
import {FixedBottom} from '@/components/containers/FixedBottom';
import {useListSessionsQuery} from '@/store/services/sessionsApi';

import RecordsList from '../layouts/RecordsList';
import SessionListItem from './SessionListItem';

interface SessionSelectProps {
    multiple?: boolean;
    onCreateNew?: () => void;
    onSelect: (selected: string | string[]) => PromiseLike<void>;
    selectedIds?: string[];
    sessionType?: Session['session_type'];
}

const SessionSelect = ({multiple, onCreateNew, onSelect, selectedIds, sessionType}: SessionSelectProps) => {
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
        <Stack gap="md">
            {onCreateNew && (
                <Card
                    aria-label="Create new custom session"
                    onClick={() => onCreateNew()}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onCreateNew();
                        }
                    }}
                    p="sm"
                    radius="xl"
                    role="button"
                    style={{
                        backgroundColor: 'var(--mantine-color-brand-0)',
                        border: '2px dashed var(--mantine-color-brand-3)',
                        cursor: 'pointer',
                        transition: 'all 200ms ease',
                    }}
                    styles={{
                        root: {
                            '&:hover': {
                                backgroundColor: 'var(--mantine-color-brand-1)',
                                borderColor: 'var(--mantine-color-brand-4)',
                                transform: 'scale(1.01)',
                            },
                            '&:active': {
                                transform: 'scale(0.99)',
                            },
                        },
                    }}
                    tabIndex={0}
                >
                    <Group
                        align="center"
                        gap="sm"
                        wrap="nowrap"
                    >
                        <Center
                            h={36}
                            style={{
                                backgroundColor: 'var(--mantine-color-brand-2)',
                                borderRadius: 6,
                                flexShrink: 0,
                            }}
                            w={36}
                        >
                            <IconPlus
                                color={'var(--mantine-color-brand-6)'}
                                size={18}
                            />
                        </Center>
                        <Box style={{flex: 1, minWidth: 0}}>
                            <Text
                                fw={600}
                                lineClamp={1}
                                size="sm"
                                style={{
                                    color: 'var(--mantine-color-gray-9)',
                                }}
                            >
                                Create {sessionType}
                            </Text>
                            <Text
                                c="dimmed"
                                lineClamp={1}
                                size="xs"
                            >
                                Custom {sessionType} with your content
                            </Text>
                        </Box>
                    </Group>
                </Card>
            )}

            <Box>
                <Group
                    align="center"
                    justify="space-between"
                    mb="sm"
                >
                    <Text
                        c="dimmed"
                        fw={600}
                        size="xs"
                    >
                        {onCreateNew ? 'Or choose existing' : 'Choose session'}
                    </Text>
                    {multiple && currentSelectedIds.length > 0 && (
                        <Text
                            c="blue"
                            fw={600}
                            size="xs"
                        >
                            {currentSelectedIds.length} selected
                        </Text>
                    )}
                </Group>

                <Stack gap="sm">
                    <TextInput
                        leftSection={<MagnifyingGlassIcon size={16} />}
                        onChange={(e) => onSearchChangeDebounced(e.currentTarget.value)}
                        placeholder="Search sessions..."
                        size="sm"
                    />

                    <RecordsList
                        emptyState={
                            <Center py="lg">
                                <Stack
                                    align="center"
                                    gap="sm"
                                    maw={300}
                                    ta="center"
                                >
                                    <Box
                                        h={36}
                                        style={{
                                            alignItems: 'center',
                                            backgroundColor: 'var(--mantine-color-gray-1)',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            justifyContent: 'center',
                                        }}
                                        w={36}
                                    >
                                        <BookOpenIcon
                                            size={20}
                                            style={{opacity: 0.25}}
                                            weight="duotone"
                                        />
                                    </Box>
                                    <Text
                                        fw={600}
                                        size="sm"
                                    >
                                        No sessions
                                    </Text>
                                    <Text
                                        c="dimmed"
                                        size="xs"
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
