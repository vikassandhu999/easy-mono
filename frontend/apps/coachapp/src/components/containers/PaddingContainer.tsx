import {Container, MantineSpacing} from '@mantine/core';
import {PropsWithChildren} from 'react';

type Props = PropsWithChildren & {
    marginBottom?: MantineSpacing;
    paddingX?: MantineSpacing;
    paddingY?: MantineSpacing;
    ref?: React.Ref<HTMLDivElement>;
    style?: React.CSSProperties;
};

export default function PaddingContainer({children, marginBottom, paddingX, paddingY, ref, style}: Props) {
    return (
        <Container
            mb={marginBottom ?? 0}
            px={paddingX}
            py={paddingY}
            ref={ref}
            size="lg"
            style={style}
        >
            {children}
        </Container>
    );
}
