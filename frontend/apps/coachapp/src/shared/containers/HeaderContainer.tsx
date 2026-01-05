import {Box, MantineColor, useMantineTheme} from '@mantine/core';
import {PropsWithChildren} from 'react';

import PageContentWrapper from '../../components/PageContentWrapper';

type Props = PropsWithChildren & {
  bg?: MantineColor;
  ref?: React.Ref<HTMLDivElement>;
  style?: React.CSSProperties;
  withBorder?: boolean;
  sticky?: boolean;
};

export default function HeadingContainer({
  bg = 'white',
  children,
  ref,
  style,
  withBorder = false,
  sticky = false,
}: Props) {
  const theme = useMantineTheme();

  return (
    <Box
      bg={bg}
      ref={ref}
      style={{
        borderBottom: withBorder ? `1px solid ${theme.colors.gray[2]}` : undefined,
        position: sticky ? 'sticky' : 'relative',
        top: 0,
        width: '100%',
        zIndex: 100,
      }}
    >
      <PageContentWrapper
        style={{
          paddingBlock: 'var(--ce-size-sm)',
          paddingInline: 'var(--ce-size-md)',
          paddingBottom: 0,
          ...style,
        }}
      >
        {children}
      </PageContentWrapper>
    </Box>
  );
}
