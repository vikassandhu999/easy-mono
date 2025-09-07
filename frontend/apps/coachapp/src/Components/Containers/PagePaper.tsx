import {Box} from '@mantine/core';
import {PropsWithChildren} from 'react';

type Props = PropsWithChildren<{
    bottomGutter?: boolean;
    topGutter?: boolean;
}>;

export default function PagePaper({children, bottomGutter = true, topGutter = true}: Props) {
    return (
        <Box
            style={{
                minHeight: '90vh',
                backgroundColor: 'white',
                marginBottom: `calc(var(--ce-size-lg,0px) + env(safe-area-inset-bottom) + ${bottomGutter ? 'var(--ce-appbar-height,0px)' : 'var(--ce-size-md,0px)'})`,
                marginTop: topGutter ? `calc(env(safe-area-inset-top) + var(--ce-size-sm,0px))` : 0,
                paddingTop: 'env(safe-area-inset-top)',
                paddingLeft: 'env(safe-area-inset-left)',
                paddingRight: 'env(safe-area-inset-right)',
                paddingBottom: `env(safe-area-inset-bottom)`,
                boxShadow: 'var(--ce-shadow-md)',
            }}
        >
            {children}
        </Box>
    );
}
