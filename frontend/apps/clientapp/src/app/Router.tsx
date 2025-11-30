import {createBrowserRouter, RouterProvider} from 'react-router';

import AcceptInvitationPage from '@/domains/auth/pages/AcceptInvitationPage';
import PublicJoinPage from '@/domains/auth/pages/PublicJoinPage';
import SignInCodePage from '@/domains/auth/pages/SignInCodePage';
import SignInPage from '@/domains/auth/pages/SignInPage';
import ProtectedRouteLayout from '@/utils/ProtectedRouteLayout';
import DashboardPage from '@/views/Dashboard/DashboardPage';

const router = createBrowserRouter([
    // Public auth routes
    {
        element: <SignInPage />,
        path: '/signin',
    },
    {
        element: <SignInCodePage />,
        path: '/signin/code',
    },
    {
        element: <PublicJoinPage />,
        path: '/join/:code',
    },
    {
        element: <AcceptInvitationPage />,
        path: '/invite/:token',
    },
    // Protected routes
    {
        element: <ProtectedRouteLayout />,
        children: [
            {
                element: <DashboardPage />,
                path: '/',
            },
        ],
    },
]);

const AppRouterProvider = () => {
    return <RouterProvider router={router} />;
};

export default AppRouterProvider;
