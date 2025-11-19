import {MantineProvider} from '@mantine/core';
import {ModalsProvider} from '@mantine/modals';
import {Notifications} from '@mantine/notifications';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import {AppProvider} from '@/providers/AppProvider';
import AuthProvider from '@/providers/AuthProvider';

import {theme} from '../theme/index';
import AppRouterProvider from './Router.tsx';

const queryClient = new QueryClient({defaultOptions: {queries: {staleTime: 5 * 60 * 1000}}});

function App() {
    return (
        <MantineProvider theme={theme}>
            <Notifications position={'top-center'} />
            <ModalsProvider>
                <QueryClientProvider client={queryClient}>
                    <AppProvider>
                        <AuthProvider>
                            <AppRouterProvider />
                        </AuthProvider>
                    </AppProvider>
                </QueryClientProvider>
            </ModalsProvider>
        </MantineProvider>
    );
}

export default App;
