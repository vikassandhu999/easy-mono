import {Button, Group, Stack, TextInput} from '@mantine/core';
import {useDebouncedCallback} from '@mantine/hooks';
import {IconSearch, IconUserPlus} from '@tabler/icons-react';
import React from 'react';

import HeadingContainer from '@/shared/containers/HeaderContainer';
import Header from '@/shared/layouts/Header';

type ClientsPageHeaderProps = {
    isLoading?: boolean;
    onInviteClick?: () => void;
    onSearchChange?: (search: string) => void;
    ref?: React.Ref<HTMLDivElement>;
};

export default function ClientsListHeader({onInviteClick, onSearchChange, ref}: ClientsPageHeaderProps) {
    const onSearchChangeDebounced = useDebouncedCallback(onSearchChange, 300);

    return (
        <HeadingContainer ref={ref}>
            <Stack gap="sm">
                <Header
                    actions={
                        <Group gap="xs">
                            <Button
                                leftSection={<IconUserPlus size={18} />}
                                onClick={onInviteClick}
                                radius="xl"
                                size="md"
                            >
                                Invite client
                            </Button>
                        </Group>
                    }
                    title="Clients"
                />

                <TextInput
                    aria-label="Search clients"
                    leftSection={<IconSearch size={16} />}
                    onChange={(e) => onSearchChangeDebounced(e.currentTarget.value)}
                    placeholder="Search by name or email..."
                    radius="xl"
                    size="md"
                    variant="filled"
                />
            </Stack>
        </HeadingContainer>
    );
}
