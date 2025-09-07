import {createBrowserRouter, LoaderFunctionArgs, redirect, RouterProvider} from 'react-router';

import ProtectedRouteLayout from './Utils/ProtectedRouteLayout';

import HomePage from './Views/Dashboard/HomePage';
import ProgramListPage from './Views/Programs/ListPage/ListPage';
import ProgramDetailPage from './Views/Programs/DetailPage/DetailPage';
import SignInPage from './Views/Auth/SignInPage';
import SignInCodePage from './Views/Auth/SignInCodePage';
import ContentListPage from './Views/Contents/ListPage/ListPage';
import ContentCreatePage from './Views/Contents/ContentCreatePage';
import ContentEditPage from './Views/Contents/ContentEditPage';
import ContentDetailPage from './Views/Contents/DetailPage/DetailPage';
import ChatViewPage from './Views/Chats/ChatView/ChatViewPage';
import ChatsListPage from './Views/Chats/ChatsListPage';
import {ProgramsAPI} from '@/Api/Programs';

// Onboarding components
import SignUpStepPage from './Views/Onboarding/SignUpStepPage';
import SignUpCodeStepPage from './Views/Onboarding/SignUpCodeStepPage';
import BusinessInfoStepPage from './Views/Onboarding/BusinessInfoStepPage';
import CoachInfoStepPage from './Views/Onboarding/CoachInfoStepPage';
import LibraryPage from './Views/Library/LibraryPage';
import {PrivateRoute} from './Utils';
import PlansListPage from './Views/Plans/ListPage/ListPage';
import ClientsListPage from './Views/Clients/ListPage/ListPage';
import DetailClientPage from './Views/Clients/DetailClientPage/DetailClientPage';

// Data loaders
export async function programDetailLoader({params}: LoaderFunctionArgs) {
    const id = params.id as string | undefined;
    if (!id) return redirect('/programs');

    try {
        const result = await ProgramsAPI.getProgram(id);
        if (result.isError) {
            throw new Response(result.error?.message || 'Failed to load program', {
                status: 404,
                statusText: 'Program Not Found',
            });
        }
        return result.getValue();
    } catch (error) {
        throw new Response('Network error loading program', {
            status: 500,
            statusText: 'Server Error',
        });
    }
}

const router = createBrowserRouter([
    // Auth Routes - Consistent with client app
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
                        path: '/content/create',
                        element: <ContentCreatePage />,
                    },
                    {
                        path: '/content/:id/edit',
                        element: <ContentEditPage />,
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
                        path: '/programs',
                        element: <ProgramListPage />,
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
                        path: '/programs/:id',
                        element: <ProgramDetailPage />,
                        loader: programDetailLoader,
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

const AppRouterProvider = () => {
    return (
        <>
            <RouterProvider router={router} />
        </>
    );
};

export default AppRouterProvider;
