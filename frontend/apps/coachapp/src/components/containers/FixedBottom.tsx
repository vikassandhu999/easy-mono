import React, {useLayoutEffect} from 'react';
import {Button, Box, useMantineTheme} from '@mantine/core';
import {useKeyboardVisible} from '@/hooks/useKeyboardVisible';
import PaddingContainer from './PaddingContainer';
import {IconArrowRight} from '@tabler/icons-react';

interface Props {
    isSubmitting?: boolean;
    onSubmit?: () => void;
    withArrow?: boolean;
    label: string;
}

export const FixedBottom: React.FC<Props> = ({label, onSubmit, isSubmitting = false, withArrow = false}) => {
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
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'white',
                borderTop: `1px solid ${theme.colors.gray[3]}`,
                padding: theme.spacing.sm,
                paddingTop: theme.spacing.sm,
                boxShadow: theme.shadows.xs,
                zIndex: 999,
                display: isKeyboardVisible ? 'none' : 'block',
                paddingBottom: ` calc(var(--ce-size-md) + env(safe-area-inset-bottom))`,
            }}
        >
            <PaddingContainer>
                <Button
                    fullWidth
                    onClick={onSubmit}
                    loading={isSubmitting}
                    rightSection={withArrow ? <IconArrowRight /> : null}
                    size={'lg'}
                    radius={9999}
                    type={onSubmit ? 'button' : 'submit'}
                >
                    {label}
                </Button>
            </PaddingContainer>
        </Box>
    );
};
