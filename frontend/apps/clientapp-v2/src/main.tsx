import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Provider} from 'react-redux';
import {BrowserRouter} from 'react-router-dom';

import './index.css';
import App from './App';
import {registerPWA} from './pwa';
import {store} from './store';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);

// Register PWA service worker (web only — skipped on native Capacitor)
registerPWA();
