import {createBrowserRouter, RouterProvider} from 'react-router';

import ProtectedRouteLayout from '@/utils/ProtectedRouteLayout';

import HomePage from '@/views/Dashboard/HomePage';
import SignInPage from '@/views/Auth/SignInPage';
import SignInCodePage from '@/views/Auth/SignInCodePage';
import ContentListPage from '@/views/Contents/ListPage/ListPage';
import ContentDetailPage from '@/views/Contents/DetailPage/DetailPage';
import ChatViewPage from '@/views/Chats/ChatView/ChatViewPage';
import ChatsListPage from '@/views/Chats/ChatsListPage';

// Onboarding components
import SignUpStepPage from '@/views/Onboarding/SignUpStepPage';
import SignUpCodeStepPage from '@/views/Onboarding/SignUpCodeStepPage';
import BusinessInfoStepPage from '@/views/Onboarding/BusinessInfoStepPage';
import CoachInfoStepPage from '@/views/Onboarding/CoachInfoStepPage';
import LibraryPage from '@/views/Library/LibraryPage';
import {PrivateRoute} from './utils';
import PlansListPage from '@/views/Plans/ListPage/ListPage';
import ClientsListPage from '@/views/Clients/ListPage/ListPage';
import DetailClientPage from '@/views/Clients/DetailClientPage/DetailClientPage';

const router = createBrowserRouter([
    {
        path: '/signin',
        element: <SignInPage />,
    },
    {
        path: '/signin/code',
        element: <SignInCodePage />,
    },
    {
        path: '/signup',
        element: <SignUpStepPage />,
    },

    // Onboarding Routes
    {
        path: '/signup/verify',
        element: <SignUpCodeStepPage />,
    },
    {
        path: '/onboarding/business',
        element: <BusinessInfoStepPage />,
    },
    {
        path: '/onboarding/profile',
        element: <CoachInfoStepPage />,
    },

    // Legacy route redirects - keeping for backward compatibility
    {
        path: '/login',
        element: <SignInPage />,
    },
    {
        path: '/login/code',
        element: <SignInCodePage />,
    },
    {
        path: '/ob/signup',
        element: <SignUpStepPage />,
    },
    {
        path: '/ob/signup-otp',
        element: <SignUpCodeStepPage />,
    },
    {
        path: '/ob/business-info',
        element: <BusinessInfoStepPage />,
    },
    {
        path: '/ob/coach-info',
        element: <CoachInfoStepPage />,
    },

    {
        element: <PrivateRoute />,
        children: [
            {
                element: <ProtectedRouteLayout />,
                children: [
                    {
                        path: '/schedules/:scheduleId/entries/new',
                        element: <></>,
                    },
                    {
                        path: '/schedules/:scheduleId/entries/:entryId/edit',
                        element: <></>,
                    },
                    {
                        path: '/contents/:id',
                        element: <ContentListPage />,
                    },
                    {
                        path: '/content/:id',
                        element: <ContentDetailPage />,
                    },
                    {
                        path: '/chats/:chatId',
                        element: <ChatViewPage />,
                    },

                    // Routes with layout
                    {
                        path: '/',
                        element: <HomePage />,
                    },
                    {
                        path: '/clients',
                        element: <ClientsListPage />,
                    },
                    {
                        path: '/clients/:id',
                        element: <DetailClientPage />,
                    },
                    {
                        path: '/contents',
                        element: <ContentListPage />,
                    },
                    {
                        path: '/library',
                        element: <LibraryPage />,
                    },
                    {
                        path: '/content',
                        element: <ContentListPage />,
                    },
                    {
                        path: '/chats',
                        element: <ChatsListPage />,
                    },

                    {
                        path: '/plans',
                        element: <PlansListPage />,
                    },
                ],
            },
        ],
    },
]);

export default function AppRouterProvider() {
    return <RouterProvider router={router} />;
}
