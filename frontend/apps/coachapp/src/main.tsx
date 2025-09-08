import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

import App from './App.tsx';
import './index.css';
import initializePWA from './pwa.tsx';

// DOM Content Loaded handler
document.addEventListener('DOMContentLoaded', initializePWA);

// Error boundary for React errors
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// Initialize React app
const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('Root element not found');
}

const root = createRoot(rootElement);

root.render(
    <StrictMode>
        <App />
    </StrictMode>,
);
