import {Box, Loader, Stack, Text} from '@mantine/core';

type DrawerLoadingStateProps = {
  message?: string;
};

export const DrawerLoadingState = ({message = 'Loading...'}: DrawerLoadingStateProps) => {
  return (
    <Box style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px'}}>
      <Stack
        align="center"
        gap="md"
      >
        <Loader size="lg" />
        <Text
          c="dimmed"
          size="sm"
        >
          {message}
        </Text>
      </Stack>
    </Box>
  );
};

export default DrawerLoadingState;
