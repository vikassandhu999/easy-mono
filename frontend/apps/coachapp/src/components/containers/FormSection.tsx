import React, {PropsWithChildren} from 'react';
import {Stack, Text} from '@mantine/core';

interface Props extends PropsWithChildren {
    label?: string;
}

export const FormSection: React.FC<Props> = ({label, children}) => {
    return (
        <Stack
            gap="md"
            pt={'var(--heading-offset)'}
        >
            {label && (
                <Text
                    style={{
                        fontSize: 'var(--heading-font-size)',
                        lineHeight: 'var(--heading-line-height)',
                        fontWeight: 600,
                        color: 'var(--mantine-color-dimmed)',
                    }}
                >
                    {label}
                </Text>
            )}
            <Stack gap={0}>{children}</Stack>
        </Stack>
    );
};
