import {createBrowserRouter, RouterProvider} from 'react-router';

import ProtectedRouteLayout from '@/utils/ProtectedRouteLayout';
import SignInCodePage from '@/views/auth/SignInCodePage';
import SignInPage from '@/views/auth/SignInPage';
import ChatsListPage from '@/views/chats/ChatsListPage';
import ChatViewPage from '@/views/chats/ChatView/ChatViewPage';
import DetailClientPage from '@/views/clients/DetailClientPage/DetailClientPage';
import ClientsListPage from '@/views/clients/ListPage/ListPage';
import ContentDetailPage from '@/views/contents/DetailPage/DetailPage';
import ContentListPage from '@/views/contents/ListPage/ListPage';
import HomePage from '@/views/dashboard/HomePage';
import LibraryPage from '@/views/library/LibraryPage';
import BusinessInfoStepPage from '@/views/onboarding/BusinessInfoStepPage';
import CoachInfoStepPage from '@/views/onboarding/CoachInfoStepPage';
import SignUpCodeStepPage from '@/views/onboarding/SignUpCodeStepPage';
// onboarding components
import SignUpStepPage from '@/views/onboarding/SignUpStepPage';
import PlansListPage from '@/views/plans/ListPage/ListPage';

import {PrivateRoute} from './utils';

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
                        element: <ContentListPage />,
                        path: '/contents/:id',
                    },
                    {
                        element: <ContentDetailPage />,
                        path: '/content/:id',
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
                        element: <DetailClientPage />,
                        path: '/clients/:id',
                    },
                    {
                        element: <ContentListPage />,
                        path: '/contents',
                    },
                    {
                        element: <LibraryPage />,
                        path: '/library',
                    },
                    {
                        element: <ContentListPage />,
                        path: '/content',
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
