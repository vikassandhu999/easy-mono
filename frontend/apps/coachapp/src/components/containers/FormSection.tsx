import {Stack, Text} from '@mantine/core';
import React, {PropsWithChildren} from 'react';

interface Props extends PropsWithChildren {
    label?: string;
}

export const FormSection: React.FC<Props> = ({children, label}) => {
    return (
        <Stack
            gap="md"
            pt={'var(--ce-size-sm)'}
        >
            {label && (
                <Text
                    style={{
                        color: 'var(--mantine-color-dimmed)',
                        fontSize: 'var(--heading-font-size)',
                        fontWeight: 600,
                        lineHeight: 'var(--heading-line-height)',
                    }}
                >
                    {label}
                </Text>
            )}
            <Stack gap="sm">{children}</Stack>
        </Stack>
    );
};
