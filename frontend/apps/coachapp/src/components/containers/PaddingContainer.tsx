import {Container, MantineSpacing} from '@mantine/core';
import {PropsWithChildren} from 'react';

type Props = {
    paddingY?: MantineSpacing;
    paddingX?: MantineSpacing;
    marginBottom?: MantineSpacing;
    ref?: React.Ref<HTMLDivElement>;
    style?: React.CSSProperties;
} & PropsWithChildren;

export default function PaddingContainer({paddingY, paddingX, marginBottom, children, ref, style}: Props) {
    return (
        <Container
            ref={ref}
            size="lg"
            px={paddingX}
            py={paddingY}
            mb={marginBottom ?? 0}
            style={style}
        >
            {children}
        </Container>
    );
}
