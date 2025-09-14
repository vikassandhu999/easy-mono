import {
    ActionIcon,
    Avatar,
    Badge,
    Box,
    Button,
    Card,
    Checkbox,
    Chip,
    Divider,
    Group,
    ScrollArea,
    Stack,
    Text,
    TextInput,
} from '@mantine/core';
import {useDebouncedCallback} from '@mantine/hooks';
import {MagnifyingGlassIcon, XIcon} from '@phosphor-icons/react';
import {useMutation} from '@tanstack/react-query';
import {useEffect, useMemo, useState} from 'react';

import {Client} from '@/api/clients.ts';
import {FixedBottom} from '@/components/containers/FixedBottom';
import {useClients} from '@/hooks/useClientQueries';

import RecordsList from '../layouts/RecordsList';

interface ClientCardProps {
    client: Client;
    isSelected: boolean;
    multiple?: boolean;
    onToggleSelect: (id: string) => void;
}

const ClientCard = ({client, isSelected, multiple = true, onToggleSelect}: ClientCardProps) => {
    return (
        <Card
            aria-label={`${isSelected ? 'Deselect' : 'Select'} ${client.name}`}
            onClick={() => onToggleSelect(client.id)}
            p="sm"
            role="button"
            style={{
                backgroundColor: isSelected ? 'var(--mantine-color-blue-0)' : 'white',
                borderColor: isSelected ? 'var(--mantine-color-blue-4)' : 'var(--mantine-color-gray-3)',
                borderRadius: 8,
                boxShadow: isSelected ? '0 2px 8px rgba(59, 130, 246, 0.15)' : 'none',
                cursor: 'pointer',
                transform: 'scale(1)',
                transition: 'all 200ms ease',
            }}
            styles={{
                root: {
                    '&:hover': {
                        backgroundColor: isSelected ? 'var(--mantine-color-blue-1)' : 'var(--mantine-color-blue-0)',
                        borderColor: 'var(--mantine-color-blue-4)',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)',
                        transform: 'scale(1.01)',
                    },
                },
            }}
            tabIndex={0}
            withBorder
        >
            <Group
                align="center"
                gap="sm"
                wrap="nowrap"
            >
                {multiple && (
                    <Checkbox
                        checked={isSelected}
                        color="blue"
                        onChange={() => onToggleSelect(client.id)}
                        onClick={(e) => e.stopPropagation()}
                        size="sm"
                    />
                )}

                <Avatar
                    color="blue"
                    variant="light"
                />
                <Box style={{flex: 1, minWidth: 0}}>
                    <Text
                        fw={600}
                        lineClamp={1}
                        mb={2}
                        size="sm"
                        style={{lineHeight: 1.3}}
                    >
                        {client.name}
                    </Text>
                    <Text
                        c="dimmed"
                        lineClamp={2}
                        mb="xs"
                        size="xs"
                        style={{lineHeight: 1.4}}
                    >
                        {client.invitation_email || client.invitation_phone || 'No contact info'}
                    </Text>
                    <Group
                        gap="xs"
                        wrap="wrap"
                    >
                        <Badge
                            color={
                                client.membership_status === 'active'
                                    ? 'green'
                                    : client.membership_status === 'inactive'
                                      ? 'gray'
                                      : client.membership_status === 'paused'
                                        ? 'yellow'
                                        : 'red'
                            }
                            radius="sm"
                            size="xs"
                            style={{textTransform: 'capitalize'}}
                            variant="light"
                        >
                            {client.membership_status}
                        </Badge>
                        {client.assigned_coach && (
                            <Badge
                                color="blue"
                                radius="sm"
                                size="xs"
                                variant="outline"
                            >
                                Coach: {client.assigned_coach.name}
                            </Badge>
                        )}
                    </Group>
                </Box>
            </Group>
        </Card>
    );
};

interface SelectedItemsProps {
    multiple?: boolean;
    onClearAll: () => void;
    onRemove: (id: string) => void;
    selectedItems: Client[];
}

const SelectedItems = ({multiple = true, onClearAll, onRemove, selectedItems}: SelectedItemsProps) => {
    if (selectedItems.length === 0 || !multiple) return null;

    return (
        <Box>
            <Group
                align="center"
                justify="space-between"
                mb="xs"
            >
                <Text
                    fw={500}
                    size="sm"
                >
                    Selected ({selectedItems.length})
                </Text>
                <Button
                    color="gray"
                    onClick={onClearAll}
                    size="xs"
                    variant="subtle"
                >
                    Clear all
                </Button>
            </Group>
            <ScrollArea.Autosize mah={120}>
                <Group gap="xs">
                    {selectedItems.map((item) => (
                        <Chip
                            checked={true}
                            color="blue"
                            key={item.id}
                            onChange={() => onRemove(item.id)}
                            radius="sm"
                            size="sm"
                            variant="filled"
                        >
                            <Group
                                gap={4}
                                wrap="nowrap"
                            >
                                <Text
                                    size="sm"
                                    style={{maxWidth: 100}}
                                    truncate
                                >
                                    {item.name}
                                </Text>
                                <ActionIcon
                                    color="white"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove(item.id);
                                    }}
                                    size={14}
                                    variant="transparent"
                                >
                                    <XIcon size={10} />
                                </ActionIcon>
                            </Group>
                        </Chip>
                    ))}
                </Group>
            </ScrollArea.Autosize>
        </Box>
    );
};

interface SearchAndFilterProps {
    isLoading: boolean;
    multiple?: boolean;
    onSearchChange: (value: string) => void;
    resultsCount: number;
    searchTerm: string;
    selectedCount?: number;
}

const SearchAndFilter = ({
    isLoading,
    multiple = true,
    onSearchChange,
    resultsCount,
    searchTerm,
    selectedCount,
}: SearchAndFilterProps) => {
    const [searchTermState, setSearchTermState] = useState(searchTerm);
    const onSearchChangeDebounced = useDebouncedCallback(onSearchChange, 300);
    return (
        <Stack gap="sm">
            <Group
                align="center"
                justify="space-between"
            >
                <Text
                    fw={600}
                    size="sm"
                    style={{color: 'var(--mantine-color-gray-7)'}}
                >
                    Select client {multiple ? 's' : ''}
                </Text>
                {multiple && selectedCount && selectedCount > 0 && (
                    <Text
                        size="sm"
                        style={{
                            color: 'var(--mantine-color-blue-6)',
                            fontWeight: 600,
                        }}
                    >
                        {selectedCount} selected
                    </Text>
                )}
            </Group>

            <TextInput
                leftSection={<MagnifyingGlassIcon size={16} />}
                onChange={(event) => {
                    setSearchTermState(event.currentTarget.value);
                    onSearchChangeDebounced(event.currentTarget.value);
                }}
                placeholder="Search clients..."
                rightSection={
                    searchTerm && (
                        <ActionIcon
                            color="gray"
                            onClick={() => onSearchChange('')}
                            size="sm"
                            variant="subtle"
                        >
                            <XIcon size={14} />
                        </ActionIcon>
                    )
                }
                value={searchTermState}
            />

            {!isLoading && (
                <Text
                    c="dimmed"
                    size="xs"
                >
                    {resultsCount} {resultsCount === 1 ? 'client' : 'clients'} found
                </Text>
            )}
        </Stack>
    );
};

interface ClientSelectProps {
    multiple?: boolean;
    onCancel?: () => void;
    onComplete?: (clients: Client[]) => void;
    selectedIds?: string[];
}

export default function ClientSelect({multiple = true, onComplete, selectedIds}: ClientSelectProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>(selectedIds ?? []);

    const {clients, fetchNextPage, isFetchingNextPage, isLoading} = useClients({
        page_size: 20,
        search: searchTerm,
    });

    const save = useMutation({
        mutationFn: async () => {
            const selectedClients = clients.filter((client) => internalSelectedIds.includes(client.id));
            return onComplete?.(selectedClients);
        },
    });

    // Sync external selectedIds changes
    useEffect(() => {
        if (!selectedIds) return;
        setInternalSelectedIds(selectedIds);
    }, [selectedIds]);

    // Use external selectedIds if provided, otherwise use internal state
    const currentSelectedIds = selectedIds?.length ? selectedIds : internalSelectedIds;

    const selectedItems = useMemo(() => {
        return clients.filter((client) => currentSelectedIds.includes(client.id));
    }, [clients, currentSelectedIds]);

    const handleSelect = (id: string) => {
        if (currentSelectedIds.includes(id)) {
            // Deselect if already selected
            const newSelectedIds = currentSelectedIds.filter((selectedId) => selectedId !== id);
            setInternalSelectedIds(newSelectedIds);
        } else {
            // Add to selection
            const newSelectedIds = multiple ? [...currentSelectedIds, id] : [id];
            setInternalSelectedIds(newSelectedIds);
        }
        if (!multiple) {
            save.mutate();
        }
    };

    const removeFromSelection = (id: string) => {
        setInternalSelectedIds((prev) => prev.filter((item) => item !== id));
    };

    const clearAllSelection = () => {
        setInternalSelectedIds([]);
    };

    const handleComplete = () => {
        save.mutate();
    };

    return (
        <Stack>
            <SearchAndFilter
                isLoading={isLoading}
                multiple={multiple}
                onSearchChange={setSearchTerm}
                resultsCount={clients.length}
                searchTerm={searchTerm}
                selectedCount={currentSelectedIds.length}
            />

            <SelectedItems
                multiple={multiple}
                onClearAll={clearAllSelection}
                onRemove={removeFromSelection}
                selectedItems={selectedItems}
            />

            {currentSelectedIds.length > 0 && multiple && <Divider />}

            <RecordsList<Client>
                emptyState={searchTerm ? 'No clients match your search criteria' : 'No clients available'}
                fetchNextPage={fetchNextPage}
                isFetchingNextPage={isFetchingNextPage}
                isLoading={isLoading}
                records={clients}
                renderItem={(item) => (
                    <ClientCard
                        client={item}
                        isSelected={currentSelectedIds.includes(item.id)}
                        key={item.id}
                        multiple={multiple}
                        onToggleSelect={handleSelect}
                    />
                )}
            />

            {multiple && currentSelectedIds.length > 0 && (
                <FixedBottom
                    isSubmitting={save.isPending}
                    label={`${currentSelectedIds.length} selected`}
                    onSubmit={handleComplete}
                />
            )}
        </Stack>
    );
}
