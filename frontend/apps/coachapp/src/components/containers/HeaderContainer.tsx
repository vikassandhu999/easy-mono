import {Box, MantineColor, MantineSpacing, useMantineTheme} from '@mantine/core';
import {PropsWithChildren} from 'react';
import PaddingContainer from './PaddingContainer';

type Props = {
    paddingY?: MantineSpacing;
    paddingX?: MantineSpacing;
    withBorder?: boolean;
    bg?: MantineColor;
    ref?: React.Ref<HTMLDivElement>;
    style?: React.CSSProperties;
} & PropsWithChildren;

export default function HeadingContainer({bg = 'white', withBorder = false, children, ref, style}: Props) {
    const theme = useMantineTheme();
    return (
        <Box
            ref={ref}
            bg={bg}
            style={{
                borderBottom: withBorder ? `1px solid ${theme.colors.gray[2]}` : undefined,
                position: 'sticky',
                top: 0,
                zIndex: 100,
                width: '100%',
            }}
        >
            <PaddingContainer style={{paddingInline: 'var(--ce-size-xs)', paddingBlock: 'var(--ce-size-sm)', ...style}}>
                {children}
            </PaddingContainer>
        </Box>
    );
}
