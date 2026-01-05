import {Title} from '@mantine/core';
import {PropsWithChildren} from 'react';

const PageTitle = ({children}: PropsWithChildren) => {
  return <Title order={4}>{children}</Title>;
};

export default PageTitle;
