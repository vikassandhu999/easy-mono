import {
    ActionIcon,
    Box,
    Button,
    Checkbox,
    Chip,
    Divider,
    Drawer,
    Group,
    ScrollArea,
    Stack,
    Text,
    TextInput,
} from '@mantine/core';
import {useDebouncedCallback} from '@mantine/hooks';
import {MagnifyingGlassIcon, XIcon} from '@phosphor-icons/react';
import {useMutation} from '@tanstack/react-query';
import {FC, useEffect, useMemo, useState} from 'react';

import {ClientListItem} from '@/shared/ClientListItem/ClientListItem';
import {FixedBottom} from '@/shared/containers/FixedBottom';
import {Client, useListClientsInfiniteQuery} from '@/store/services/clients';

import HeadingContainer from '../containers/HeaderContainer';
import PaddingContainer from '../containers/PaddingContainer';
import Header from '../layouts/Header';
import RecordsList from '../layouts/RecordsList';

interface ClientCardProps {
    client: Client;
    isSelected: boolean;
    multiple?: boolean;
    onToggleSelect: (id: string) => void;
}

const ClientCard = ({client, isSelected, multiple = true, onToggleSelect}: ClientCardProps) => {
    return (
        <Box
            style={{
                position: 'relative',
                backgroundColor: isSelected ? 'var(--mantine-color-blue-0)' : 'transparent',
                borderRadius: 8,
                transition: 'background-color 200ms ease',
            }}
        >
            {multiple && (
                <Box
                    style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 10,
                    }}
                >
                    <Checkbox
                        checked={isSelected}
                        color="blue"
                        onChange={() => onToggleSelect(client.id)}
                        onClick={(e) => e.stopPropagation()}
                        size="sm"
                    />
                </Box>
            )}
            <Box style={{paddingLeft: multiple ? 40 : 0}}>
                <ClientListItem
                    client={client}
                    onSelect={onToggleSelect}
                    withArrow={!multiple}
                />
            </Box>
        </Box>
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
                            radius="xl"
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
                data-autofocus={false}
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

    const {data, fetchNextPage, isFetchingNextPage, isLoading} = useListClientsInfiniteQuery({
        page_size: 20,
        search: searchTerm,
    });

    const clients = useMemo(() => {
        if (!data) return [];
        return data.pages.flatMap((page) => page.records);
    }, [data]);

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

            // If single select, trigger complete immediately
            if (!multiple) {
                const selectedClients = clients.filter((c) => c.id === id);
                onComplete?.(selectedClients);
            }
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
        <PaddingContainer>
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
        </PaddingContainer>
    );
}

interface ClientSelectDrawerProps extends ClientSelectProps {
    close: () => void;
    open: () => void;
    opened: boolean;
}

export const ClientSelectDrawer: FC<ClientSelectDrawerProps> = ({opened, close, ...clientSelectProps}) => {
    return (
        <Drawer
            onClose={close}
            opened={opened}
            position="right"
            size="md"
            withCloseButton={false}
        >
            <HeadingContainer>
                <Header
                    onBack={close}
                    showTitle
                    title="Select Client"
                />
            </HeadingContainer>
            <ClientSelect {...clientSelectProps} />
        </Drawer>
    );
};
