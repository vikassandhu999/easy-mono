import {Box, Card, Center, Group, Stack, Text, TextInput} from '@mantine/core';
import {useDebouncedCallback} from '@mantine/hooks';
import {BookOpenIcon, MagnifyingGlassIcon} from '@phosphor-icons/react';
import {IconPlus} from '@tabler/icons-react';
import {useMutation} from '@tanstack/react-query';
import {useEffect, useState} from 'react';

import {SessionDef} from '@/api/session_defs.ts';
import {FixedBottom} from '@/components/containers/FixedBottom';
import {useListSessionDefsQuery} from '@/store/services/sessionDefsApi';

import RecordsList from '../layouts/RecordsList';
import SessionDefItem from './SessionItem';

interface SessionSelectProps {
    multiple?: boolean;
    onCreateNew?: () => void;
    onSelect: (selected: string | string[]) => PromiseLike<void>;
    selectedIds?: string[];
    sessionType: SessionDef['session_type'];
}

const SessionSelect = ({multiple, onCreateNew, onSelect, selectedIds, sessionType}: SessionSelectProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>(selectedIds ?? []);
    const onSearchChangeDebounced = useDebouncedCallback(setSearchTerm, 300);
    // TODO: Convert back to infinite query when RTK Query infinite query is working
    const {data, isLoading} = useListSessionDefsQuery({
        search: searchTerm,
        session_type: sessionType,
    });
    const fetchNextPage = () => {}; // Placeholder
    const isFetchingNextPage = false; // Placeholder

    const save = useMutation({
        mutationFn: async () => {
            return onSelect(internalSelectedIds);
        },
    });

    const sessionDefs = data?.records || [];

    // Sync external selectedIds changes
    useEffect(() => {
        if (!selectedIds) return;
        setInternalSelectedIds(selectedIds);
    }, [selectedIds]);

    // Use external selectedIds if provided, otherwise use internal state
    const currentSelectedIds = selectedIds?.length ? selectedIds : internalSelectedIds;

    const handleSelect = (id: string) => {
        if (currentSelectedIds.includes(id)) {
            // Deselect if already selected
            const newSelectedIds = currentSelectedIds.filter((selectedId) => selectedId !== id);
            setInternalSelectedIds(newSelectedIds);
        } else {
            // Add to selection
            const newSelectedIds = [...currentSelectedIds, id];
            setInternalSelectedIds(newSelectedIds);
        }
        if (!multiple) {
            save.mutate();
        }
    };

    return (
        <Stack gap={'md'}>
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
                    role="button"
                    styles={{
                        root: {
                            backgroundColor: 'var(--mantine-color-brand-0)',
                            border: '2px dashed var(--mantine-color-brand-3)',
                            borderRadius: 'var(--body-offset)',
                            cursor: 'pointer',
                            paddingBottom: 'var(--ce-size-md)',
                            paddingInline: 'var(--ce-size-md)',
                            paddingTop: 'var(--body-offset)',
                        },
                    }}
                    tabIndex={0}
                >
                    <Group
                        align="center"
                        gap="md"
                        wrap="nowrap"
                    >
                        <Center
                            h={40}
                            style={{
                                backgroundColor: 'var(--mantine-color-brand-2)',
                                borderRadius: 8,
                                flexShrink: 0,
                            }}
                            w={40}
                        >
                            <IconPlus
                                color={'var(--mantine-color-brand-6)'}
                                size={20}
                            />
                        </Center>
                        <Box style={{flex: 1, minWidth: 0}}>
                            <Text
                                c={'dark'}
                                style={{
                                    color: 'var(--mantine-color-gray-9)',
                                    fontSize: 'var(--body-font-size)',
                                    fontWeight: 600,
                                    lineHeight: 'var(--body-line-height)',
                                }}
                            >
                                Create new {sessionType}
                            </Text>
                            <Text
                                c={'dark'}
                                style={{
                                    color: 'var(--mantine-color-gray-9)',
                                    fontSize: 'var(--callout-font-size)',
                                    fontWeight: 400,
                                    lineHeight: 'var(--callout-line-height)',
                                }}
                            >
                                Define a custom {sessionType} with your own content
                            </Text>
                        </Box>
                    </Group>
                </Card>
            )}

            <Box>
                <Group
                    align="center"
                    justify="space-between"
                    mb="md"
                >
                    <Text
                        fw={600}
                        size={'sm'}
                        style={{color: 'var(--mantine-color-gray-7)'}}
                    >
                        Or choose from existing library
                    </Text>
                    {multiple && currentSelectedIds.length > 0 && (
                        <Text
                            size="sm"
                            style={{
                                color: 'var(--mantine-color-blue-6)',
                                fontWeight: 600,
                            }}
                        >
                            {currentSelectedIds.length} selected
                        </Text>
                    )}
                </Group>

                <Stack gap="md">
                    {/* Mobile-First Search Bar */}
                    <TextInput
                        leftSection={
                            <MagnifyingGlassIcon
                                color="var(--mantine-color-gray-5)"
                                size={18}
                            />
                        }
                        onChange={(e) => onSearchChangeDebounced(e.currentTarget.value)}
                        placeholder="Search sessions..."
                        size={'md'}
                        styles={{
                            input: {
                                '&:focus': {
                                    borderColor: 'var(--mantine-color-brand-5)',
                                    boxShadow: '0 0 0 1px var(--mantine-color-brand-5)',
                                },
                                borderColor: 'var(--mantine-color-gray-3)',
                            },
                        }}
                    />

                    <RecordsList
                        emptyState={
                            <Center py="xl">
                                <Stack
                                    align="center"
                                    gap="md"
                                    maw={320}
                                    ta="center"
                                >
                                    <Box
                                        h={48}
                                        style={{
                                            alignItems: 'center',
                                            backgroundColor: 'var(--mantine-color-gray-1)',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            justifyContent: 'center',
                                        }}
                                        w={48}
                                    >
                                        <BookOpenIcon
                                            color="var(--mantine-color-gray-5)"
                                            size={24}
                                        />
                                    </Box>
                                    <Text
                                        fw={600}
                                        size="md"
                                        style={{color: 'var(--mantine-color-gray-8)'}}
                                    >
                                        No sessions found
                                    </Text>
                                    <Text
                                        c="dimmed"
                                        size="sm"
                                        style={{lineHeight: 1.4}}
                                    >
                                        {searchTerm
                                            ? `No sessions match "${searchTerm}"`
                                            : 'Create your first session to get started'}
                                    </Text>
                                </Stack>
                            </Center>
                        }
                        fetchNextPage={fetchNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                        isLoading={isLoading}
                        records={sessionDefs}
                        renderItem={(sessionDef) => {
                            return (
                                <SessionDefItem
                                    isSelected={currentSelectedIds.includes((sessionDef as any).id)}
                                    key={(sessionDef as any).id}
                                    onToggle={handleSelect}
                                    sessionDef={sessionDef}
                                />
                            );
                        }}
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
