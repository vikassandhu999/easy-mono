import {createBrowserRouter, RouterProvider} from 'react-router';

import {PrivateRoute} from './utils';
import ProtectedRouteLayout from './utils/ProtectedRouteLayout';
import SignInCodePage from './views/auth/SignInCodePage';
import SignInPage from './views/auth/SignInPage';
import ChatsListPage from './views/chats/ChatsListPage';
import ChatViewPage from './views/chats/ChatView/ChatViewPage';
import ClientDetailPage from './views/clients/DetailPage/DetailPage';
import ClientsListPage from './views/clients/ListPage/ListPage';
import HomePage from './views/dashboard/HomePage';
import LibraryPage from './views/library/LibraryPage';
import BusinessInfoStepPage from './views/onboarding/BusinessInfoStepPage';
import CoachInfoStepPage from './views/onboarding/CoachInfoStepPage';
import SignUpCodeStepPage from './views/onboarding/SignUpCodeStepPage';
import SignUpStepPage from './views/onboarding/SignUpStepPage';
import PlansListPage from './views/plans/ListPage/ListPage';

const router = createBrowserRouter([
    {
        element: <SignInPage />,
        path: '/signin',
    },
    {
        element: <SignInCodePage />,
        path: '/signin/code',
    },
    {
        element: <SignUpStepPage />,
        path: '/signup',
    },

    // onboarding Routes
    {
        element: <SignUpCodeStepPage />,
        path: '/signup/verify',
    },
    {
        element: <BusinessInfoStepPage />,
        path: '/onboarding/business',
    },
    {
        element: <CoachInfoStepPage />,
        path: '/onboarding/profile',
    },

    // Legacy route redirects - keeping for backward compatibility
    {
        element: <SignInPage />,
        path: '/login',
    },
    {
        element: <SignInCodePage />,
        path: '/login/code',
    },
    {
        element: <SignUpStepPage />,
        path: '/ob/signup',
    },
    {
        element: <SignUpCodeStepPage />,
        path: '/ob/signup-otp',
    },
    {
        element: <BusinessInfoStepPage />,
        path: '/ob/business-info',
    },
    {
        element: <CoachInfoStepPage />,
        path: '/ob/coach-info',
    },

    {
        children: [
            {
                children: [
                    {
                        element: <></>,
                        path: '/schedules/:scheduleId/entries/new',
                    },
                    {
                        element: <></>,
                        path: '/schedules/:scheduleId/entries/:entryId/edit',
                    },

                    {
                        element: <ChatViewPage />,
                        path: '/chats/:chatId',
                    },

                    // Routes with layout
                    {
                        element: <HomePage />,
                        path: '/',
                    },
                    {
                        element: <ClientsListPage />,
                        path: '/clients',
                    },
                    {
                        element: <ClientDetailPage />,
                        path: '/clients/:id',
                    },

                    {
                        element: <LibraryPage />,
                        path: '/library',
                    },

                    {
                        element: <ChatsListPage />,
                        path: '/chats',
                    },

                    {
                        element: <PlansListPage />,
                        path: '/plans',
                    },
                ],
                element: <ProtectedRouteLayout />,
            },
        ],
        element: <PrivateRoute />,
    },
]);

export default function AppRouterProvider() {
    return <RouterProvider router={router} />;
}
