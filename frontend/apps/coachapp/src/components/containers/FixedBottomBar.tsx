import {Box, useMantineTheme} from '@mantine/core';
import React, {PropsWithChildren, useLayoutEffect} from 'react';

import {useKeyboardVisible} from '@/hooks/useKeyboardVisible';

import PaddingContainer from './PaddingContainer';

export const FixedBottomBar: React.FC<PropsWithChildren> = ({children}) => {
    const theme = useMantineTheme();
    const isKeyboardVisible = useKeyboardVisible();

    const ref = React.useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (ref.current) {
            const height = ref.current.getBoundingClientRect().height;
            document.body.style.setProperty('--ce-appbar-height', `calc(${height}px)`);
        }

        console.log();

        return () => {
            document.body.style.removeProperty('--ce-appbar-height');
        };
    }, [isKeyboardVisible]);

    return (
        <Box
            ref={ref}
            style={{
                backgroundColor: 'white',
                borderTop: `1px solid ${theme.colors.gray[3]}`,
                bottom: 0,
                boxShadow: theme.shadows.xs,
                display: isKeyboardVisible ? 'none' : 'block',
                left: 0,
                padding: theme.spacing.sm,
                paddingBottom: ` calc(var(--ce-size-md) + env(safe-area-inset-bottom))`,
                paddingTop: theme.spacing.sm,
                position: 'fixed',
                right: 0,
                zIndex: 999,
            }}
        >
            <PaddingContainer>{children}</PaddingContainer>
        </Box>
    );
};
