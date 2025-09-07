import {Card, Group, Stack, TextInput, Text, Center, Box} from '@mantine/core';
import {MagnifyingGlassIcon, BookOpenIcon} from '@phosphor-icons/react';
import {useState, useEffect} from 'react';
import {useDebouncedCallback} from '@mantine/hooks';
import {IconPlus} from '@tabler/icons-react';
import {SessionDef} from '@/Api/SessionDefs';
import {useSessionDefs} from '@/Hooks/useSessionDefsQueries';
import RecordsList from '../layouts/RecordsList';
import SessionDefItem from './SessionItem';
import {FixedBottom} from '../Containers/FixedBottom';
import {useMutation} from '@tanstack/react-query';

interface SessionSelectProps {
    sessionType: SessionDef['session_type'];
    multiple?: boolean;
    onSelect: (selected: string | string[]) => PromiseLike<void>;
    selectedIds?: string[];
    onCreateNew?: () => void;
}

const SessionSelect = ({onSelect, sessionType, onCreateNew, multiple, selectedIds}: SessionSelectProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>(selectedIds ?? []);
    const onSearchChangeDebounced = useDebouncedCallback(setSearchTerm, 300);
    const {data, isLoading, fetchNextPage, isFetchingNextPage} = useSessionDefs({
        search: searchTerm,
        session_type: sessionType,
    });

    const save = useMutation({
        mutationFn: async () => {
            return onSelect(internalSelectedIds);
        },
    });

    const sessionDefs = data?.pages.flatMap((page) => page.records) || [];

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
                    styles={{
                        root: {
                            border: '2px dashed var(--mantine-color-brand-3)',
                            backgroundColor: 'var(--mantine-color-brand-0)',
                            cursor: 'pointer',
                            borderRadius: 'var(--body-offset)',
                            paddingTop: 'var(--body-offset)',
                            paddingInline: 'var(--ce-size-md)',
                            paddingBottom: 'var(--ce-size-md)',
                        },
                    }}
                    onClick={() => onCreateNew()}
                    role="button"
                    tabIndex={0}
                    aria-label="Create new custom session"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onCreateNew();
                        }
                    }}
                >
                    <Group
                        gap="md"
                        wrap="nowrap"
                        align="center"
                    >
                        <Center
                            w={40}
                            h={40}
                            style={{
                                backgroundColor: 'var(--mantine-color-brand-2)',
                                borderRadius: 8,
                                flexShrink: 0,
                            }}
                        >
                            <IconPlus
                                size={20}
                                color={'var(--mantine-color-brand-6)'}
                            />
                        </Center>
                        <Box style={{flex: 1, minWidth: 0}}>
                            <Text
                                c={'dark'}
                                style={{
                                    fontSize: 'var(--body-font-size)',
                                    lineHeight: 'var(--body-line-height)',
                                    color: 'var(--mantine-color-gray-9)',
                                    fontWeight: 600,
                                }}
                            >
                                Create new {sessionType}
                            </Text>
                            <Text
                                c={'dark'}
                                style={{
                                    fontSize: 'var(--callout-font-size)',
                                    lineHeight: 'var(--callout-line-height)',
                                    color: 'var(--mantine-color-gray-9)',
                                    fontWeight: 400,
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
                    justify="space-between"
                    align="center"
                    mb="md"
                >
                    <Text
                        size={'sm'}
                        fw={600}
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
                        placeholder="Search sessions..."
                        leftSection={
                            <MagnifyingGlassIcon
                                size={18}
                                color="var(--mantine-color-gray-5)"
                            />
                        }
                        onChange={(e) => onSearchChangeDebounced(e.currentTarget.value)}
                        size={'md'}
                        styles={{
                            input: {
                                borderColor: 'var(--mantine-color-gray-3)',
                                '&:focus': {
                                    borderColor: 'var(--mantine-color-brand-5)',
                                    boxShadow: '0 0 0 1px var(--mantine-color-brand-5)',
                                },
                            },
                        }}
                    />

                    <RecordsList
                        isLoading={isLoading}
                        isFetchingNextPage={isFetchingNextPage}
                        records={sessionDefs}
                        fetchNextPage={fetchNextPage}
                        emptyState={
                            <Center py="xl">
                                <Stack
                                    gap="md"
                                    align="center"
                                    maw={320}
                                    ta="center"
                                >
                                    <Box
                                        w={48}
                                        h={48}
                                        style={{
                                            backgroundColor: 'var(--mantine-color-gray-1)',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <BookOpenIcon
                                            size={24}
                                            color="var(--mantine-color-gray-5)"
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
                                        size="sm"
                                        c="dimmed"
                                        style={{lineHeight: 1.4}}
                                    >
                                        {searchTerm
                                            ? `No sessions match "${searchTerm}"`
                                            : 'Create your first session to get started'}
                                    </Text>
                                </Stack>
                            </Center>
                        }
                        renderItem={(sessionDef) => {
                            return (
                                <SessionDefItem
                                    key={sessionDef.id}
                                    sessionDef={sessionDef}
                                    onToggle={handleSelect}
                                    isSelected={currentSelectedIds.includes(sessionDef.id)}
                                />
                            );
                        }}
                    />
                </Stack>
            </Box>
            {multiple && currentSelectedIds.length ? (
                <FixedBottom
                    label={`${currentSelectedIds.length} selected`}
                    onSubmit={() => save.mutate()}
                    isSubmitting={save.isPending}
                />
            ) : null}
        </Stack>
    );
};

export default SessionSelect;
