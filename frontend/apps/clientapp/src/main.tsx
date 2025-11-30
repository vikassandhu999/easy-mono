import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';

import App from './app/App.tsx';
import './index.css';
import {persistor, store} from './store';
import {logger} from './utils/logger';

// Error boundary for React errors
window.addEventListener('error', (event) => {
    logger.error('Global error', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', event.reason);
});

// Initialize React app
const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('Root element not found');
}

const root = createRoot(rootElement);

root.render(
    <StrictMode>
        <Provider store={store}>
            <PersistGate
                loading={null}
                persistor={persistor}
            >
                <App />
            </PersistGate>
        </Provider>
    </StrictMode>,
);
