import {Button, Stack, TextInput} from '@mantine/core';
import {useDebouncedCallback} from '@mantine/hooks';
import {PlusIcon} from '@phosphor-icons/react';
import React from 'react';

import HeadingContainer from '@/components/containers/HeaderContainer';
import Header from '@/components/layouts/Header';

type PlansPageProps = {
    isLoading?: boolean;
    onCreateClick?: () => void;
    onSearchChange?: (search: string) => void;
    ref?: React.Ref<HTMLDivElement>;
};

export default function PlansListHeader({onCreateClick, onSearchChange, ref}: PlansPageProps) {
    const onSearchChangeDebounced = useDebouncedCallback(onSearchChange, 300);

    return (
        <HeadingContainer
            ref={ref}
            style={{
                paddingBlock: 'var(--ce-size-md)',
                paddingInline: 'var(--ce-size-lg)',
            }}
        >
            <Stack gap="md">
                <Header
                    actions={
                        <Button
                            leftSection={<PlusIcon size={18} />}
                            onClick={onCreateClick}
                            radius={9999}
                            size={'sm'}
                        >
                            Create
                        </Button>
                    }
                    title={'plans'}
                />

                <TextInput
                    m={0}
                    onChange={(e) => onSearchChangeDebounced(e.currentTarget.value)}
                    placeholder="Search..."
                    size={'md'}
                    styles={{
                        input: {
                            borderRadius: 'var(--body-offset)',
                        },
                        root: {flex: 1},
                    }}
                />
            </Stack>
        </HeadingContainer>
    );
}
