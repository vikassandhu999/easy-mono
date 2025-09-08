import {MantineProvider} from '@mantine/core';
import {ModalsProvider} from '@mantine/modals';
import {Notifications} from '@mantine/notifications';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import {AppProvider} from '@/providers/AppProvider';
import AuthProvider from '@/providers/AuthProvider';
import {DrawerStackProvider} from '@/providers/StackProvider';

import AppRouterProvider from './Router.tsx';
import {theme} from './theme/index';

const queryClient = new QueryClient({defaultOptions: {queries: {staleTime: 5 * 60 * 1000}}});

function App() {
    return (
        <MantineProvider theme={theme}>
            <Notifications position={'top-center'} />
            <ModalsProvider>
                <QueryClientProvider client={queryClient}>
                    <AuthProvider>
                        <DrawerStackProvider>
                            <AppProvider>
                                <AppRouterProvider />
                            </AppProvider>
                        </DrawerStackProvider>
                    </AuthProvider>
                </QueryClientProvider>
            </ModalsProvider>
        </MantineProvider>
    );
}

export default App;
