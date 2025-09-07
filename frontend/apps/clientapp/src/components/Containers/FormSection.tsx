import React, {PropsWithChildren} from 'react';
import {Stack, Text, Divider, useMantineTheme, Title} from '@mantine/core';

interface Props extends PropsWithChildren {
    label?: string;
}

export const FormSection: React.FC<Props> = ({label, children}) => {
    const theme = useMantineTheme();
    return (
        <Stack
            gap="xs"
            p={'sm'}
            my={'md'}
            style={{
                border: `${theme.colors.gray['3']} 1px solid`,
                borderRadius: theme.radius.md,
            }}
        >
            {label && (
                <>
                    {' '}
                    <Text
                        tt="uppercase"
                        c="gray"
                        size={'sm'}
                        fw="bold"
                    >
                        {label}
                    </Text>
                </>
            )}
            <Stack
                gap={'sm'}
                py={'xs'}
            >
                {children}
            </Stack>
        </Stack>
    );
};
