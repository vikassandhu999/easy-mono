import {createBrowserRouter, RouterProvider} from 'react-router';

import LoginPage from '@/domains/auth/pages/LoginPage';
import RegisterPage from '@/domains/auth/pages/RegisterPage';
import VerificationPage from '@/domains/auth/pages/VerificationPage';
import OnboardBusinessPage from '@/domains/business/OnboardBusinessPage';
import HomePage from '@/domains/dashboard/HomePage';
import CoachProfilePage from '@/domains/profile/pages/CoachProfilePage';
import {PrivateRoute} from '@/utils';
import ProtectedRouteLayout from '@/utils/ProtectedRouteLayout';

const router = createBrowserRouter([
    // Authentication routes
    {
        element: <RegisterPage />,
        path: '/register',
    },
    {
        element: <LoginPage />,
        path: '/login',
    },
    {
        element: <VerificationPage />,
        path: '/verify',
    },
    {
        element: <OnboardBusinessPage />,
        path: '/ob',
    },
    {
        element: <PrivateRoute />,
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
                    // {
                    //     element: <ClientsListPage />,
                    //     path: '/clients',
                    // },
                    // {
                    //     element: <ClientDetailPage />,
                    //     path: '/clients/:id',
                    // },

                    // {
                    //     element: <LibraryPage />,
                    //     path: '/library',
                    // },
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
                    {
                        element: <CoachProfilePage />,
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
