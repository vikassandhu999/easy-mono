import {Box, MantineColor, MantineSpacing, useMantineTheme} from '@mantine/core';
import {PropsWithChildren} from 'react';

import PaddingContainer from './PaddingContainer';

type Props = PropsWithChildren & {
    bg?: MantineColor;
    ref?: React.Ref<HTMLDivElement>;
    style?: React.CSSProperties;
    withBorder?: boolean;
};

export default function HeadingContainer({bg = 'white', children, ref, style, withBorder = false}: Props) {
    const theme = useMantineTheme();
    return (
        <Box
            bg={bg}
            ref={ref}
            style={{
                borderBottom: withBorder ? `1px solid ${theme.colors.gray[2]}` : undefined,
                position: 'sticky',
                top: 0,
                width: '100%',
                zIndex: 100,
            }}
        >
            <PaddingContainer style={{paddingBlock: 'var(--ce-size-sm)', paddingInline: 'var(--ce-size-md)', ...style}}>
                {children}
            </PaddingContainer>
        </Box>
    );
}
