import {Center, Stack, Title} from '@mantine/core';
import {ReactNode} from 'react';

export default function EmptyState({search, status}: {search?: string; status?: any}) {
  let title = 'No clients found';
  let description: ReactNode = 'Try adjusting your search or status filter to see more clients.';

  if (search) {
    title = 'No matches found';
    description = (
      <>
        We couldn&apos;t find any clients matching &quot;
        <span style={{fontWeight: 600}}>{search}</span>&quot;.
      </>
    );
  } else if (status) {
    description = "We couldn't find any clients with that status.";
  }

  return (
    <Center my={'xl'}>
      <Stack gap={'0'}>
        <Title
          order={4}
          style={{textAlign: 'center'}}
        >
          {title}
        </Title>
        <p
          style={{
            fontSize: 'var(--ce-font-size-small)',
            lineHeight: 'var(--ce-line-height-small)',
            margin: 0,
            color: 'var(--ce-text-weak)',
            textAlign: 'center',
          }}
        >
          {description}
        </p>
      </Stack>
    </Center>
  );
}
