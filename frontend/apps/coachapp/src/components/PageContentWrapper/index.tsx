import {Container, MantineSpacing} from '@mantine/core';
import {PropsWithChildren} from 'react';

type Props = PropsWithChildren & {
    mb?: MantineSpacing;
    px?: MantineSpacing;
    py?: MantineSpacing;
    ref?: React.Ref<HTMLDivElement>;
    style?: React.CSSProperties;
};

export default function PageContentWrapper({children, mb, px, py, ref, style}: Props) {
    return (
        <Container
            mb={mb ?? 0}
            pb={py}
            px={px}
            ref={ref}
            size="md"
            style={style}
        >
            {children}
        </Container>
    );
}
