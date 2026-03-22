import {MantineProvider} from '@mantine/core';
import {ModalsProvider} from '@mantine/modals';
import {Notifications} from '@mantine/notifications';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import AuthProvider from '@/providers/AuthProvider';
import {theme} from '@/theme';

import AppRouterProvider from './Router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  return (
    <MantineProvider theme={theme}>
      <Notifications position={'top-center'} />
      <ModalsProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppRouterProvider />
          </AuthProvider>
        </QueryClientProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}

export default App;
