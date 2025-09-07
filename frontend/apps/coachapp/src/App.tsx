import {MantineProvider} from '@mantine/core';
import {Notifications} from '@mantine/notifications';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import AuthProvider from './Providers/AuthProvider';

import {AppProvider} from './Providers/AppProvider';

import {theme} from './theme/index';
import {DrawerStackProvider} from './Providers/StackProvider';
import AppRouterProvider from './router';
import {ModalsProvider} from '@mantine/modals';

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
