import {Box} from '@mantine/core';
import {PropsWithChildren} from 'react';

export default function PagePaper({children}: PropsWithChildren) {
    return (
        <Box
            style={{
                minHeight: '90vh',
                backgroundColor: 'white',
            }}
        >
            {children}
        </Box>
    );
}
