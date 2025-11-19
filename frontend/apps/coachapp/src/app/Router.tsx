import {createBrowserRouter, RouterProvider} from 'react-router';

import LoginPage from '@/domains/auth/pages/LoginPage';
import RegisterPage from '@/domains/auth/pages/RegisterPage';
import VerifyLoginPage from '@/domains/auth/pages/VerifyLoginPage';
import VerifyRegisterationPage from '@/domains/auth/pages/VerifyRegisterationPage';
import HomePage from '@/domains/dashboard/pages/HomePage';
import {NotFoundPage} from '@/domains/errors/pages/NotFoundPage';
import LibaryListPageDrawers from '@/domains/library/drawers/LibraryListPageDrawers';
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
        element: <GuestGaurd />, // For routes that require being logged out
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
                    // {
                    //     element: <ChatViewPage />,
                    //     path: '/chats/:chatId',
                    // },

                    // Routes with layout
                    {
                        element: <HomePage />,
                        path: '/',
                    },
                    {
                        element: <MainProfilePage />,
                        path: '/profile',
                    },
                    // {
                    //     element: <ClientsListPage />,
                    //     path: '/clients',
                    // },
                    // {
                    //     element: <ClientDetailPage />,
                    //     path: '/clients/:id',
                    // },

                    {
                        element: <LibraryListPage />,
                        path: '/library',
                        children: [{index: true, element: <LibaryListPageDrawers />}],
                    },
                    // {
                    //     element: <PlansListPage />,
                    //     path: '/plans',
                    //     children: [
                    //         {
                    //             index: true,
                    //             element: <PlanListPageDrawers />,
                    //         },
                    //     ],
                    // },

                    // {
                    //     element: <PlanEditor />,
                    //     path: '/plans/:planId/editor',
                    //     children: [
                    //         {
                    //             index: true,
                    //             element: <PlanEditorDrawers />,
                    //         },
                    //     ],
                    // },
                ],
            },
        ],
    },
]);

export default function AppRouterProvider() {
    return <RouterProvider router={router} />;
}
