import {Center, Stack, Title} from '@mantine/core';

export default function EmptyState() {
  return (
    <Center my={'xl'}>
      <Stack gap={'0'}>
        <Title
          order={4}
          style={{textAlign: 'center'}}
        >
          No clients found
        </Title>
        <p
          style={{
            fontSize: 'var(--ce-font-size-small)',
            lineHeight: 'var(--ce-line-height-small)',
            margin: 0,
            color: 'var(--ce-text-weak)',
          }}
        >
          Try adjusting your search or status filter to see more clients.
        </p>
      </Stack>
    </Center>
  );
}
