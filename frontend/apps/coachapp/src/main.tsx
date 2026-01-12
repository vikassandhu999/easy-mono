import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Provider} from 'react-redux';

import App from './app/App.tsx';
import initializePWA from './app/pwa.tsx';
import {store} from './store';
import {logger} from './utils/logger';

document.addEventListener('DOMContentLoaded', initializePWA);

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
      <App />
    </Provider>
  </StrictMode>,
);
