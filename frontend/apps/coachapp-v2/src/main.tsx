import '@fontsource-variable/inter/wght.css';
import '@fontsource-variable/space-grotesk/wght.css';

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Provider} from 'react-redux';
import {RouterProvider} from 'react-router-dom';

import {registerPWA} from './pwa';
import {router} from './router';
import {store} from './store';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>,
);

// Register PWA service worker
registerPWA();
