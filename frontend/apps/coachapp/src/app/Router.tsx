import {createBrowserRouter, RouterProvider} from 'react-router';

import SignInCodePage from '@/features/auth/SignInCodePage';
import SignInPage from '@/features/auth/SignInPage';
import ClientDetailPage from '@/features/clients/ClientDetailPage';
import ClientsListPage from '@/features/clients/ClientListPage';
import HomePage from '@/features/home/HomePage';
import PlanEditor from '@/shared/PlanEditor/PlanEditor';
import PlanEditorDrawers from '@/shared/PlanEditor/PlanEditorDrawers';
import PlansListPage from '@/views/plans/PlanListPage';
import PlanListPageDrawers from '@/views/plans/PlanListPageDrawers';

import BusinessInfoStepPage from '../features/onboarding/pages/BusinessInfoStepPage';
import CoachInfoStepPage from '../features/onboarding/pages/CoachInfoStepPage';
import SignUpCodeStepPage from '../features/onboarding/pages/SignUpCodeStepPage';
import SignUpStepPage from '../features/onboarding/pages/SignUpStepPage';
import PlanBuilder from '../shared/PlanBuilder/PlanBuilder';
import {PrivateRoute} from '../utils';
import ProtectedRouteLayout from '../utils/ProtectedRouteLayout';
import ChatsListPage from '../views/chats/ChatsListPage';
import ChatViewPage from '../views/chats/ChatView/ChatViewPage';
import LibraryPage from '../views/library/LibraryPage';
import ProfilePage from '../views/profile/ProfilePage';

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
                        children: [
                            {
                                index: true,
                                element: <PlanListPageDrawers />,
                            },
                        ],
                    },

                    {
                        element: <PlanEditor />,
                        path: '/plans/:planId/editor',
                        children: [
                            {
                                index: true,
                                element: <PlanEditorDrawers />,
                            },
                        ],
                    },
                    {
                        element: <ProfilePage />,
                        path: '/profile',
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
