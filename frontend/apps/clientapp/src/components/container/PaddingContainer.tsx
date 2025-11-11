import {Container, MantineSpacing} from '@mantine/core';
import {PropsWithChildren} from 'react';

type Props = PropsWithChildren & {
    paddingY?: MantineSpacing;
    paddingX?: MantineSpacing;
    marginBottom?: MantineSpacing;
    ref?: React.Ref<HTMLDivElement>;
    style?: React.CSSProperties;
};

export default function PaddingContainer({paddingY, paddingX, marginBottom, children, ref, style}: Props) {
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
