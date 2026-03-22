import {MantineProvider} from '@mantine/core';
import {ModalsProvider} from '@mantine/modals';
import {Notifications} from '@mantine/notifications';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import {AppProvider} from '@/providers/AppProvider';
import AuthProvider from '@/providers/AuthProvider';
import {cssVariablesResolver} from '@/theme/theme-with-css-modules.tsx';

import {theme} from '../theme/index';
import '../index.css';
import Routes from './routes.tsx';

const queryClient = new QueryClient({
  defaultOptions: {queries: {staleTime: 5 * 60 * 1000}},
});

function App() {
  return (
    <MantineProvider
      cssVariablesResolver={cssVariablesResolver}
      theme={theme}
    >
      <Notifications position={'top-center'} />
      <ModalsProvider>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
            <AuthProvider>
              <Routes />
            </AuthProvider>
          </AppProvider>
        </QueryClientProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}

export default App;
