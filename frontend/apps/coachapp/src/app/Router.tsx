import {createBrowserRouter, RouterProvider} from 'react-router';

import LoginPage from '@/domains/auth/pages/LoginPage';
import RegisterPage from '@/domains/auth/pages/RegisterPage';
import VerifyLoginPage from '@/domains/auth/pages/VerifyLoginPage';
import VerifyRegisterationPage from '@/domains/auth/pages/VerifyRegisterationPage';
import ClientListPage from '@/domains/client/pages/ClientListPage';
import ClientViewPage from '@/domains/client/pages/ClientViewPage';
import HomePage from '@/domains/dashboard/pages/HomePage';
import {NotFoundPage} from '@/domains/errors/pages/NotFoundPage';
import LibraryListPage from '@/domains/library/pages/LibraryListPage';
import MainProfilePage from '@/domains/profile/pages/MainProfilePage';
import {GuestGaurd, PrivateGaurd} from '@/shared/gaurds';
import ProtectedRouteLayout from '@/utils/ProtectedRouteLayout';

const router = createBrowserRouter([
    {
        path: '*',
        element: <NotFoundPage />,
    },
    {
        element: <GuestGaurd />,
        children: [
            {
                element: <RegisterPage />,
                path: '/register',
            },
            {
                element: <VerifyRegisterationPage />,
                path: '/register/verify',
            },
            {
                element: <LoginPage />,
                path: '/login',
            },
            {
                element: <VerifyLoginPage />,
                path: '/login/verify',
            },
        ],
    },
    {
        element: <PrivateGaurd />, // For routes that require authentication
        children: [
            {
                element: <ProtectedRouteLayout />,
                children: [
                    // Drawers which will open based on params
                    {
                        element: <HomePage />,
                        path: '/',
                    },
                    {
                        element: <ClientListPage />,
                        path: '/clients',
                    },
                    {
                        element: <ClientViewPage />,
                        path: '/clients/:id',
                    },
                    {
                        element: <LibraryListPage />,
                        path: '/library',
                    },

                    {
                        element: <MainProfilePage />,
                        path: '/profile',
                    },
                ],
            },
        ],
    },
]);

export default function AppRouterProvider() {
    return <RouterProvider router={router} />;
}
