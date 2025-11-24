import {MantineProvider} from '@mantine/core';
import {Notifications} from '@mantine/notifications';

import {theme} from '../theme';
import AppRouterProvider from './Router';

function App() {
    return (
        <MantineProvider theme={theme}>
            <Notifications position={'top-center'} />
            <AppRouterProvider />
        </MantineProvider>
    );
}

export default App;
