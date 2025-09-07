import {Button, Group, Stack, TextInput, Title} from '@mantine/core';
import {useDebouncedCallback} from '@mantine/hooks';
import {PlusIcon} from '@phosphor-icons/react';
import HeadingContainer from '@/Components/Containers/HeaderContainer';
import React from 'react';
import Header from '@/Components/layouts/Header';

type PlansPageProps = {
    onSearchChange?: (search: string) => void;
    isLoading?: boolean;
    ref?: React.Ref<HTMLDivElement>;
    onCreateClick?: () => void;
};

export default function PlansListHeader({onSearchChange, ref, onCreateClick}: PlansPageProps) {
    const onSearchChangeDebounced = useDebouncedCallback(onSearchChange, 300);

    return (
        <HeadingContainer
            ref={ref}
            style={{
                paddingInline: 'var(--ce-size-lg)',
                paddingBlock: 'var(--ce-size-md)',
            }}
        >
            <Stack gap="md">
                <Header
                    title={'Plans'}
                    actions={
                        <Button
                            size={'sm'}
                            radius={9999}
                            onClick={onCreateClick}
                            leftSection={<PlusIcon size={18} />}
                        >
                            Create
                        </Button>
                    }
                />

                <TextInput
                    placeholder="Search..."
                    onChange={(e) => onSearchChangeDebounced(e.currentTarget.value)}
                    size={'md'}
                    m={0}
                    styles={{
                        root: {flex: 1},
                        input: {
                            borderRadius: 'var(--body-offset)',
                        },
                    }}
                />
            </Stack>
        </HeadingContainer>
    );
}
