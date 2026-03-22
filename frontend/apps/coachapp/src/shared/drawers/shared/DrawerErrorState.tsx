import {Box, Button, Stack, Text} from '@mantine/core';
import {IconAlertCircle} from '@tabler/icons-react';

type DrawerErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export const DrawerErrorState = ({
  title = 'Error',
  message = 'An error occurred while loading the data.',
  onRetry,
}: DrawerErrorStateProps) => {
  return (
    <Box
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '200px',
      }}
    >
      <Stack
        align="center"
        gap="md"
        style={{textAlign: 'center', maxWidth: '400px'}}
      >
        <IconAlertCircle
          color="var(--mantine-color-red-6)"
          size={48}
        />
        <Text
          fw={600}
          size="lg"
        >
          {title}
        </Text>
        <Text
          c="dimmed"
          size="sm"
        >
          {message}
        </Text>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="light"
          >
            Try Again
          </Button>
        )}
      </Stack>
    </Box>
  );
};

export default DrawerErrorState;
