import {Toast} from '@heroui/react';
import {BrowserRouter} from 'react-router';

import AppRoutes from '@/app/router/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <Toast.Provider />
      <AppRoutes />
    </BrowserRouter>
  );
}
